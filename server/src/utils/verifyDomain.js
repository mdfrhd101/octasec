// SSRF-hardened domain-ownership verification.
//
// The server fetches a token file from a user-claimed domain and checks it
// contains the expected string (like Google Search Console / ACME). Because the
// target is user-controlled, every outbound request is locked down:
//   - raw IP literals are rejected (domains only)
//   - the hostname is DNS-resolved and EVERY address must be a public IPv4
//   - the connection is PINNED to the validated IP (no re-resolution → no DNS
//     rebinding)
//   - redirects are handled manually and each hop is re-validated (max 2)
//   - only ports 80/443 (default) are ever used
//   - the response body is hard-capped (never buffer an unbounded body)
//   - redirects may only stay on the claimed domain (or its subdomains)
//   - every request has a HARD overall deadline (slow-drip servers can't hold it)
//   - the file must be EXACTLY the token, served as text/plain
//   - public suffixes (s3.amazonaws.com, herokuapp.com …) can never be claimed
//   - the caller gets a single generic result (no blind-SSRF status oracle)
import https from "node:https";
import { parse as parseDomain } from "tldts";
import http from "node:http";
import net from "node:net";
import dns from "node:dns/promises";

const EXPECT_PREFIX = "octasec-site-verification=";
const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 6000;        // socket idle
const DEADLINE_MS = 8000;       // whole request, no matter what
const MAX_HOPS = 2;

// Dotted hostname with an alphabetic (or IDN xn--) TLD; <= 253 chars.
const HOSTNAME_RE =
  /^(?=.{1,253}$)((?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/;

// A name a customer can own: has a registrable domain and is not itself a
// public suffix (ICANN or private, e.g. github.io / s3.amazonaws.com).
export function isClaimableDomain(name) {
  const r = parseDomain(name, { allowPrivateDomains: true });
  return !!r.domain && !!r.publicSuffix && r.publicSuffix !== name && r.isIp === false;
}

// IPv6 addresses that must never be scanned/fetched
export function ipv6IsPublic(ip) {
  const a = ip.toLowerCase();
  if (a === "::" || a === "::1") return false;
  if (/^(fc|fd)/.test(a)) return false;                 // fc00::/7 unique-local
  if (/^fe[89ab]/.test(a)) return false;                // fe80::/10 link-local
  if (/^ff/.test(a)) return false;                      // multicast
  if (/^2001:0?db8:/.test(a)) return false;             // documentation
  if (/^64:ff9b:/.test(a)) return false;                // NAT64 → could embed private v4
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a); // IPv4-mapped
  if (mapped) return ipv4IsPublic(mapped[1]);
  // WHATWG URL normalizes mapped literals to hex ("::ffff:a9fe:a9fe") — decode too
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(a);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16), lo = parseInt(mappedHex[2], 16);
    return ipv4IsPublic(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return true;
}

function ipv4IsPublic(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return false;            // "this", private, loopback
  if (a === 169 && b === 254) return false;                       // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;              // private
  if (a === 192 && b === 168) return false;                       // private
  if (a === 100 && b >= 64 && b <= 127) return false;             // CGNAT
  if (a === 192 && b === 0) return false;                         // 192.0.0.0/24, 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return false;          // benchmarking
  if (a === 198 && b === 51) return false;                        // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0) return false;                         // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return false;                                     // multicast + reserved + broadcast
  return true;
}

// Resolve a hostname to public IPv4 addresses, or throw with a reason.
async function resolvePublic(hostname) {
  if (net.isIP(hostname) !== 0) throw new Error("ip-literal-not-allowed");
  if (!HOSTNAME_RE.test(hostname)) throw new Error("invalid-hostname");
  if (!isClaimableDomain(hostname)) throw new Error("public-suffix");
  let addrs;
  try {
    addrs = await dns.resolve4(hostname);
  } catch {
    throw new Error("dns-failed");
  }
  if (!addrs || !addrs.length) throw new Error("no-address");
  for (const ip of addrs) if (!ipv4IsPublic(ip)) throw new Error("non-public-address");
  return addrs;
}

// One request, pinned to `ip`, body hard-capped. Resolves to a small result object.
function requestPinned(proto, hostname, ip, pathName) {
  return new Promise((resolveOnce) => {
    let settled = false;
    const resolve = (v) => { if (settled) return; settled = true; clearTimeout(deadline); resolveOnce(v); };
    const mod = proto === "https" ? https : http;
    const deadline = setTimeout(() => { req.destroy(); resolve({ error: true }); }, DEADLINE_MS);
    const req = mod.request(
      {
        host: hostname,
        servername: hostname,
        path: pathName,
        method: "GET",
        headers: { "User-Agent": "OctaSec-Verifier/1.0", Accept: "text/plain", Host: hostname },
        // PIN: always connect to the pre-validated address, ignore re-resolution.
        // Node >= 20 may ask for all addresses (autoSelectFamily) — answer both shapes.
        family: 4,
        lookup: (h, o, cb) => (o && o.all ? cb(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4)),
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location || null;
        const type = String(res.headers["content-type"] || "").toLowerCase();
        let bytes = 0;
        const chunks = [];
        res.on("data", (c) => {
          bytes += c.length;
          if (bytes > MAX_BYTES) {
            req.destroy();
            resolve({ status, location, type, body: Buffer.concat(chunks).toString("utf8") });
          } else {
            chunks.push(c);
          }
        });
        res.on("end", () => resolve({ status, location, type, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("aborted", () => resolve({ error: true }));
        res.on("close", () => { if (!res.complete) resolve({ error: true }); });
      }
    );
    req.on("error", () => resolve({ error: true }));
    req.on("timeout", () => { req.destroy(); resolve({ error: true }); });
    req.end();
  });
}

// the file must contain exactly the token line, served as plain text
function matches(r, token) {
  if (!/^text\/plain(;|$)/.test(r.type || "")) return false;
  return (r.body || "").trim() === EXPECT_PREFIX + token;
}

async function attempt(startProto, startHost, pathName, token) {
  let proto = startProto, hostname = startHost, path = pathName;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    let ips;
    try {
      ips = await resolvePublic(hostname);
    } catch {
      return { ok: false };
    }
    const r = await requestPinned(proto, hostname, ips[0], path);
    if (r.error) return { ok: false };
    if (r.status >= 200 && r.status < 300) return { ok: matches(r, token) };
    if (r.status >= 300 && r.status < 400 && r.location && hop < MAX_HOPS) {
      let loc;
      try { loc = new URL(r.location, `${proto}://${hostname}${path}`); } catch { return { ok: false }; }
      if (loc.protocol !== "https:" && loc.protocol !== "http:") return { ok: false };
      if (loc.port && loc.port !== "80" && loc.port !== "443") return { ok: false }; // no odd ports
      const next = loc.hostname.toLowerCase();
      // a redirect may not leave the claimed domain (no hop to a platform host an attacker controls)
      if (next !== startHost && !next.endsWith("." + startHost)) return { ok: false };
      proto = loc.protocol.slice(0, -1);
      hostname = next;
      path = loc.pathname + loc.search;
      continue; // re-validate next hop
    }
    return { ok: false };
  }
  return { ok: false };
}

export async function verifyDomainOwnership(domainName, verifyFile, token) {
  const path = "/" + encodeURIComponent(verifyFile);
  // Pre-validate once so an obviously bad/internal target never even connects.
  try {
    await resolvePublic(domainName);
  } catch {
    return { verified: false, reason: "unverified" };
  }
  for (const proto of ["https", "http"]) {
    const r = await attempt(proto, domainName, path, token);
    if (r.ok) return { verified: true };
  }
  // Single generic reason — no status/timeout oracle leaked to the client.
  return { verified: false, reason: "unverified" };
}

export { EXPECT_PREFIX, ipv4IsPublic, resolvePublic };

/** Resolve a scan target (A + AAAA); "" if every address is public, else a reason. Unresolvable names pass (nothing to reach). */
export async function targetProblem(host) {
  const [v4, v6] = await Promise.all([dns.resolve4(host).catch(() => []), dns.resolve6(host).catch(() => [])]);
  for (const ip of v4) if (!ipv4IsPublic(ip)) return `${host} resolves to a non-public address (${ip})`;
  for (const ip of v6) if (!ipv6IsPublic(ip)) return `${host} resolves to a non-public address (${ip})`;
  return "";
}
