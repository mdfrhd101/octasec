// Regression proofs for the 2026-10-17 security assessment (SECURITY_REPORT_OctaSec_2026-10-17.md).
// Each check maps to a finding id (SA-xx) and must stay green.
import mongoose from "mongoose";
import { BASE, J, token, login, chk, done, db, engagementBody, mailsTo, latestLink } from "./lib.mjs";

const ts = Date.now();
const conn = await db();
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const emp = await token("emp@demo.com", "emp12345");
const P = (name) => ({ legalName: name, industry: "other", country: "BD", contacts: { primary: { name: "O", email: "o@sec.test" } } });
const AUTH = { onFile: true, authorizerName: "Client CEO", authorizerTitle: "CEO", validUntil: day(365) };
const verify = (id) => conn.collection("domains").updateOne({ _id: oid(id) }, { $set: { verified: true, verifiedAt: new Date() } });

console.log("--- SA-01 (High): client domain cannot be flipped to 'self' to dodge authorisation ---");
const cNo = (await J("POST", "/clients", { profile: P("NoAuth " + ts) }, ca)).j.client;
const dom = (await J("POST", "/domains", { name: `flip${ts}.com`, ownerType: "client", clientId: cNo._id }, ca)).j.domain;
await verify(dom._id);
chk("scan blocked without client authorisation (409)", (await J("POST", "/engagements", engagementBody(dom._id), ca)).status, 409);
chk("client → self refused (409)", (await J("PATCH", `/domains/${dom._id}`, { ownerType: "self" }, ca)).status, 409);
const cOk = (await J("POST", "/clients", { profile: P("WithAuth " + ts), authorization: AUTH }, ca)).j.client;
chk("employee cannot move a client's domain (403)", (await J("PATCH", `/domains/${dom._id}`, { ownerType: "client", clientId: cOk._id }, emp)).status, 403);
const moved = await J("PATCH", `/domains/${dom._id}`, { ownerType: "client", clientId: cOk._id }, ca);
chk("company_admin may move it between clients", moved.status, 200);
chk("…but must re-verify ownership", moved.j.domain.verified, false);
const acts = (await J("GET", "/admin/audit?category=domain&limit=50", null, admin)).j.entries.map((e) => e.action);
chk("reassignment audited", acts.includes("domain.reassign"), true);

console.log("--- SA-02: re-check at assign/run; open scans block reassignment; delete cancels ---");
await verify(dom._id);
const eng = (await J("POST", "/engagements", engagementBody(dom._id), ca)).j.engagement;
chk("request with valid authorisation 201", !!eng?.id, true);
chk("reassign while a scan is open → 409", (await J("PATCH", `/domains/${dom._id}`, { ownerType: "client", clientId: cNo._id }, ca)).status, 409);
await J("PATCH", `/clients/${cOk._id}`, { authorization: { onFile: false } }, ca);
const asg = await J("POST", `/admin/engagements/${eng.id}/assign`, null, admin);
chk("assign refused after authorisation was withdrawn (409)", asg.status, 409);
await J("PATCH", `/clients/${cOk._id}`, { authorization: AUTH }, ca);
chk("assign OK once authorisation is back", (await J("POST", `/admin/engagements/${eng.id}/assign`, null, admin)).status, 200);
const auditMeta = (await J("GET", "/admin/audit?category=client&limit=20", null, admin)).j.entries.find((e) => e.action === "client.update")?.meta || {};
chk("authorisation change is audited (before/after)", auditMeta.onFileBefore !== undefined && auditMeta.onFileAfter !== undefined, true);
const tooLate = (await J("POST", "/clients", { profile: P("ShortAuth " + ts), authorization: { ...AUTH, validUntil: day(3) } }, ca)).j.client;
const dLate = (await J("POST", "/domains", { name: `late${ts}.com`, ownerType: "client", clientId: tooLate._id }, ca)).j.domain;
await verify(dLate._id);
chk("authorisation ending before the test dates → 409", (await J("POST", "/engagements", engagementBody(dLate._id), ca)).status, 409);
const del = await J("DELETE", `/domains/${dom._id}`, null, ca);
chk("domain delete 200", del.status, 200);
chk("open engagement cancelled with the domain", (await conn.collection("engagements").findOne({ _id: oid(eng.id) })).status, "cancelled");

console.log("--- SA-03: operator binding + per-finding review ---");
const dash = await token("dash@demo.com", "dash12345");
const acme = (await J("GET", "/domains?owner=all", null, dash)).j.domains.find((d) => d.name === "acme.io");
const e3 = (await J("POST", "/engagements", engagementBody(acme._id), dash)).j.engagement.id;
await J("POST", `/admin/engagements/${e3}/assign`, null, admin);
await conn.collection("engagements").updateOne({ _id: oid(e3) }, { $set: { assignedOperatorId: new mongoose.Types.ObjectId() } });
chk("only the assigned operator can run (403)", (await J("POST", `/admin/engagements/${e3}/run`, null, admin)).status, 403);
await J("POST", `/admin/engagements/${e3}/reject`, { reason: "test" }, admin);

console.log("--- SA-04 / SA-08: tenants see no counts before delivery, no internals ---");
const e4 = (await J("POST", "/engagements", engagementBody(acme._id), dash)).j.engagement.id;
await J("POST", `/admin/engagements/${e4}/assign`, null, admin);
await conn.collection("engagements").updateOne({ _id: oid(e4) }, { $unset: { engine: "" } }); // a pre-engine (legacy) record
chk("legacy engagement without engine fields can still be run", (await J("POST", `/admin/engagements/${e4}/run`, null, admin)).status, 200);
const row = (await J("GET", "/engagements", null, dash)).j.engagements.find((x) => x.id === e4);
chk("finding count hidden before delivery", row.findings, 0);
const view = (await J("GET", `/engagements/${e4}`, null, dash)).j.engagement;
chk("no operator id exposed", view.assignedOperatorId === undefined && view.signedBy === undefined, true);
chk("no engine job id / error exposed", view.engine?.jobId === undefined && view.engine?.error === undefined, true);
chk("no findings before delivery", view.findings.length, 0);
await J("POST", `/admin/engagements/${e4}/reject`, { reason: "test" }, admin).catch(() => {});
await conn.collection("engagements").updateOne({ _id: oid(e4) }, { $set: { status: "cancelled" } });

console.log("--- SA-08: staff user ids never shown to tenants in tickets ---");
const t = (await J("POST", "/tickets", { subject: "id leak", body: "x" }, ca)).j.ticket;
await J("POST", `/tickets/${t._id}/messages`, { body: "staff reply" }, admin);
const tv = (await J("GET", `/tickets/${t._id}`, null, ca)).j.ticket;
chk("super_admin authorId hidden from tenant", tv.messages.find((m) => m.authorRole === "super_admin")?.authorId, undefined);

console.log("--- SA-09: public-suffix + API-docs scope ---");
chk("public-suffix domain refused 400", (await J("POST", "/domains", { name: "s3.amazonaws.com" }, ca)).status, 400);
const dApi = (await J("POST", "/domains", { name: `api${ts}.com` }, ca)).j.domain;
await verify(dApi._id);
chk("API docs URL on another host refused 400", (await J("POST", "/engagements", engagementBody(dApi._id, { scoping: { ...(engagementBody(dApi._id).scoping), apiDocsUrl: "http://169.254.169.254/latest/meta-data/" } }), ca)).status, 400);

console.log("--- SA-10: one open scan per domain ---");
const first = await J("POST", "/engagements", engagementBody(dApi._id), ca);
chk("first request 201", first.status, 201);
chk("duplicate open request 409", (await J("POST", "/engagements", engagementBody(dApi._id), ca)).status, 409);
await J("POST", `/engagements/${first.j.engagement.id}/cancel`, null, ca);

console.log("--- SA-12: contact-form email cannot smuggle mail headers ---");
chk("email with ?bcc= refused 400", (await J("POST", "/contact", { name: "x", email: "a@b.co?bcc=spy%40evil.com", message: "hi", target: "web" })).status, 400);

console.log("--- SA-14: signup does not reveal registered emails; unverified cannot sign in ---");
const ex = await J("POST", "/auth/register", { email: "client@demo.com", password: "Whatever-123" });
const nw = await J("POST", "/auth/register", { email: `fresh${ts}@test.com`, password: "Whatever-123" });
chk("existing email → 202", ex.status, 202);
chk("new email → 202", nw.status, 202);
chk("identical replies", JSON.stringify(ex.j), JSON.stringify(nw.j));
chk("no session handed out at signup", nw.j.token, undefined);
const pend = await login(`fresh${ts}@test.com`, "Whatever-123");
chk("unverified login 403 EMAIL_NOT_VERIFIED", pend.status === 403 && pend.j.code === "EMAIL_NOT_VERIFIED", true);
const vt = await latestLink(`fresh${ts}@test.com`);
const vr = await J("POST", "/auth/verify-email", { token: vt });
chk("confirmation link activates + signs in", vr.status === 200 && vr.j.user.status === "active" && !!vr.j.token, true);
chk("confirmation link single-use", (await J("POST", "/auth/verify-email", { token: vt })).status, 400);
chk("common password refused at signup", (await J("POST", "/auth/register", { email: `weak${ts}@test.com`, password: "password123" })).status, 400);

console.log("--- SA-15: pending squatter cannot block provisioning; last admin protected ---");
await J("POST", "/auth/register", { email: `squat${ts}@test.com`, password: "Squatter-123" });
const prov = await J("POST", "/admin/companies", { name: "Squat Co " + ts, adminEmail: `squat${ts}@test.com` }, admin);
chk("provisioning wins over an unverified signup", prov.status, 201);
chk("deleting the only company admin → 409", (await J("DELETE", `/admin/users/${prov.j.admin.id}`, null, admin)).status, 409);

await done("SECURITY FIXES");
