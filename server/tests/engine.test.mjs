// Scan-engine integration: mock driver end to end + signed callback webhook.
// Contract: docs/ENGINE_INTEGRATION.md
import crypto from "node:crypto";
import mongoose from "mongoose";
import { BASE, J, token, chk, done, db, engagementBody, reviewAll } from "./lib.mjs";

const SECRET = process.env.ENGINE_WEBHOOK_SECRET;
const conn = await db();
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const admin = await token("admin@octasec.ai", "admin12345");
const dash = await token("dash@demo.com", "dash12345");
const acme = (await J("GET", "/domains?owner=all", null, dash)).j.domains.find((d) => d.name === "acme.io");

async function callback(body, { ts = Math.floor(Date.now() / 1000), secret = SECRET, sig, raw } = {}) {
  const payload = raw ?? JSON.stringify(body);
  const mac = crypto.createHmac("sha256", secret).update(`${ts}.`).update(payload).digest("hex");
  const r = await fetch(BASE + "/engine/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-OctaSec-Timestamp": String(ts), "X-OctaSec-Signature": sig ?? `sha256=${mac}` },
    body: payload,
  });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
}
async function newRunning() {
  const id = (await J("POST", "/engagements", engagementBody(acme._id), dash)).j.engagement.id;
  await J("POST", `/admin/engagements/${id}/assign`, null, admin);
  await J("POST", `/admin/engagements/${id}/run`, null, admin);
  const jobId = "job-" + crypto.randomBytes(6).toString("hex");
  await conn.collection("engagements").updateOne({ _id: oid(id) }, { $set: { "engine.state": "running", "engine.jobId": jobId, findings: [] } });
  return { id, jobId };
}

console.log("--- mock driver end to end ---");
const disc = await J("POST", "/assets/discover", { domainId: acme._id }, dash);
chk("discover 200", disc.status, 200);
chk("discover flags mock", disc.j.mock, true);
chk("every discovered host in scope", disc.j.assets.every((a) => a.host === "acme.io" || a.host.endsWith(".acme.io")), true);
const e1 = (await J("POST", "/engagements", engagementBody(acme._id), dash)).j.engagement.id;
await J("POST", `/admin/engagements/${e1}/assign`, null, admin);
const run = await J("POST", `/admin/engagements/${e1}/run`, null, admin);
chk("run 200", run.status, 200);
chk("engine driver recorded", run.j.engagement.engine.driver, "mock");
chk("engine job id recorded", /^mock-/.test(run.j.engagement.engine.jobId), true);
chk("mock completes", run.j.engagement.engine.state, "completed");
chk("findings unverified until signed", run.j.engagement.findings.every((f) => f.verified === false), true);
chk("finding hosts in scope", run.j.engagement.findings.every((f) => f.host.endsWith("acme.io")), true);
chk("sync on completed job is a no-op 200", (await J("POST", `/admin/engagements/${e1}/sync`, null, admin)).status, 200);
await reviewAll(e1, admin);
chk("sign 200", (await J("POST", `/admin/engagements/${e1}/sign`, null, admin)).j.engagement.status, "delivered");

console.log("--- signed callback: authentication ---");
const { id: e2, jobId } = await newRunning();
chk("cannot sign while engine is running 409", (await J("POST", `/admin/engagements/${e2}/sign`, null, admin)).status, 409);
const noHdr = await fetch(BASE + "/engine/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, state: "running" }) });
chk("no signature 401", noHdr.status, 401);
chk("wrong secret 401", (await callback({ jobId, state: "running" }, { secret: "not-the-secret" })).status, 401);
chk("tampered signature 401", (await callback({ jobId, state: "running" }, { sig: "sha256=" + "0".repeat(64) })).status, 401);
chk("stale timestamp 401", (await callback({ jobId, state: "running" }, { ts: Math.floor(Date.now() / 1000) - 1000 })).status, 401);
chk("future timestamp 401", (await callback({ jobId, state: "running" }, { ts: Math.floor(Date.now() / 1000) + 1000 })).status, 401);
chk("malformed signature header 401", (await callback({ jobId, state: "running" }, { sig: "md5=abc" })).status, 401);

console.log("--- signed callback: validation ---");
chk("unknown jobId 404", (await callback({ jobId: "job-nope", state: "running" })).status, 404);
chk("signed non-JSON 400", (await callback(null, { raw: "not json" })).status, 400);
chk("bad state 400", (await callback({ jobId, state: "exploded" })).status, 400);
const F = { title: "SQL injection in /search", severity: "critical", cvss: 9.8, host: "api.acme.io", owasp: "A03:2021 Injection", cwe: "CWE-89", detail: "q param", fix: "Parameterise", evidence: "GET /search?q=1'-- HTTP/1.1" };
chk("out-of-scope host 400", (await callback({ jobId, state: "completed", findings: [{ ...F, host: "evil.example.com" }] })).status, 400);
chk("internal host 400", (await callback({ jobId, state: "completed", findings: [{ ...F, host: "169.254.169.254" }] })).status, 400);
chk("bad severity 400", (await callback({ jobId, state: "completed", findings: [{ ...F, severity: "urgent" }] })).status, 400);
chk("cvss > 10 400", (await callback({ jobId, state: "completed", findings: [{ ...F, cvss: 11 }] })).status, 400);
chk("cvss as string 400", (await callback({ jobId, state: "completed", findings: [{ ...F, cvss: "9.8" }] })).status, 400);
chk("operator in title 400", (await callback({ jobId, state: "completed", findings: [{ ...F, title: { $gt: "" } }] })).status, 400);
chk("too many findings 400", (await callback({ jobId, state: "completed", findings: Array(501).fill(F) })).status, 400);
const big = await fetch(BASE + "/engine/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, pad: "x".repeat(2.2 * 1024 * 1024) }) });
chk("body > 2 MB 413", big.status, 413);

console.log("--- signed callback: happy path ---");
const prog = await callback({ jobId, state: "running", progress: 40 });
chk("progress update 200", prog.status, 200);
chk("progress stored", (await conn.collection("engagements").findOne({ _id: oid(e2) })).engine.progress, 40);
const fin = await callback({ jobId, state: "completed", progress: 100, findings: [F, { ...F, title: "Reflected XSS", severity: "high", cvss: 7.1, host: "acme.io", cwe: "CWE-79" }] });
chk("completed with findings 200", fin.status, 200);
const stored = await conn.collection("engagements").findOne({ _id: oid(e2) });
chk("2 findings stored", stored.findings.length, 2);
chk("evidence kept", stored.findings[0].evidence.includes("/search"), true);
chk("stored unverified", stored.findings.every((f) => f.verified === false), true);
chk("replay after final 409", (await callback({ jobId, state: "running" })).status, 409);
chk("sign blocked until findings are reviewed", (await J("POST", `/admin/engagements/${e2}/sign`, null, admin)).status, 409);
const fids = (await J("GET", `/admin/engagements/${e2}`, null, admin)).j.engagement.findings.map((f) => f._id);
chk("reject needs a reason 400", (await J("POST", `/admin/engagements/${e2}/findings/${fids[1]}`, { decision: "rejected" }, admin)).status, 400);
await J("POST", `/admin/engagements/${e2}/findings/${fids[0]}`, { decision: "verified" }, admin);
await J("POST", `/admin/engagements/${e2}/findings/${fids[1]}`, { decision: "rejected", note: "false positive" }, admin);
const signed = await J("POST", `/admin/engagements/${e2}/sign`, null, admin);
chk("only verified findings delivered", signed.j.engagement.findings.length, 1);
chk("rejected count recorded", signed.j.engagement.rejectedCount, 1);
chk("operator signs after completion", signed.j.engagement.status, "delivered");
chk("signing verifies findings", signed.j.engagement.findings.every((f) => f.verified), true);
chk("callback on delivered 409", (await callback({ jobId, state: "completed" })).status, 409);

console.log("--- failed scan can be re-run ---");
const { id: e3, jobId: j3 } = await newRunning();
chk("engine reports failure 200", (await callback({ jobId: j3, state: "failed", error: "target unreachable" })).status, 200);
chk("cannot sign a failed scan 409", (await J("POST", `/admin/engagements/${e3}/sign`, null, admin)).status, 409);
const rerun = await J("POST", `/admin/engagements/${e3}/run`, null, admin);
chk("operator re-runs failed scan 200", rerun.status, 200);
chk("re-run gets a new job", rerun.j.engagement.engine.jobId !== j3, true);
await conn.collection("engagements").updateOne({ _id: oid(e3) }, { $set: { status: "cancelled" } }); // leave the shared test domain free

const acts = (await J("GET", "/admin/audit?category=engagement&limit=100", null, admin)).j.entries.map((e) => e.action);
chk("audit engine.callback", acts.includes("engine.callback"), true);

await done("ENGINE (mock + callback)");
