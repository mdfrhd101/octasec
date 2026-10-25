import { resolvePublicTarget, guardedPublicFetch } from "../utils/ssrfFetch.js";

const FIX_FLOORS = { "8.2": 35, "8.3": 36, "8.4": 27, "8.5": 12 };
const WARN_MARKERS = [
  "Session ID is too long or contains illegal characters",
  "Failed to read session data",
  "Failed to write session data (",
];
const BODY_CAP = 512 * 1024;

function guardedFetch(u, options = {}) {
  const { headers, ...rest } = options;
  return guardedPublicFetch(u, {
    maxBytes: BODY_CAP,
    timeoutMs: 8000,
    deadlineMs: 9000,
    maxRedirects: 3,
    ...rest,
    headers: { "User-Agent": "OctaSec-PHP2Shell-Checker/1.0 (+https://octasec.ai/php2shell)", ...(headers || {}) },
  });
}

function parseVersion(headers, body) {
  for (const h of ["x-powered-by", "server"]) {
    const m = (headers.get(h) || "").match(/PHP\/(\d+)\.(\d+)\.(\d+)/);
    if (m) return { version: `${m[1]}.${m[2]}.${m[3]}`, source: `${h} header` };
  }
  const m = (body || "").match(/PHP (\d+\.\d+\.\d+)/);
  return m ? { version: m[1], source: "page body" } : { version: null, source: null };
}

function versionVerdict(v) {
  if (!v) return { vulnerable: null, note: "version not disclosed (expose_php off or hardened)" };
  const [maj, min, pat] = v.split(".").map(Number);
  if (maj < 8 || (maj === 8 && min < 2)) return { vulnerable: true, note: "EOL branch — no vendor fix exists" };
  const floor = FIX_FLOORS[`${maj}.${min}`];
  if (floor === undefined) return { vulnerable: null, note: "unknown series" };
  return pat < floor
    ? { vulnerable: true, note: `below fixed release ${maj}.${min}.${floor}` }
    : { vulnerable: false, note: `at/above fixed release ${maj}.${min}.${floor}` };
}

function sapiGuess(serverHeader) {
  const s = serverHeader || "";
  if (/PHP\/\d+\.\d+\.\d+/.test(s)) return { handler: "mod_php (SAPI module)", note: "PHP token inside Server header — highest-exposure topology" };
  if (/nginx|openresty/i.test(s)) return { handler: "php-fpm (proxied)", note: "FPM behind a proxy — harder to exploit, not immune" };
  if (/apache|litespeed/i.test(s)) return { handler: "undetermined (Apache/LiteSpeed)", note: "SAPI hidden — could be either topology" };
  return { handler: "undetermined", note: "no usable Server header" };
}

function cookieSignals(setCookies) {
  const names = setCookies.map((c) => c.split("=", 1)[0].trim());
  return {
    nativeSession: names.includes("PHPSESSID"),
    frameworkSession: names.some((n) => n === "laravel_session" || n === "XSRF-TOKEN" || /_session$/.test(n)),
    cookieNames: names.slice(0, 6),
  };
}

function buildOracleBody() {
  const boundary = "----p2s" + Array.from({ length: 24 }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join("");
  const token = Array.from({ length: 20 }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join("");
  const fname = Array.from({ length: 12 }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join("") + ".txt";
  const CRLF = "\r\n";
  const body =
    `--${boundary}${CRLF}Content-Disposition: form-data; name="PHP_SESSION_UPLOAD_PROGRESS"${CRLF}${CRLF}${token}${CRLF}` +
    `--${boundary}${CRLF}Content-Disposition: form-data; name="f"; filename="${fname}"${CRLF}Content-Type: text/plain${CRLF}${CRLF}1${CRLF}` +
    `--${boundary}--${CRLF}`;
  return { boundary, body };
}

export async function runPhp2ShellCheck(rawUrl) {
  const target = await resolvePublicTarget(rawUrl);
  const pageUrl = target.u.toString();
  let get = null;
  try {
    get = await guardedFetch(pageUrl);
  } catch {
    if (target.u.protocol === "https:") {
      const httpUrl = "http://" + target.u.host + (target.u.pathname === "/" ? "/" : target.u.pathname);
      try { get = await guardedFetch(httpUrl); } catch { /* handled below */ }
    }
    if (!get) {
      const e = new Error("Unreachable — host did not answer HTTP/HTTPS on the standard ports.");
      e.status = 422;
      throw e;
    }
  }
  const bodyHead = get.body.slice(0, 200000);
  const setCookies = get.headers.getSetCookie ? get.headers.getSetCookie() : [];
  const { version, source } = parseVersion(get.headers, bodyHead);
  const vv = versionVerdict(version);
  const sapi = sapiGuess(get.headers.get("server"));
  const cookies = cookieSignals(setCookies);
  const isPhp = !!(version || cookies.nativeSession || /php/i.test(get.headers.get("x-powered-by") || "") || /\.php/i.test(bodyHead));

  const { boundary, body } = buildOracleBody();
  let oracle;
  try {
    const oresp = await guardedFetch(pageUrl, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, Cookie: "PHPSESSID=_" },
      body,
    });
    const text = oresp.body.slice(0, 400000);
    const hits = WARN_MARKERS.filter((m) => text.includes(m));
    if (hits.length === 3) oracle = { verdict: "vulnerable", evidence: "3/3 session-warning markers — pre-patch behavior" };
    else if (hits.length === 2) oracle = { verdict: "patched", evidence: "2/3 markers — the fix removed the third warning path" };
    else oracle = { verdict: "inconclusive", evidence: `${hits.length}/3 markers (HTTP ${oresp.status}) — display_errors likely off or no native session engaged` };
  } catch {
    oracle = { verdict: "inconclusive", evidence: "oracle request failed" };
  }

  let overall, summary;
  if (oracle.verdict === "vulnerable") {
    overall = "exposed";
    summary = "Patch-level signature confirms vulnerable code paths are active.";
  } else if (oracle.verdict === "patched") {
    overall = "patched";
    summary = "Patch-level signature indicates the fix is present.";
  } else if (vv.vulnerable === true) {
    overall = "likely-exposed";
    summary = `PHP ${version} is in the vulnerable range, but the patch oracle could not confirm. Treat as exposed.`;
  } else if (vv.vulnerable === false) {
    overall = "likely-patched";
    summary = `PHP ${version} is at/above the fixed release.`;
  } else if (!isPhp) {
    overall = "not-php";
    summary = "No PHP indicators found — PHP2Shell does not apply to this stack.";
  } else {
    overall = "unknown";
    summary = "PHP is present but hardened against passive checks; only configuration-level assessment can settle it.";
  }

  return {
    ok: true,
    target: target.u.hostname,
    checkedAt: new Date().toISOString(),
    requests: "2 benign requests (1 GET + 1 × 300-byte POST) — non-destructive by design",
    php: { detected: isPhp, version, versionSource: source, versionVerdict: vv, sapi, cookies },
    oracle,
    overall: { verdict: overall, summary },
    fixedReleases: "8.2.35 / 8.3.36 / 8.4.27 / 8.5.12 — PHP ≤ 8.1 has no official fix",
    cta: ["exposed", "likely-exposed", "unknown"].includes(overall) ? "Our emergency hardening service closes this — fixed price, verified before/after." : null,
  };
}
