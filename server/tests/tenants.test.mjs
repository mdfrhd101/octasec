import { activate } from "./lib.mjs";
const B = process.env.API_BASE || "http://127.0.0.1:5050/api";
const J = async (m, p, body, tok) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
};
const login = async (e, p) => (await J("POST", "/auth/login", { email: e, password: p })).j.token;
let pass = 0, fail = 0;
const chk = (n, got, want) => { if (got === want) pass++; else { console.log(`  FAIL ${n}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); fail++; } };

const admin = await login("admin@octasec.ai", "admin12345");
const ca = await login("corp@demo.com", "corp12345");
const emp = await login("emp@demo.com", "emp12345");
const cli = await login("client@demo.com", "client12345");

// ---- Phase 2: employees ----
const ts = Date.now();
const add = await J("POST", "/company/employees", { email: `newemp${ts}@demo.com`, name: "New Emp", phone: "+880" }, ca);
chk("company_admin add employee 201", add.status, 201);
const empList = await J("GET", "/company/employees", null, ca);
chk("company_admin lists employees", empList.j.employees.length >= 3, true);
chk("employee CANNOT list employees 403", (await J("GET", "/company/employees", null, emp)).status, 403);
chk("employee CANNOT add employee 403", (await J("POST", "/company/employees", { email: "x@y.com", password: "xxxxxxxx" }, emp)).status, 403);
// new employee can log in and sees the company's data
const newTok = await activate(`newemp${ts}@demo.com`, "emp12345", "emp67890");
chk("new employee login works", typeof newTok === "string", true);
chk("new employee sees company clients", (await J("GET", "/clients", null, newTok)).status, 200);

// ---- Phase 3: tickets ----
const t = await J("POST", "/tickets", { subject: "Scan stuck", body: "Our scan is stuck on api.acme.io", priority: "high" }, ca);
chk("company_admin opens ticket 201", t.status, 201);
const tid = t.j.ticket._id;
chk("employee can also open ticket 201", (await J("POST", "/tickets", { subject: "Q2", body: "another" }, emp)).status, 201);
chk("client CAN open own ticket 201", (await J("POST", "/tickets", { subject: "x", body: "y" }, cli)).status, 201);
chk("super_admin sees all tickets (>=2)", (await J("GET", "/tickets", null, admin)).j.tickets.length >= 2, true);
chk("company sees own tickets", (await J("GET", "/tickets", null, ca)).j.tickets.length >= 2, true);
// super admin replies -> status in_progress
const reply = await J("POST", `/tickets/${tid}/messages`, { body: "Looking into it." }, admin);
chk("super_admin reply 200", reply.status, 200);
chk("ticket now in_progress", reply.j.ticket.status, "in_progress");
// super admin resolves
chk("super_admin sets resolved", (await J("PATCH", `/tickets/${tid}`, { status: "resolved" }, admin)).j.ticket.status, "resolved");
chk("company_admin CANNOT patch status 403", (await J("PATCH", `/tickets/${tid}`, { status: "closed" }, ca)).status, 403);
// a DIFFERENT company cannot see this ticket — client has no company; test cross: client gets 404 on the ticket
chk("client cannot view company ticket 404", (await J("GET", `/tickets/${tid}`, null, cli)).status, 404);

// ---- Phase 4: super-admin companies ----
const comps = await J("GET", "/admin/companies", null, admin);
chk("super_admin companies 200", comps.status, 200);
chk("companies have counts", typeof comps.j.companies[0].employees === "number", true);
chk("company_admin denied /admin/companies 403", (await J("GET", "/admin/companies", null, ca)).status, 403);
const stats = await J("GET", "/admin/stats", null, admin);
chk("admin stats has companies+openTickets", typeof stats.j.companies === "number" && typeof stats.j.openTickets === "number", true);

console.log(`\nPHASE 2-4 (employees, tickets, super-admin): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
