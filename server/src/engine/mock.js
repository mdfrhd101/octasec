// MOCK engine — placeholder data so the portal works end to end without the
// real scanner. Replace by setting ENGINE_DRIVER=http (see docs/ENGINE_INTEGRATION.md).
import crypto from "node:crypto";

const TECH = [
  ["WordPress", "PHP", "cPanel"], ["Node.js", "Express", "nginx"],
  ["React", "Vite", "Cloudflare"], ["Laravel", "MySQL", "Apache"],
  ["Next.js", "Vercel"], ["Django", "PostgreSQL"],
];
const SUBS = ["www", "api", "mail", "staging", "admin", "cdn", "shop", "blog", "dev", "portal"];
const FINDINGS = [
  { title: "Missing security headers", severity: "medium", cvss: 4.3, owasp: "A05:2021 Security Misconfiguration", cwe: "CWE-693", detail: "Served without HSTS / CSP.", fix: "Add HSTS, CSP and X-Content-Type-Options at the edge." },
  { title: "Outdated component with known CVEs", severity: "high", cvss: 7.5, owasp: "A06:2021 Vulnerable & Outdated Components", cwe: "CWE-1104", detail: "A public component advertises a version with published advisories.", fix: "Upgrade to a supported release and re-test." },
  { title: "Exposed non-production surface", severity: "high", cvss: 8.2, owasp: "A01:2021 Broken Access Control", cwe: "CWE-284", detail: "A staging/admin host is reachable publicly.", fix: "Restrict to VPN/allowlist and require auth." },
  { title: "Weak TLS configuration", severity: "medium", cvss: 5.9, owasp: "A02:2021 Cryptographic Failures", cwe: "CWE-326", detail: "Legacy protocol/cipher negotiated.", fix: "Disable legacy protocols; prefer TLS 1.2+." },
  { title: "Authentication bypass on admin route", severity: "critical", cvss: 9.4, owasp: "A07:2021 Identification & Authentication Failures", cwe: "CWE-287", detail: "An admin endpoint is reachable without a valid session under a specific sequence.", fix: "Enforce server-side session checks on every privileged route." },
];
const pick = (a) => a[crypto.randomInt(a.length)];

export const name = "mock";

export async function discoverAssets(domainName) {
  const hosts = SUBS.filter(() => crypto.randomInt(2) === 1).slice(0, 5);
  if (!hosts.length) hosts.push("www", "api");
  return hosts.map((h) => ({ host: `${h}.${domainName}`, tech: pick(TECH).slice() }));
}

// completes instantly with candidate findings
export async function startScan(job) {
  const hosts = job.targets.length ? job.targets : [job.domainName];
  const n = 1 + crypto.randomInt(4);
  return {
    jobId: "mock-" + crypto.randomBytes(8).toString("hex"),
    state: "completed",
    findings: Array.from({ length: n }, () => ({ ...pick(FINDINGS), host: pick(hosts) })),
  };
}

export async function getScan() {
  return { state: "completed", findings: [] };
}
