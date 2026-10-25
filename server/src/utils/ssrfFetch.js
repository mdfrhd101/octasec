// SSRF-safe outbound fetch for user-supplied URLs.
//
// Shared guard layer (used by the php2shell checker; the IP ruleset itself
// lives in verifyDomain.js and is reused unchanged):
//   - only http/https, only ports 80/443
//   - the hostname is DNS-resolved and EVERY A/AAAA address must be public
//     (full IPv4 + IPv6 ruleset incl. ::ffff: IPv4-mapped decoding)
//   - the connection is PINNED to the validated addresses via a custom
//     lookup — the socket never re-resolves, so DNS cannot be rebound
//     between the check and the connect (no DNS-TOCTOU)
//   - redirects are handled manually and every hop is re-validated
//   - the response body is read in chunks and hard-capped mid-stream
//   - every request has a socket timeout AND a hard overall deadline
import http from "node:http";
import https from "node:https";
import net from "node:net";
import dns from "node:dns/promises";
import { ipv4IsPublic, ipv6IsPublic } from "./verifyDomain.js";

const NOT_PUBLIC = "That address is not a public host — the checker only tests public websites you own.";

function urlError(status, message) {
  return Object.assign(new Error(message), { status });
}

function ipIsPublic(ip) {
  return net.isIPv4(ip) ? ipv4IsPublic(ip) : ipv6IsPublic(ip);
}

// Validate a user-supplied URL and resolve it to validated public addresses.
// Throws an Error with .status (400/422) on any rejection.
export async function resolvePublicTarget(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    throw urlError(400, "Invalid URL");
  }
  if (!["http:", "https:"].includes(u.protocol))
    throw urlError(400, "Only http/https URLs");
  const port = u.port ? Number(u.port) : (u.protocol === "https:" ? 443 : 80);
  if (port !== 80 && port !== 443)
    throw urlError(400, "Only standard ports (80/443)");

  // WHATWG URL keeps brackets on IPv6 literals ("[::1]") — strip them.
  const hostname = u.hostname.replace(/^\[(.*)\]$/, "$1");
  let addresses;
  if (net.isIP(hostname)) {
    if (!ipIsPublic(hostname)) throw urlError(422, NOT_PUBLIC);
    addresses = [{ address: hostname, family: net.isIPv6(hostname) ? 6 : 4 }];
  } else {
    const [v4, v6] = await Promise.all([
      dns.resolve4(hostname).catch(() => []),
      dns.resolve6(hostname).catch(() => []),
    ]);
    addresses = [
      ...v4.map((a) => ({ address: a, family: 4 })),
      ...v6.map((a) => ({ address: a, family: 6 })),
    ];
    // Direct DNS and the libc/system resolver can fail independently (notably
    // inside Docker). Fall back before declaring that a valid host is absent.
    if (!addresses.length) {
      addresses = await dns.lookup(hostname, { all: true }).catch(() => []);
    }
    if (!addresses.length) throw urlError(422, "Host does not resolve right now — check the spelling or try again");
    // EVERY address must be public — a single private record sinks the target.
    for (const a of addresses) if (!ipIsPublic(a.address)) throw urlError(422, NOT_PUBLIC);
  }
  return { u, hostname, port, addresses };
}

// One request, pinned to the pre-validated addresses, body hard-capped.
// Rejects on any network/timeout error; resolves { status, rawHeaders, body }.
function pinnedRequest(target, { method = "GET", headers = {}, body = null, maxBytes, timeoutMs, deadlineMs }) {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const fail = (e) => { if (settled) return; settled = true; clearTimeout(deadline); rejectPromise(e); };
    const ok = (v) => { if (settled) return; settled = true; clearTimeout(deadline); resolvePromise(v); };
    const { u, hostname, port, addresses } = target;
    const mod = u.protocol === "https:" ? https : http;
    const deadline = setTimeout(() => { req.destroy(); fail(new Error("request deadline exceeded")); }, deadlineMs);
    const req = mod.request(
      {
        host: hostname,
        port,
        servername: hostname,
        path: u.pathname + u.search,
        method,
        headers: { Host: u.host, ...headers },
        // PIN: answer name resolution with ONLY the validated addresses, so the
        // socket can never connect to a re-resolved (possibly private) address.
        lookup: (h, o, cb) =>
          o && o.all ? cb(null, addresses) : cb(null, addresses[0].address, addresses[0].family),
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode || 0;
        const rawHeaders = res.rawHeaders.slice();
        let bytes = 0;
        const chunks = [];
        res.on("data", (c) => {
          bytes += c.length;
          if (bytes > maxBytes) {
            // hard cap: stop reading, keep what we have (enough for markers)
            req.destroy();
            ok({ status, rawHeaders, body: Buffer.concat(chunks).toString("utf8") });
          } else {
            chunks.push(c);
          }
        });
        res.on("end", () => ok({ status, rawHeaders, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("aborted", () => fail(new Error("response aborted")));
        res.on("close", () => { if (!res.complete) fail(new Error("connection closed early")); });
      }
    );
    req.on("error", fail);
    req.on("timeout", () => { req.destroy(); fail(new Error("socket timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

function toResponse(r) {
  const headers = new Headers();
  for (let i = 0; i + 1 < r.rawHeaders.length; i += 2) headers.append(r.rawHeaders[i], r.rawHeaders[i + 1]);
  return { status: r.status, headers, body: r.body };
}

// Fetch a user-supplied URL with the full SSRF guard: per-hop re-validation,
// pinned connections, bounded redirects, capped body.
export async function guardedPublicFetch(rawUrl, options = {}) {
  const maxRedirects = options.maxRedirects ?? 3;
  const maxBytes = options.maxBytes ?? 512 * 1024;
  const timeoutMs = options.timeoutMs ?? 8000;
  const deadlineMs = options.deadlineMs ?? 9000;
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const target = await resolvePublicTarget(current); // re-validate every hop
    const r = await pinnedRequest(target, { ...options, maxBytes, timeoutMs, deadlineMs });
    if ([301, 302, 303, 307, 308].includes(r.status) && hop < maxRedirects) {
      const loc = toResponse(r).headers.get("location");
      if (!loc) return toResponse(r);
      current = new URL(loc, target.u.toString()).toString();
      continue;
    }
    return toResponse(r);
  }
  throw new Error("too many redirects");
}
