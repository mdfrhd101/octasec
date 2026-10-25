import mongoose from "mongoose";
import dns from "node:dns/promises";
import { BASE, J, token, chk, done, db } from "./lib.mjs";
import { resolvePublicTarget } from "../src/utils/ssrfFetch.js";
import WebsiteCheck from "../src/models/WebsiteCheck.js";
import { exposureMatches, corsFinding, php2shellFinding, tlsVulnerabilityFindings } from "../src/services/websiteCheck.js";
import { parseSslyzeReport } from "../src/services/tlsVulnerabilities.js";
import { websiteCheckPdf } from "../src/services/websiteCheckPdf.js";
import { dueAlertThreshold } from "../src/services/sslAlerts.js";

const conn = await db();
const ts = Date.now();
const ca = await token("corp@demo.com", "corp12345");
const dash = await token("dash@demo.com", "dash12345");
const oid = (v) => new mongoose.Types.ObjectId(String(v));

console.log("--- exposure signatures: confirm markers, reject custom HTML 200, never return values ---");
chk("git HEAD signature", exposureMatches("/.git/HEAD", 200, "ref: refs/heads/main\n"), true);
chk("git config signature", exposureMatches("/.git/config", 200, "[core]\nrepositoryformatversion = 0"), true);
chk("env signature", exposureMatches("/.env", 200, "DB_PASSWORD=do-not-persist\n"), true);
chk("custom HTML 200 is not env", exposureMatches("/.env", 200, "<html>DB_PASSWORD=fake</html>"), false);
chk("404 is not exposed", exposureMatches("/.git/HEAD", 404, "ref: refs/heads/main"), false);

console.log("--- SSL alert threshold ladder ---");
chk("31 days is not due", dueAlertThreshold(31), null);
chk("30-day alert", dueAlertThreshold(30), 30);
chk("10 days selects 14-day threshold", dueAlertThreshold(10), 14);
chk("expiry day selects 1-day threshold", dueAlertThreshold(0), 1);
chk("expired alert", dueAlertThreshold(-1), -1);

console.log("--- curated vulnerability parsers and evidence-labelled mappings ---");
const sslyze = parseSslyzeReport({ server_scan_results: [{ scan_status: "COMPLETED", scan_result: {
  heartbleed: { status: "COMPLETED", result: { is_vulnerable_to_heartbleed: false } },
  ssl_3_0_cipher_suites: { status: "COMPLETED", result: { is_tls_version_supported: false } },
  tls_1_0_cipher_suites: { status: "COMPLETED", result: { is_tls_version_supported: true } },
  tls_1_1_cipher_suites: { status: "COMPLETED", result: { is_tls_version_supported: false } },
  tls_1_2_cipher_suites: { status: "COMPLETED", result: { accepted_cipher_suites: [{ cipher_suite: { name: "TLS_RSA_WITH_RC4_128_SHA" } }] } },
  tls_1_3_cipher_suites: { status: "COMPLETED", result: { accepted_cipher_suites: [] } },
} }] });
chk("Heartbleed negative parsed", sslyze.heartbleed, false);
chk("legacy protocol parsed", sslyze.legacy.includes("TLS 1.0"), true);
chk("weak cipher parsed", sslyze.weakCiphers.includes("TLS_RSA_WITH_RC4_128_SHA"), true);
chk("legacy protocol is high", tlsVulnerabilityFindings(sslyze)[1].status, "high");
chk("scanner failure is never safe", tlsVulnerabilityFindings({ checked: false, error: "timeout" })[0].status, "warning");
chk("reflected credentialed CORS is high", corsFinding(new Headers({ "access-control-allow-origin": "https://checker.octasec.ai", "access-control-allow-credentials": "true" })).status, "high");
chk("wildcard + credentials is warning not fake critical", corsFinding(new Headers({ "access-control-allow-origin": "*", "access-control-allow-credentials": "true" })).status, "warning");
chk("public wildcard CORS is informational", corsFinding(new Headers({ "access-control-allow-origin": "*" })).status, "info");
chk("PHP2Shell exposed is critical", php2shellFinding({ overall: { verdict: "exposed", summary: "Vulnerable." }, php: { version: "8.1.0" }, oracle: { evidence: "3/3" } }).status, "critical");
chk("PHP2Shell not-PHP is informational", php2shellFinding({ overall: { verdict: "not-php", summary: "Not PHP." }, php: { version: null }, oracle: { evidence: "0/3" } }).status, "info");

console.log("--- direct-DNS outage falls back to the system resolver ---");
const original = { resolve4: dns.resolve4, resolve6: dns.resolve6, lookup: dns.lookup };
try {
  dns.resolve4 = dns.resolve6 = async () => { throw new Error("simulated direct-DNS outage"); };
  dns.lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  const resolved = await resolvePublicTarget("https://example.com");
  chk("system resolver fallback used", resolved.addresses[0].address, "93.184.216.34");
} finally {
  dns.resolve4 = original.resolve4;
  dns.resolve6 = original.resolve6;
  dns.lookup = original.lookup;
}

console.log("--- public target validation and auth boundary ---");
chk("private IPv4 refused", (await J("POST", "/website-check/check", { url: "http://127.0.0.1" })).status, 422);
chk("metadata address refused", (await J("POST", "/website-check/check", { url: "http://169.254.169.254/latest/meta-data" })).status, 422);
chk("alert list requires auth", (await J("GET", "/website-check/alerts")).status, 401);

console.log("--- verified-domain SSL alerts and tenant isolation ---");
const created = await J("POST", "/domains", { name: `ssl${ts}.com` }, ca);
const domain = created.j.domain;
chk("unverified domain cannot enable alerts", (await J("POST", "/website-check/alerts", { domainId: domain._id }, ca)).status, 409);
await conn.collection("domains").updateOne({ _id: oid(domain._id) }, { $set: { verified: true, verifiedAt: new Date() } });
chk("verified domain can enable alerts", (await J("POST", "/website-check/alerts", { domainId: domain._id }, ca)).status, 201);
const companyAlerts = await J("GET", "/website-check/alerts", null, ca);
chk("company alert visible to its tenant", companyAlerts.j.alerts.some((a) => String(a.domainId) === String(domain._id)), true);
const otherAlerts = await J("GET", "/website-check/alerts", null, dash);
chk("other tenant cannot see alert", otherAlerts.j.alerts.some((a) => String(a.domainId) === String(domain._id)), false);
chk("other tenant cannot disable alert", (await J("POST", "/website-check/alerts", { domainId: domain._id, enabled: false }, dash)).status, 404);
chk("owner can disable alerts", (await J("POST", "/website-check/alerts", { domainId: domain._id, enabled: false }, ca)).status, 200);

console.log("--- PDF is a real non-empty document; no response-body/secret fields stored ---");
const report = {
  target: "example.com", checkedAt: new Date().toISOString(), checkedAtDhaka: "24 Oct 2026, 12:00:00 GMT+6", requests: 5,
  counts: { critical: 1, high: 0, warning: 0, good: 1, info: 0 },
  overall: { verdict: "urgent", label: "Immediate attention required", summary: "Confirmed exposure." },
  findings: [{ category: "Public exposure", status: "critical", title: ".env appears publicly exposed", evidence: "Signature matched; values discarded.", remediation: "Block access and rotate secrets." }],
  limitations: "Low-impact external checks only.",
};
const reportId = "ab".repeat(16);
await WebsiteCheck.create({ reportId, target: "example.com", report, ip: "127.0.0.1", ua: "test" });
const stored = await WebsiteCheck.findOne({ reportId }).lean();
chk("no raw response body field", "body" in stored.report, false);
chk("no secret value in sanitized report", JSON.stringify(stored).includes("do-not-persist"), false);
const response = await fetch(`${BASE}/website-check/${reportId}/report.pdf`);
const bytes = Buffer.from(await response.arrayBuffer());
chk("PDF endpoint returns 200", response.status, 200);
chk("PDF content type", response.headers.get("content-type"), "application/pdf");
chk("PDF magic", bytes.subarray(0, 4).toString(), "%PDF");
chk("PDF non-trivial size", bytes.length > 1000, true);
const generated = await websiteCheckPdf(report, reportId);
chk("direct PDF generator agrees on magic", generated.subarray(0, 4).toString(), "%PDF");
chk("bad report ID rejected", (await J("GET", "/website-check/not-a-report/report.pdf")).status, 400);

await done("WEBSITE CHECK");
