// Remediation workflow + portal CRUD additions — tests/specs/portal-frontend.spec.md
import { J, token, chk, done, db, engagementBody, reviewAll } from "./lib.mjs";

const admin = await token("admin@octasec.ai", "admin12345");
const client = await token("client@demo.com", "client12345");
const corp = await token("corp@demo.com", "corp12345");
const emp = await token("emp@demo.com", "emp12345");
const conn = await db();

// a fresh verified domain for the self-serve client, with one asset
const name = `fix-${Date.now().toString(36)}.io`;
const dom = (await J("POST", "/domains", { name }, client)).j.domain;
await conn.collection("domains").updateOne({ name }, { $set: { verified: true, verifiedAt: new Date() } });
const asset = (await J("POST", "/assets", { domainId: dom._id, host: "app." + name }, client)).j.asset;

console.log("--- deliver a report ---");
const eid = (await J("POST", "/engagements", engagementBody(dom._id), client)).j.engagement.id;
await J("POST", `/admin/engagements/${eid}/assign`, null, admin);
await J("POST", `/admin/engagements/${eid}/run`, null, admin);
await reviewAll(eid, admin);
chk("delivered", (await J("POST", `/admin/engagements/${eid}/sign`, null, admin)).j.engagement.status, "delivered");
// the mock engine returns 1–4 findings; make sure there are at least two
const { Types } = (await import("mongoose")).default;
await conn.collection("engagements").updateOne({ _id: new Types.ObjectId(eid) }, { $push: { findings: {
  _id: new Types.ObjectId(), title: "Extra verified finding", severity: "low", cvss: 3.1, owasp: "A05", cwe: "CWE-16",
  detail: "d", fix: "f", evidence: "", host: "app." + name, verified: true, review: "verified",
} } });
let rep = (await J("GET", `/engagements/${eid}`, null, client)).j.engagement;
chk("findings start open", rep.findings.every((f) => f.state === "open"), true);
chk("report has detail/fix fields", rep.findings.every((f) => "detail" in f && "fix" in f && "evidence" in f), true);
const [f1, f2] = rep.findings;
chk("at least two findings", !!(f1 && f2), true);

console.log("--- finding state ---");
const dash0 = (await J("GET", "/dashboard", null, client)).j;
const open0 = dash0.tiles?.openFindings ?? dash0.posture?.tiles?.openFindings;
const P = (fid, body, tok = client) => J("PATCH", `/engagements/${eid}/findings/${fid}`, body, tok);
chk("mark fixed 200", (await P(f1._id, { state: "fixed", note: "patched in v2.1" })).status, 200);
const dash1 = (await J("GET", "/dashboard", null, client)).j;
const open1 = dash1.tiles?.openFindings ?? dash1.posture?.tiles?.openFindings;
chk("dashboard open findings drop by 1", open0 - open1, 1);
chk("accepted_risk needs a reason 400", (await P(f2._id, { state: "accepted_risk" })).status, 400);
chk("accepted_risk with reason 200", (await P(f2._id, { state: "accepted_risk", note: "internal only" })).status, 200);
chk("reopen 200", (await P(f2._id, { state: "open" })).status, 200);
chk("invalid state 400", (await P(f2._id, { state: "done" })).status, 400);
chk("operator-object state 400", (await P(f2._id, { state: { $ne: "x" } })).status, 400);
chk("other tenant 404", (await P(f1._id, { state: "open" }, corp)).status, 404);
chk("super admin 403", (await P(f1._id, { state: "open" }, admin)).status, 403);
chk("unknown finding 404", (await P("0".repeat(24), { state: "fixed" })).status, 404);
rep = (await J("GET", `/engagements/${eid}`, null, client)).j.engagement;
chk("state persisted", rep.findings.find((f) => f._id === f1._id).state, "fixed");
chk("state note persisted", rep.findings.find((f) => f._id === f1._id).stateNote, "patched in v2.1");
const audits = await conn.collection("auditlogs").countDocuments({ action: "finding.state", targetId: eid });
chk("state changes audited", audits >= 3, true);

console.log("--- retest ---");
const RT = (body, tok = client) => J("POST", `/engagements/${eid}/retest`, body, tok);
chk("empty list 400", (await RT({ findingIds: [] })).status, 400);
chk("non-fixed finding 400", (await RT({ findingIds: [f2._id] })).status, 400);
chk("unknown finding 400", (await RT({ findingIds: ["0".repeat(24)] })).status, 400);
chk("other tenant 404", (await RT({ findingIds: [f1._id] }, corp)).status, 404);
const rt = await RT({ findingIds: [f1._id] });
chk("retest 201", rt.status, 201);
chk("retest kind", rt.j.engagement?.kind, "retest");
const rid = rt.j.engagement?.id;
const rv = (await J("GET", `/engagements/${rid}`, null, client)).j.engagement;
chk("retest links parent", String(rv.parentId), String(eid));
chk("retest targets = finding hosts", JSON.stringify(rv.targets), JSON.stringify([f1.host]));
chk("retest requested", rv.status, "requested");
chk("parent lists the retest", (await J("GET", `/engagements/${eid}`, null, client)).j.engagement.retests.length, 1);
chk("second retest while open 409", (await RT({ findingIds: [f1._id] })).status, 409);
const q = (await J("GET", "/admin/engagements?status=open", null, admin)).j.engagements.find((e) => e.id === rid);
chk("operator queue shows retest", q?.kind, "retest");
const ad = (await J("GET", `/admin/engagements/${rid}`, null, admin)).j.engagement;
chk("operator sees which findings to re-check", ad.retestFindings?.[0]?.title, f1.title);

console.log("--- undelivered report: finding state 409 ---");
chk("state on open retest 409", (await J("PATCH", `/engagements/${rid}/findings/${f1._id}`, { state: "fixed" }, client)).status, 409);

console.log("--- assets: delete ---");
chk("delete while scan open 409", (await J("DELETE", `/assets/${asset._id}`, null, client)).status, 409);
chk("cancel retest", (await J("POST", `/engagements/${rid}/cancel`, null, client)).status, 200);
chk("other tenant delete 404", (await J("DELETE", `/assets/${asset._id}`, null, corp)).status, 404);
chk("delete asset 200", (await J("DELETE", `/assets/${asset._id}`, null, client)).status, 200);
chk("asset gone", (await J("GET", `/assets?domainId=${dom._id}`, null, client)).j.assets.length, 0);
chk("bad id 400", (await J("DELETE", "/assets/xyz", null, client)).status, 400);

console.log("--- domains: edit details ---");
const DP = (body, tok = client) => J("PATCH", `/domains/${dom._id}`, body, tok);
const ed = await DP({ label: "Main app", env: "staging", criticality: "high", tags: "web, api", contact: "ops@fix.io", notes: "edited" });
chk("edit details 200", ed.status, 200);
chk("label saved", ed.j.domain?.label, "Main app");
chk("env saved", ed.j.domain?.env, "staging");
chk("tags saved", JSON.stringify(ed.j.domain?.tags), JSON.stringify(["web", "api"]));
chk("still verified after detail edit", ed.j.domain?.verified, true);
chk("invalid env 400", (await DP({ env: "prod" })).status, 400);
chk("invalid criticality 400", (await DP({ criticality: "extreme" })).status, 400);
chk("other tenant 404", (await DP({ label: "x" }, corp)).status, 404);
chk("edit audited", (await conn.collection("auditlogs").countDocuments({ action: "domain.update", targetId: String(dom._id) })) >= 1, true);

console.log("--- employees: edit ---");
const emps = (await J("GET", "/company/employees", null, corp)).j.employees;
const e1 = emps.find((u) => u.email === "emp@demo.com");
const EP = (body, tok = corp) => J("PATCH", `/company/employees/${e1.id}`, body, tok);
const ee = await EP({ name: "Employee Renamed", phone: "+8801711111111" });
chk("edit employee 200", ee.status, 200);
chk("name saved", ee.j.employee?.name, "Employee Renamed");
chk("status untouched", ee.j.employee?.status, "active");
chk("empty patch 400", (await EP({})).status, 400);
chk("employee cannot edit 403", (await EP({ name: "x" }, emp)).status, 403);
await EP({ name: "Employee One" });

console.log("--- API keys stub ---");
const ak = await J("GET", "/company/api-keys", null, corp);
chk("api-keys 501", ak.status, 501);
chk("api-keys code", ak.j?.code, "NOT_IMPLEMENTED");
chk("api-keys employee 403", (await J("GET", "/company/api-keys", null, emp)).status, 403);

await done("FINDINGS + CRUD");
