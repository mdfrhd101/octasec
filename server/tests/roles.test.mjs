const B = process.env.API_BASE || "http://127.0.0.1:5050/api";
const J = async (m, p, body, tok) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
};
const login = async (e, p) => (await J("POST", "/auth/login", { email: e, password: p })).j.token;
let pass = 0, fail = 0;
const chk = (n, got, want) => { if (got === want) pass++; else { console.log(`  FAIL ${n}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); fail++; } };

// roles
const adminTok = await login("admin@octasec.ai", "admin12345");
const caTok = await login("corp@demo.com", "corp12345");
const empTok = await login("emp@demo.com", "emp12345");
const cliTok = await login("client@demo.com", "client12345");
chk("super_admin role", (await J("GET", "/auth/me", null, adminTok)).j.user.role, "super_admin");
chk("company_admin role", (await J("GET", "/auth/me", null, caTok)).j.user.role, "company_admin");
chk("employee role", (await J("GET", "/auth/me", null, empTok)).j.user.role, "employee");
chk("client role", (await J("GET", "/auth/me", null, cliTok)).j.user.role, "client");

// super_admin stats (was admin)
chk("super_admin /admin/stats 200", (await J("GET", "/admin/stats", null, adminTok)).status, 200);
chk("company_admin denied /admin/stats 403", (await J("GET", "/admin/stats", null, caTok)).status, 403);

// company sharing: company_admin creates a client + a self domain; employee of SAME company sees them
const cl = await J("POST", "/clients", { name: "Northwind Ltd" }, caTok);
chk("company_admin create client 201", cl.status, 201);
const empSeesClients = await J("GET", "/clients", null, empTok);
chk("employee sees company's clients", empSeesClients.j.clients.length >= 1, true);

const dom = await J("POST", "/domains", { name: "company-shared.com", ownerType: "self" }, caTok);
chk("company_admin create domain 201", dom.status, 201);
const empDomains = await J("GET", "/domains?owner=all", null, empTok);
chk("employee sees company's domain (shared)", empDomains.j.domains.some((d) => d.name === "company-shared.com"), true);

// client (self-serve) does NOT see the company's domain
const cliDomains = await J("GET", "/domains?owner=all", null, cliTok);
chk("client does NOT see company domain", cliDomains.j.domains.some((d) => d.name === "company-shared.com"), false);

// client has no /clients access
chk("client denied /clients 403", (await J("GET", "/clients", null, cliTok)).status, 403);

// dashboard works for each role
chk("company_admin dashboard 200", (await J("GET", "/dashboard", null, caTok)).status, 200);
chk("employee dashboard 200", (await J("GET", "/dashboard", null, empTok)).status, 200);
chk("super_admin dashboard 200", (await J("GET", "/dashboard", null, adminTok)).status, 200);

console.log(`\nPHASE 1 (roles + company scoping): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
