// Phase H hardening, part 2 (own suite: the auth endpoints are rate-limited per IP).
import mongoose from "mongoose";
import { J, login, token, chk, done, activate, registerVerified } from "./lib.mjs";

const ts = Date.now();
const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const adminId = (await J("GET", "/auth/me", null, admin)).j.user._id;
const eid = (await J("GET", "/company/employees", null, ca)).j.employees.find((u) => u.role === "employee").id;
const c2 = await J("POST", "/admin/companies", { name: "Other2 " + ts, adminEmail: `c2${ts}@test.com` }, admin);

console.log("--- super_admin guards ---");
chk("cannot reset self -> 400", (await J("POST", `/admin/users/${adminId}/reset-password`, null, admin)).status, 400);
chk("cannot disable self -> 400", (await J("PATCH", `/admin/users/${adminId}`, { status: "disabled" }, admin)).status, 400);
chk("unknown user -> 404", (await J("PATCH", `/admin/users/${new mongoose.Types.ObjectId()}`, { status: "disabled" }, admin)).status, 404);
chk("company_admin cannot use admin reset -> 403", (await J("POST", `/admin/users/${eid}/reset-password`, null, ca)).status, 403);
chk("role filter injection -> 400", (await J("GET", "/admin/users?role[$ne]=x", null, admin)).status, 400);

console.log("--- super_admin disables a self-serve client ---");
const reg = await registerVerified(`cl${ts}@test.com`, "client12345");
const clId = reg.user._id;
chk("disable client 200", (await J("PATCH", `/admin/users/${clId}`, { status: "disabled" }, admin)).status, 200);
chk("client token rejected 403", (await J("GET", "/auth/me", null, reg.token)).status, 403);
chk("client login -> 403", (await login(`cl${ts}@test.com`, "client12345")).status, 403);
const clients = (await J("GET", "/admin/users?role=client", null, admin)).j.users;
chk("client listed as disabled", clients.find((u) => String(u.id) === String(clId))?.status, "disabled");
chk("only clients returned", clients.every((u) => u.role === "client"), true);
chk("enable client 200", (await J("PATCH", `/admin/users/${clId}`, { status: "active" }, admin)).status, 200);

console.log("--- suspended company rejects live tokens ---");
const c2Tok = await activate(`c2${ts}@test.com`, "othercomp123", "othercomp456");
chk("c2 admin dashboard 200", (await J("GET", "/dashboard", null, c2Tok)).status, 200);
await J("PATCH", `/admin/companies/${c2.j.company.id}`, { status: "suspended" }, admin);
const susp = await J("GET", "/dashboard", null, c2Tok);
chk("suspended company -> 403", susp.status, 403);
chk("code COMPANY_SUSPENDED", susp.j?.code, "COMPANY_SUSPENDED");
await J("PATCH", `/admin/companies/${c2.j.company.id}`, { status: "active" }, admin);
chk("reactivated -> 200", (await J("GET", "/dashboard", null, c2Tok)).status, 200);

console.log("--- audit trail ---");
const users = (await J("GET", "/admin/audit?category=user&limit=200", null, admin)).j.entries.map((e) => e.action);
for (const a of ["user.disable", "user.enable", "user.password_reset", "user.create"]) chk(`audit has ${a}`, users.includes(a), true);
const auths = (await J("GET", "/admin/audit?category=auth&limit=200", null, admin)).j.entries.map((e) => e.action);
chk("audit has auth.password_change", auths.includes("auth.password_change"), true);

await done("HARDENING (part 2)");
