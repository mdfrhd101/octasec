import { activate } from "./lib.mjs";
const B = process.env.API_BASE || "http://127.0.0.1:5050/api";
const J = async (m, p, body, tok) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
};
const login = async (e, p) => (await J("POST", "/auth/login", { email: e, password: p }));
let pass = 0, fail = 0;
const chk = (n, got, want) => { if (got === want) pass++; else { console.log(`  FAIL ${n}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); fail++; } };

const admin = (await login("admin@octasec.ai", "admin12345")).j.token;
const ts = Date.now();
const adminEmail = `ca${ts}@newco.com`;

console.log("--- provision company + admin ---");
const create = await J("POST", "/admin/companies", { name: "NewCo " + ts, adminName: "New Admin", adminEmail }, admin);
chk("invite emailed", create.j.inviteSent, true);
chk("admin cannot sign in before accepting the invite", (await login(adminEmail, "newadmin123")).status, 401);
await activate(adminEmail, null, "newadmin123");
chk("create company 201", create.status, 201);
chk("returns company", !!create.j.company?.id, true);
const cid = create.j.company?.id;

// validation
chk("missing name -> 400", (await J("POST", "/admin/companies", { adminEmail: "x@y.com", adminPassword: "xxxxxxxx" }, admin)).status, 400);
chk("bad admin email -> 400", (await J("POST", "/admin/companies", { name: "X", adminEmail: "bad", adminPassword: "xxxxxxxx" }, admin)).status, 400);
chk("duplicate admin email -> 409", (await J("POST", "/admin/companies", { name: "Y", adminEmail, adminPassword: "xxxxxxxx" }, admin)).status, 409);
chk("company_admin cannot provision -> 403", (await J("POST", "/admin/companies", { name: "Z", adminEmail: "z@z.com", adminPassword: "xxxxxxxx" }, (await login("corp@demo.com", "corp12345")).j.token)).status, 403);

console.log("--- the new admin can log in + lands in the new company ---");
const newLogin = await login(adminEmail, "newadmin123");
chk("new admin login 200", newLogin.status, 200);
chk("new admin role company_admin", newLogin.j.user?.role, "company_admin");
chk("new admin has companyId", newLogin.j.user?.companyId === cid, true);
chk("invited admin is not forced through a temp password", newLogin.j.user?.mustChangePassword, false);

console.log("--- company shows in super admin list with status active ---");
const comps = await J("GET", "/admin/companies", null, admin);
const theNew = comps.j.companies.find((c) => c.id === cid);
chk("company in list", !!theNew, true);
chk("status active", theNew?.status, "active");

console.log("--- suspend -> the admin can no longer log in ---");
chk("suspend 200", (await J("PATCH", `/admin/companies/${cid}`, { status: "suspended" }, admin)).status, 200);
chk("suspended admin login -> 403", (await login(adminEmail, "newadmin123")).status, 403);
chk("reactivate 200", (await J("PATCH", `/admin/companies/${cid}`, { status: "active" }, admin)).status, 200);
chk("reactivated admin login 200", (await login(adminEmail, "newadmin123")).status, 200);

console.log("--- delete cascades (company + its admin gone) ---");
chk("delete 200", (await J("DELETE", `/admin/companies/${cid}`, null, admin)).status, 200);
chk("deleted company gone from list", (await J("GET", "/admin/companies", null, admin)).j.companies.some((c) => c.id === cid), false);
chk("deleted admin cannot log in", (await login(adminEmail, "newadmin123")).status, 401);

console.log(`\nPHASE A (company provisioning): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
