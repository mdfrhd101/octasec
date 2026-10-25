import dns from "node:dns/promises";
import tls from "node:tls";
import { resolvePublicTarget, guardedPublicFetch } from "../utils/ssrfFetch.js";
import { runPhp2ShellCheck } from "./php2shellCheck.js";
import { runTlsVulnerabilityScan } from "./tlsVulnerabilities.js";

const UA = "OctaSec-Website-Safety-Check/1.0 (+https://octasec.ai/website-check)";
const HEADER_NAMES = ["content-security-policy", "x-content-type-options", "referrer-policy", "permissions-policy"];

function finding(category, status, title, evidence, remediation) {
  return { category, status, title: String(title).slice(0, 180), evidence: String(evidence).slice(0, 700), remediation: String(remediation).slice(0, 500) };
}

export function exposureMatches(path, status, body) {
  if (status !== 200) return false;
  const text = String(body || "").slice(0, 2048);
  if (/<!doctype html|<html[\s>]/i.test(text)) return false;
  if (path === "/.git/HEAD") return /^(ref:\s+refs\/heads\/[\w./-]+|[0-9a-f]{40})\s*$/mi.test(text);
  if (path === "/.git/config") return /\[core\]/i.test(text) && /repositoryformatversion\s*=\s*\d+/i.test(text);
  if (path === "/.env") return /^[A-Z_][A-Z0-9_]*=[^\r\n]+/m.test(text);
  return false;
}

export function inspectCertificate(target) {
  return new Promise((resolve) => {
    if (target.u.protocol !== "https:") {
      resolve({ checked: false, error: "Target is not HTTPS" });
      return;
    }
    const address = target.addresses[0];
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(value);
    };
    const socket = tls.connect({
      host: address.address,
      family: address.family,
      port: 443,
      servername: target.hostname,
      rejectUnauthorized: false,
      timeout: 7000,
    });
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate() || {};
      const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
      const daysRemaining = validTo && !Number.isNaN(validTo.getTime())
        ? Math.ceil((validTo.getTime() - Date.now()) / 86400000)
        : null;
      const identityError = cert.subjectaltname ? tls.checkServerIdentity(target.hostname, cert) : new Error("No subjectAltName");
      finish({
        checked: true,
        authorized: socket.authorized,
        authorizationError: socket.authorized ? "" : String(socket.authorizationError || "Trust validation failed"),
        hostnameMatch: !identityError,
        protocol: socket.getProtocol(),
        issuer: cert.issuer?.O || cert.issuer?.CN || "Unknown",
        validFrom: cert.valid_from || null,
        validTo: cert.valid_to || null,
        daysRemaining,
      });
    });
    socket.once("timeout", () => finish({ checked: false, error: "TLS handshake timed out" }));
    socket.once("error", (e) => finish({ checked: false, error: String(e.message || e).slice(0, 250) }));
  });
}

async function fetchBounded(url, maxBytes = 512 * 1024, headers = {}) {
  return guardedPublicFetch(url, {
    maxBytes,
    timeoutMs: 7000,
    deadlineMs: 8000,
    maxRedirects: 3,
    headers: { "User-Agent": UA, Accept: "text/html, text/plain, application/json;q=0.8", ...headers },
  });
}

function analyzeHomepage(findings, response, usingHttps) {
  const headers = response.headers;
  findings.push(finding("Transport", usingHttps ? "good" : "high", usingHttps ? "HTTPS is reachable" : "HTTPS could not be established", `Homepage returned HTTP ${response.status}${usingHttps ? " over HTTPS" : " over plain HTTP"}.`, usingHttps ? "Keep HTTPS enabled and renew certificates before expiry." : "Install a valid certificate and redirect HTTP to HTTPS."));
  const missing = HEADER_NAMES.filter((h) => !headers.get(h));
  if (!headers.get("content-security-policy") && !headers.get("x-frame-options")) missing.push("x-frame-options or CSP frame-ancestors");
  if (usingHttps && !headers.get("strict-transport-security")) missing.push("strict-transport-security");
  findings.push(finding("Headers", missing.length ? "warning" : "good", missing.length ? "Security headers need attention" : "Baseline security headers are present", missing.length ? `Missing: ${missing.join(", ")}.` : "CSP, anti-framing, nosniff, referrer, permissions and HSTS checks passed.", "Add a tested Content-Security-Policy, frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and HSTS."));
  const cookies = headers.getSetCookie ? headers.getSetCookie() : [];
  if (!cookies.length) {
    findings.push(finding("Cookies", "info", "No cookies observed", "The homepage response did not set cookies.", "Re-run authenticated checks during an authorized assessment."));
  } else {
    const weak = cookies.filter((c) => !/;\s*secure\b/i.test(c) || !/;\s*httponly\b/i.test(c) || !/;\s*samesite=/i.test(c)).map((c) => c.split("=", 1)[0].trim()).slice(0, 6);
    findings.push(finding("Cookies", weak.length ? "warning" : "good", weak.length ? "Cookie flags need attention" : "Cookie flags look sound", weak.length ? `Missing Secure, HttpOnly or SameSite on: ${weak.join(", ")}.` : `${cookies.length} cookie(s) had Secure, HttpOnly and SameSite.`, "Set Secure, HttpOnly and an appropriate SameSite value on session cookies."));
  }
}

function analyzeCms(findings, response) {
  const body = response.body.slice(0, 300000);
  const generator = [...body.matchAll(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]).join(" ");
  let name = null;
  if (/wordpress|wp-content|wp-includes/i.test(`${generator} ${body}`)) name = "WordPress";
  else if (/drupal/i.test(`${generator} ${body}`) || response.headers.get("x-drupal-cache")) name = "Drupal";
  else if (/joomla/i.test(`${generator} ${body}`)) name = "Joomla";
  if (!name) {
    findings.push(finding("CMS", "info", "No common CMS fingerprint observed", "WordPress, Drupal and Joomla signatures were not found on the homepage.", "Use an authenticated inventory for reliable application identification."));
    return;
  }
  const version = (generator.match(new RegExp(`${name}\\s*([0-9]+(?:\\.[0-9]+){1,3})`, "i")) || [])[1] || null;
  findings.push(finding("CMS", "info", `${name} detected`, version ? `Public generator metadata discloses version ${version}.` : "The application was fingerprinted, but its version is not publicly disclosed.", version ? "Confirm the version against your inventory and current vendor security releases." : "Keep the application and extensions updated; avoid unnecessary version disclosure."));
}

async function analyzeDns(findings, hostname) {
  const [a, aaaa, mx, txt, dmarc] = await Promise.all([
    dns.resolve4(hostname).catch(() => []),
    dns.resolve6(hostname).catch(() => []),
    dns.resolveMx(hostname).catch(() => []),
    dns.resolveTxt(hostname).catch(() => []),
    dns.resolveTxt(`_dmarc.${hostname}`).catch(() => []),
  ]);
  const flatTxt = txt.flat();
  const spf = flatTxt.some((v) => /^v=spf1\b/i.test(v));
  const hasDmarc = dmarc.flat().some((v) => /^v=DMARC1\b/i.test(v));
  findings.push(finding("DNS & email", "info", "Public DNS resolved", `${a.length} A, ${aaaa.length} AAAA and ${mx.length} MX record(s) observed.`, "Review public records as part of your external attack-surface inventory."));
  if (!mx.length) {
    findings.push(finding("DNS & email", "info", "No MX-advertised mail service", "SPF/DMARC was not scored because the domain does not advertise MX records.", "If this domain sends email, publish appropriate SPF and DMARC records anyway."));
    return;
  }
  findings.push(finding("DNS & email", spf ? "good" : "warning", spf ? "SPF is published" : "SPF is missing", spf ? "An SPF TXT record was found." : "No SPF TXT record was found despite MX being configured.", "Publish a restrictive SPF policy aligned with your real senders."));
  findings.push(finding("DNS & email", hasDmarc ? "good" : "warning", hasDmarc ? "DMARC is published" : "DMARC is missing", hasDmarc ? "A DMARC record was found at _dmarc." : "No DMARC policy was found at _dmarc.", "Publish DMARC with reporting, then move gradually toward quarantine/reject."));
}

function analyzeTls(findings, tlsResult) {
  if (!tlsResult.checked) {
    findings.push(finding("TLS", "warning", "TLS certificate could not be inspected", tlsResult.error || "TLS handshake failed.", "Verify that port 443 presents a complete, valid certificate chain."));
    return;
  }
  const days = tlsResult.daysRemaining;
  if (days === null) findings.push(finding("TLS", "warning", "Certificate expiry unavailable", "The server did not provide a usable certificate expiry date.", "Inspect the certificate chain manually."));
  else {
    const status = days < 0 ? "critical" : days <= 14 ? "high" : days <= 30 ? "warning" : "good";
    const title = days < 0 ? "Certificate has expired" : days <= 30 ? "Certificate expiry is approaching" : "Certificate validity window looks healthy";
    findings.push(finding("TLS", status, title, `${days} day(s) remaining; valid until ${tlsResult.validTo}.`, days <= 30 ? "Renew and deploy the certificate immediately; enable automated expiry alerts." : "Keep automated renewal and expiry alerts enabled."));
  }
  findings.push(finding("TLS", tlsResult.authorized ? "good" : "high", tlsResult.authorized ? "Certificate chain is trusted" : "Certificate trust validation failed", tlsResult.authorized ? `Issuer: ${tlsResult.issuer}.` : tlsResult.authorizationError, "Deploy a complete certificate chain from a trusted public CA."));
  findings.push(finding("TLS", tlsResult.hostnameMatch ? "good" : "high", tlsResult.hostnameMatch ? "Certificate matches the hostname" : "Certificate hostname mismatch", tlsResult.hostnameMatch ? "The certificate covers the requested hostname." : "The certificate subjectAltName does not cover this hostname.", "Issue a certificate containing the correct DNS subjectAltName."));
  const modern = ["TLSv1.2", "TLSv1.3"].includes(tlsResult.protocol);
  findings.push(finding("TLS", modern ? "good" : "high", modern ? "Modern TLS protocol negotiated" : "Legacy TLS protocol negotiated", `${tlsResult.protocol || "Unknown protocol"} was negotiated.`, "Prefer TLS 1.3 and disable TLS 1.0/1.1 and weak cipher suites."));
}

export function corsFinding(headers) {
  const values = String(headers.get("access-control-allow-origin") || "").split(",").map((v) => v.trim()).filter(Boolean);
  const credentials = String(headers.get("access-control-allow-credentials") || "").toLowerCase() === "true";
  const origin = "https://checker.octasec.ai";
  if (!values.length) return finding("CORS", "good", "No cross-origin read permission observed", "No Access-Control-Allow-Origin header was returned to the probe origin.", "Keep cross-origin access restricted to intended public API origins.");
  if (credentials && (values.includes(origin) || values.includes("null"))) return finding("CORS", "high", "Credentialed CORS access granted to the probe origin", `The server returned Access-Control-Allow-Origin: ${values.join(", ")} with credentials enabled.`, "Remove the reflected/null origin or use a strict allowlist of trusted origins; never enable credentials for untrusted origins.");
  if (values.includes("*") && credentials) return finding("CORS", "warning", "Wildcard CORS is combined with credentials", "The server returned wildcard origin with Access-Control-Allow-Credentials: true. Browsers reject this combination, but it is still an unsafe configuration.", "Use an explicit origin allowlist and disable credentials unless required.");
  if (values.includes("*")) return finding("CORS", "info", "Public wildcard CORS is enabled", "Wildcard origin is enabled without credential support; this may be intentional for public data.", "Confirm every response is intended to be publicly readable cross-origin.");
  return finding("CORS", "good", "Probe origin was not granted CORS access", `Returned origin: ${values.join(", ")}.`, "Keep the allowlist restricted to trusted origins.");
}

export function php2shellFinding(result) {
  const verdict = result.overall.verdict;
  const status = verdict === "exposed" ? "critical" : verdict === "likely-exposed" ? "high" : verdict === "unknown" ? "warning" : verdict === "not-php" ? "info" : "good";
  const version = result.php.version ? ` PHP ${result.php.version}.` : "";
  return finding("Known vulnerabilities", status, `PHP2Shell: ${verdict.replaceAll("-", " ")}`, `${result.overall.summary}${version} Oracle: ${result.oracle.evidence}`, verdict === "not-php" ? "No action is needed for this stack." : "Apply the vendor-fixed release or our configuration-level hardening, then verify again with the specialist PHP2Shell checker.");
}

export function tlsVulnerabilityFindings(scan) {
  if (!scan.checked) return [finding("Known vulnerabilities", "warning", "TLS vulnerability scan was inconclusive", scan.error || "SSLyze could not complete.", "Re-run the check or use SSLyze/testssl.sh from an authorized assessment host.")];
  const out = [
    finding("Known vulnerabilities", scan.heartbleed === null ? "warning" : scan.heartbleed ? "critical" : "good", scan.heartbleed === null ? "Heartbleed result was inconclusive" : scan.heartbleed ? "Heartbleed vulnerability detected" : "Heartbleed not detected", scan.heartbleed === null ? "SSLyze could not obtain a definitive Heartbleed verdict." : scan.heartbleed ? "SSLyze reported is_vulnerable_to_heartbleed=true. No memory contents were collected." : "SSLyze reported is_vulnerable_to_heartbleed=false.", scan.heartbleed ? "Upgrade OpenSSL immediately, restart affected services, and rotate certificates/keys that may have been exposed." : "Keep OpenSSL and TLS libraries patched."),
    finding("Known vulnerabilities", scan.legacy.length ? "high" : "good", scan.legacy.length ? "Legacy SSL/TLS protocols are enabled" : "No legacy SSL/TLS protocol support observed", scan.legacy.length ? `Accepted: ${scan.legacy.join(", ")}.` : "SSL 3.0, TLS 1.0 and TLS 1.1 were rejected.", "Disable SSL 3.0, TLS 1.0 and TLS 1.1; require TLS 1.2 or 1.3."),
  ];
  if (scan.weakCiphers.length) out.push(finding("Known vulnerabilities", "high", "Weak cipher suites are enabled", `Accepted weak/legacy suites: ${scan.weakCiphers.join(", ")}.`, "Disable NULL, EXPORT, RC4, DES/3DES, anonymous and MD5-based suites."));
  return out;
}

export async function runWebsiteCheck(rawUrl) {
  const initial = await resolvePublicTarget(rawUrl);
  if (initial.u.username || initial.u.password) {
    const e = new Error("Credentials in URLs are not accepted");
    e.status = 400;
    throw e;
  }
  initial.u.search = "";
  initial.u.hash = "";
  const hostname = initial.u.hostname.replace(/^\[(.*)\]$/, "$1");
  const findings = [];
  let response;
  let usedFallback = false;
  let requests = 0;
  try {
    response = await fetchBounded(initial.u.toString());
    requests++;
  } catch (firstError) {
    if (initial.u.protocol !== "https:") throw firstError;
    const fallback = new URL(initial.u.toString());
    fallback.protocol = "http:";
    response = await fetchBounded(fallback.toString());
    requests++;
    usedFallback = true;
  }
  const usingHttps = initial.u.protocol === "https:" && !usedFallback;
  analyzeHomepage(findings, response, usingHttps);
  analyzeCms(findings, response);
  analyzeTls(findings, usingHttps ? await inspectCertificate(initial) : { checked: false, error: "HTTPS connection failed; HTTP fallback was used" });
  findings.push(...tlsVulnerabilityFindings(usingHttps ? await runTlsVulnerabilityScan(initial) : { checked: false, error: "HTTPS connection failed; TLS vulnerability scan not run" }));
  await analyzeDns(findings, hostname);

  const base = new URL(initial.u.toString());
  if (usedFallback) base.protocol = "http:";
  try {
    const cors = await fetchBounded(base.toString(), 64 * 1024, { Origin: "https://checker.octasec.ai" });
    requests++;
    findings.push(corsFinding(cors.headers));
  } catch {
    findings.push(finding("CORS", "warning", "CORS probe failed", "The cross-origin request did not complete.", "Re-run the CORS check during an authorized assessment."));
  }
  try {
    findings.push(php2shellFinding(await runPhp2ShellCheck(base.toString())));
    requests += 2;
  } catch (e) {
    findings.push(finding("Known vulnerabilities", "warning", "PHP2Shell check was inconclusive", String(e.message || e).slice(0, 300), "Use the specialist PHP2Shell checker or a configuration-level assessment."));
  }
  for (const path of ["/.git/HEAD", "/.git/config", "/.env"]) {
    let exposed = false;
    let failed = false;
    let evidence = "No exposure signature observed";
    try {
      const probe = await guardedPublicFetch(new URL(path, base).toString(), {
        maxBytes: 2048, timeoutMs: 6000, deadlineMs: 6500, maxRedirects: 2,
        headers: { "User-Agent": UA, Accept: "text/plain,*/*;q=0.1" },
      });
      requests++;
      exposed = exposureMatches(path, probe.status, probe.body);
      evidence = exposed ? "Public content matched the exposure signature; values were discarded without storage." : `No exposure signature (HTTP ${probe.status}).`;
    } catch {
      failed = true;
      evidence = "Probe failed or response was blocked";
    }
    const status = exposed ? "critical" : failed ? "warning" : "good";
    const title = exposed ? `${path} appears publicly exposed` : failed ? `${path} could not be checked` : `${path} not exposed by this check`;
    findings.push(finding("Public exposure", status, title, evidence, exposed ? "Block public access immediately, remove the artifact from web root, rotate any potentially exposed secrets, and review access logs." : "Keep dotfiles and environment files outside the public web root."));
  }

  try {
    const sec = await guardedPublicFetch(new URL("/.well-known/security.txt", base).toString(), {
      maxBytes: 16384, timeoutMs: 6000, deadlineMs: 6500, maxRedirects: 2,
      headers: { "User-Agent": UA, Accept: "text/plain,*/*;q=0.1" },
    });
    requests++;
    const present = sec.status === 200 && /contact\s*:/i.test(sec.body);
    findings.push(finding("Hygiene", present ? "good" : "warning", present ? "security.txt is published" : "security.txt was not found", present ? "A security contact was found in /.well-known/security.txt." : `No valid security.txt signature (HTTP ${sec.status}).`, "Publish a current security.txt with a monitored disclosure contact."));
  } catch {
    findings.push(finding("Hygiene", "warning", "security.txt could not be checked", "The request failed.", "Publish and verify /.well-known/security.txt."));
  }

  const counts = { critical: 0, high: 0, warning: 0, good: 0, info: 0 };
  for (const f of findings) counts[f.status] = (counts[f.status] || 0) + 1;
  const overall = counts.critical || counts.high
    ? { verdict: "urgent", label: "Immediate attention required", summary: "Confirmed high-impact or time-sensitive issues need remediation now." }
    : counts.warning
      ? { verdict: "hardening", label: "Hardening recommended", summary: "No critical exposure was confirmed, but the security baseline can be improved." }
      : { verdict: "baseline", label: "Good external baseline", summary: "The checked baseline looks sound. This is not a substitute for a full penetration test." };
  return {
    engineVersion: 2,
    target: hostname,
    checkedAt: new Date().toISOString(),
    checkedAtDhaka: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "long" }).format(new Date()),
    requests,
    counts,
    overall,
    findings,
    limitations: "Low-impact external checks only. No authenticated testing, exploitation, port scanning, CMS brute-force, or guarantee that undetected issues are absent.",
  };
}
