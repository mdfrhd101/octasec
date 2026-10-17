// Phase H: cascade (BUG-001), per-request DB re-check + revocation (BUG-002),
// password change / admin reset, user disable/enable. Spec: tests/specs/hardening.spec.md
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { J, login, token, chk, done, db, engagementBody, activate, latestLink, mailsTo, reviewAll, registerVerified } from "./lib.mjs";

const ts = Date.now();
const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const adminId = (await J("GET", "/auth/me", null, admin)).j.user._id;
const corpUser = (await J("GET", "/auth/me", null, ca)).j.user;
const conn = await db();
const oid = (v) => new mongoose.Types.ObjectId(String(v));

console.log("--- BUG-001: company delete cascades engagements ---");
const cx = await J("POST", "/admin/companies", { name: "Cascade " + ts, adminEmail: `cx${ts}@test.com` }, admin);
chk("create cascade company 201", cx.status, 201);
const cxId = cx.j.company.id;
const cxTok = await activate(`cx${ts}@test.com`, "cascade123", "cascade456");
const dom = await J("POST", "/domains", { name: "cascade-test.com" }, cxTok);
chk("cascade domain 201", dom.status, 201);
await conn.collection("domains").updateOne({ _id: oid(dom.j.domain._id) }, { $set: { verified: true, verifiedAt: new Date() } });
const eng = await J("POST", "/engagements", engagementBody(dom.j.domain._id), cxTok);
chk("cascade engagement 201", eng.status, 201);
chk("engagement exists before delete", (await conn.collection("engagements").countDocuments({ companyId: oid(cxId) })) >= 1, true);
chk("delete company 200", (await J("DELETE", `/admin/companies/${cxId}`, null, admin)).status, 200);
chk("no engagements left after delete", await conn.collection("engagements").countDocuments({ companyId: oid(cxId) }), 0);
chk("deleted user's token -> 401", (await J("GET", "/auth/me", null, cxTok)).status, 401);

console.log("--- BUG-002: role comes from the DB, not the token ---");
const e1 = `e1${ts}@demo.com`;
const add = await J("POST", "/company/employees", { email: e1, name: "E One" }, ca);
chk("employee invite emailed", add.j.inviteSent, true);
chk("add employee 201", add.status, 201);
const eid = add.j.employee.id;
let eTok = await activate(e1, "employee123", "employee456");
chk("employee sees clients 200", (await J("GET", "/clients", null, eTok)).status, 200);
await conn.collection("users").updateOne({ _id: oid(eid) }, { $set: { role: "client", companyId: null } });
chk("demoted (DB) -> same token now denied /clients 403", (await J("GET", "/clients", null, eTok)).status, 403);
await conn.collection("users").updateOne({ _id: oid(eid) }, { $set: { role: "employee", companyId: oid(corpUser.companyId) } });
chk("restored role -> 200 again", (await J("GET", "/clients", null, eTok)).status, 200);

const eTv = (await conn.collection("users").findOne({ _id: oid(eid) })).tokenVersion || 0;
const forgedRole = jwt.sign({ id: eid, role: "super_admin", companyId: null, tv: eTv }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "5m" });
chk("token claiming super_admin for an employee -> 403", (await J("GET", "/admin/stats", null, forgedRole)).status, 403);
const ghost = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: "super_admin", tv: 0 }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "5m" });
chk("token for unknown user -> 401", (await J("GET", "/admin/stats", null, ghost)).status, 401);
const legacy = jwt.sign({ id: corpUser._id, role: "company_admin", companyId: corpUser.companyId }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "5m" });
chk("legacy token without tv (tokenVersion 0) -> 200", (await J("GET", "/auth/me", null, legacy)).status, 200);

console.log("--- disable / enable (company_admin on own employee) ---");
chk("disable employee 200", (await J("PATCH", `/company/employees/${eid}`, { status: "disabled" }, ca)).status, 200);
chk("disabled employee's live token rejected 403", (await J("GET", "/dashboard", null, eTok)).status, 403);
chk("disabled employee login -> 403", (await login(e1, "employee456")).status, 403);
chk("enable employee 200", (await J("PATCH", `/company/employees/${eid}`, { status: "active" }, ca)).status, 200);
chk("old token NOT revived after enable", (await J("GET", "/dashboard", null, eTok)).status, 401);
eTok = await token(e1, "employee456");
chk("re-enabled employee can sign in", typeof eTok, "string");
chk("invalid status -> 400", (await J("PATCH", `/company/employees/${eid}`, { status: "banned" }, ca)).status, 400);
chk("bad id -> 400", (await J("PATCH", "/company/employees/xyz", { status: "disabled" }, ca)).status, 400);
chk("employee cannot disable staff -> 403", (await J("PATCH", `/company/employees/${eid}`, { status: "disabled" }, eTok)).status, 403);
chk("company_admin cannot disable self -> 400", (await J("PATCH", `/company/employees/${corpUser._id}`, { status: "disabled" }, ca)).status, 400);

const c2 = await J("POST", "/admin/companies", { name: "Other " + ts, adminEmail: `c2${ts}@test.com` }, admin);
const c2AdminId = c2.j.admin.id;
chk("company_admin cannot touch another company's user -> 404", (await J("PATCH", `/company/employees/${c2AdminId}`, { status: "disabled" }, ca)).status, 404);
chk("company_admin cannot reset another company's user -> 404", (await J("POST", `/company/employees/${c2AdminId}/reset-password`, null, ca)).status, 404);

console.log("--- admin password reset (emailed link — the admin never sees a password) ---");
const before = mailsTo(e1).length;
const reset = await J("POST", `/admin/users/${eid}/reset-password`, null, admin);
chk("super_admin reset 200", reset.status, 200);
chk("no password in the response", reset.j.tempPassword === undefined && JSON.stringify(reset.j).includes("employee456") === false, true);
chk("reset link emailed", reset.j.emailSent, true);
chk("reset revokes live token", (await J("GET", "/auth/me", null, eTok)).status, 401);
chk("old password stops working", (await login(e1, "employee456")).status, 401);
const rt = await latestLink(e1, before + 1);
chk("weak password refused 400", (await J("POST", "/auth/reset-password", { token: rt, newPassword: "password123" })).status, 400);
chk("password = email refused 400", (await J("POST", "/auth/reset-password", { token: rt, newPassword: e1 })).status, 400);
chk("set new password from link 200", (await J("POST", "/auth/reset-password", { token: rt, newPassword: "brandnew123" })).status, 200);
const nl = await login(e1, "brandnew123");
chk("login with new password 200", nl.status, 200);
chk("link is single-use", (await J("POST", "/auth/reset-password", { token: rt, newPassword: "another123x" })).status, 400);

console.log("--- legacy forced-change gate still enforced ---");
await conn.collection("users").updateOne({ _id: oid(eid) }, { $set: { mustChangePassword: true } });
const tTok = nl.j.token;
const blocked = await J("GET", "/dashboard", null, tTok);
chk("other routes blocked 403", blocked.status, 403);
chk("blocked with PASSWORD_CHANGE_REQUIRED", blocked.j?.code, "PASSWORD_CHANGE_REQUIRED");
chk("/auth/me allowed 200", (await J("GET", "/auth/me", null, tTok)).status, 200);
chk("wrong current password -> 400", (await J("POST", "/auth/change-password", { currentPassword: "nope-nope", newPassword: "brandnew456" }, tTok)).status, 400);
chk("short new password -> 400", (await J("POST", "/auth/change-password", { currentPassword: "brandnew123", newPassword: "short" }, tTok)).status, 400);
chk("same password -> 400", (await J("POST", "/auth/change-password", { currentPassword: "brandnew123", newPassword: "brandnew123" }, tTok)).status, 400);
const cp = await J("POST", "/auth/change-password", { currentPassword: "brandnew123", newPassword: "brandnew456" }, tTok);
chk("change password 200", cp.status, 200);
chk("flag cleared", cp.j.user.mustChangePassword, false);
chk("fresh token works", (await J("GET", "/dashboard", null, cp.j.token)).status, 200);
chk("pre-change token revoked", (await J("GET", "/auth/me", null, tTok)).status, 401);
chk("company_admin resets own employee 200", (await J("POST", `/company/employees/${eid}/reset-password`, null, ca)).status, 200);

console.log("--- logout revokes the session server-side ---");
const lo = await login("emp@demo.com", "emp12345");
chk("logout 200", (await J("POST", "/auth/logout", null, lo.j.token)).status, 200);
chk("token dead after logout", (await J("GET", "/auth/me", null, lo.j.token)).status, 401);

await done("HARDENING (part 1)");
