// End-to-end test of the Phase D.1 audit log.
const BASE = process.env.API_BASE || "http://127.0.0.1:5050/api";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };

async function j(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const uniq = Date.now().toString(36);

console.log("\n== 1. failed login should be audited ==");
const bad = await j("POST", "/auth/login", { email: "nobody-" + uniq + "@x.com", password: "wrongwrong" });
ok(bad.status === 401, "bad login → 401");

console.log("== 2. super_admin login ==");
const login = await j("POST", "/auth/login", { email: "admin@octasec.ai", password: "admin12345" });
ok(login.status === 200 && login.data.token, "admin login → token");
const T = login.data.token;

console.log("== 3. audit list returns entries ==");
const all = await j("GET", "/admin/audit?limit=50", null, T);
ok(all.status === 200, "GET /admin/audit → 200");
ok(typeof all.data.total === "number" && Array.isArray(all.data.entries), "has total + entries[]");
ok(all.data.entries.some((e) => e.action === "auth.login"), "contains auth.login");
ok(all.data.entries.some((e) => e.action === "auth.login_fail"), "contains auth.login_fail");

console.log("== 4. the failed-login attempt was recorded with the attempted email ==");
const lf = all.data.entries.find((e) => e.action === "auth.login_fail" && e.targetLabel.includes("nobody-" + uniq));
ok(!!lf, "login_fail entry carries the attempted email as target");
ok(lf && (lf.actorRole === "" || !lf.actorRole), "failed login has no actor role (anon)");

console.log("== 5. category filter (auth) ==");
const authOnly = await j("GET", "/admin/audit?category=auth&limit=50", null, T);
ok(authOnly.status === 200 && authOnly.data.entries.every((e) => e.action.startsWith("auth.")), "category=auth → only auth.* actions");

console.log("== 6. search by actor email ==");
const srch = await j("GET", "/admin/audit?q=" + encodeURIComponent("admin@octasec.ai") + "&limit=50", null, T);
ok(srch.status === 200 && srch.data.entries.length > 0 && srch.data.entries.every((e) => /admin@octasec\.ai/i.test(e.actorEmail + e.targetLabel + e.action)), "search matches admin@octasec.ai");

console.log("== 7. admin login entry resolved actor email (JWT has no email) ==");
const loginEntry = all.data.entries.find((e) => e.action === "auth.login" && e.actorEmail === "admin@octasec.ai");
ok(!!loginEntry, "auth.login entry shows actorEmail=admin@octasec.ai (looked up)");

console.log("== 8. company.create + user.create audited ==");
const comp = await j("POST", "/admin/companies", { name: "AuditTest " + uniq, adminName: "AT Admin", adminEmail: "atadmin-" + uniq + "@x.com", adminPassword: "atadmin12345" }, T);
ok(comp.status === 201, "company created → 201");
const companyId = comp.data.company.id;
const afterCreate = await j("GET", "/admin/audit?category=company&limit=20", null, T);
ok(afterCreate.data.entries.some((e) => e.action === "company.create" && e.targetLabel === "AuditTest " + uniq), "company.create logged with name");
const userCat = await j("GET", "/admin/audit?category=user&limit=20", null, T);
ok(userCat.data.entries.some((e) => e.action === "user.create" && e.targetLabel === "atadmin-" + uniq + "@x.com"), "user.create logged for the new admin");

console.log("== 9. suspend + activate audited distinctly ==");
await j("PATCH", "/admin/companies/" + companyId, { status: "suspended" }, T);
await j("PATCH", "/admin/companies/" + companyId, { status: "active" }, T);
const compCat = await j("GET", "/admin/audit?category=company&limit=20", null, T);
ok(compCat.data.entries.some((e) => e.action === "company.suspend" && e.targetId === companyId), "company.suspend logged");
ok(compCat.data.entries.some((e) => e.action === "company.activate" && e.targetId === companyId), "company.activate logged");

console.log("== 10. no meta leaks secrets ==");
// no secret-named keys, and no real secret VALUES (passwords used in this run, bcrypt hashes, JWTs)
const KNOWN_SECRETS = ["admin12345", "atadmin12345", "wrongwrong"];
const anyMetaBad = all.data.entries.concat(afterCreate.data.entries).some((e) => {
  const meta = e.meta || {};
  if (Object.keys(meta).some((k) => /pass|hash|secret|token|cookie|authorization/i.test(k))) return true;
  const s = JSON.stringify(meta);
  return KNOWN_SECRETS.some((x) => s.includes(x)) || /\$2[aby]\$\d\d\$/.test(s) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(s);
});
ok(!anyMetaBad, "no entry's meta carries secret keys or secret values");

console.log("== 11. audit log is append-only (no delete/patch route) ==");
const anyEntry = all.data.entries[0];
const delTry = await j("DELETE", "/admin/audit/" + (anyEntry?.id || "x"), null, T);
ok(delTry.status === 404, "DELETE /admin/audit/:id → 404 (route does not exist)");
const patchTry = await j("PATCH", "/admin/audit/" + (anyEntry?.id || "x"), { action: "x" }, T);
ok(patchTry.status === 404, "PATCH /admin/audit/:id → 404 (route does not exist)");

console.log("== 12. non-super-admin cannot read the audit log ==");
const clientLogin = await j("POST", "/auth/login", { email: "dash@demo.com", password: "dash12345" });
if (clientLogin.data.token) {
  const forbidden = await j("GET", "/admin/audit", null, clientLogin.data.token);
  ok(forbidden.status === 403, "client GET /admin/audit → 403");
} else { ok(false, "could not log in dash@demo.com to test role guard"); }

console.log("== 13. bad filter param (NoSQL-shaped) rejected ==");
const badParam = await j("GET", "/admin/audit?category[$ne]=x", null, T);
ok(badParam.status === 400, "object-shaped category → 400");

console.log("== cleanup ==");
const del = await j("DELETE", "/admin/companies/" + companyId, null, T);
ok(del.status === 200, "test company deleted");
const delAudit = await j("GET", "/admin/audit?category=company&limit=5", null, T);
ok(delAudit.data.entries.some((e) => e.action === "company.delete" && e.targetId === companyId), "company.delete itself audited");

console.log(`\n== RESULT: ${pass} passed, ${fail} failed ==`);
process.exit(fail ? 1 : 0);
