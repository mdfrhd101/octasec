const B = process.env.API_BASE || "http://127.0.0.1:5050/api";
const J = async (m, p, body, tok) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
};
const login = async (e, p) => (await J("POST", "/auth/login", { email: e, password: p })).j?.token;
let pass = 0, fail = 0;
const chk = (n, got, want) => { if (got === want) pass++; else { console.log(`  FAIL ${n}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); fail++; } };

const admin = await login("admin@octasec.ai", "admin12345");
const ca = await login("corp@demo.com", "corp12345");
const emp = await login("emp@demo.com", "emp12345");
const cli = await login("client@demo.com", "client12345");

console.log("--- core roles + company scoping ---");
chk("super_admin role", (await J("GET", "/auth/me", null, admin)).j.user.role, "super_admin");
chk("company_admin role", (await J("GET", "/auth/me", null, ca)).j.user.role, "company_admin");
chk("employee role", (await J("GET", "/auth/me", null, emp)).j.user.role, "employee");
chk("client role", (await J("GET", "/auth/me", null, cli)).j.user.role, "client");
chk("super stats 200", (await J("GET", "/admin/stats", null, admin)).status, 200);
chk("ca denied admin stats 403", (await J("GET", "/admin/stats", null, ca)).status, 403);
// employee shares company data
chk("employee sees company clients 200", (await J("GET", "/clients", null, emp)).status, 200);
chk("client denied /clients 403", (await J("GET", "/clients", null, cli)).status, 403);

console.log("--- FIX: scopeFor fail-closed (client isolation intact) ---");
// client cannot see company domains; company cannot see client's
const caDoms = (await J("GET", "/domains?owner=all", null, ca)).j.domains.map(d=>d.name);
const cliDoms = (await J("GET", "/domains?owner=all", null, cli)).j.domains.map(d=>d.name);
chk("company & client domain sets disjoint", caDoms.some(n=>cliDoms.includes(n)), false);

console.log("--- SSRF + crash guards still hold ---");
chk("SSRF ip-literal 400", (await J("POST", "/domains", { name: "169.254.169.254" }, ca)).status, 400);
chk("bad ObjectId 400 (no crash)", (await J("POST", "/domains/xxx/verify", null, ca)).status, 400);
chk("op-injection query 400", (await J("GET", "/domains?owner[$ne]=x", null, ca)).status, 400);

console.log("--- FIX: ticket thread cap + closed-reply + quota ---");
const t = await J("POST", "/tickets", { subject: "Comprehensive test", body: "msg1", priority: "high" }, ca);
chk("open ticket 201", t.status, 201);
const tid = t.j.ticket._id;
chk("ticket messageCount=1", t.j.ticket.messageCount, 1);
// super admin closes it, then company reply must be rejected
await J("PATCH", `/tickets/${tid}`, { status: "closed" }, admin);
chk("reply on closed -> 409", (await J("POST", `/tickets/${tid}/messages`, { body: "late" }, ca)).status, 409);
// list no longer leaks messages array (returns a number)
const list = await J("GET", "/tickets", null, ca);
chk("ticket list messages is a count", typeof list.j.tickets[0].messages, "number");
// super_admin reply shows "OctaSec Support" not email
const t2 = await J("POST", "/tickets", { subject: "name test", body: "hi" }, emp);
const rep = await J("POST", `/tickets/${t2.j.ticket._id}/messages`, { body: "we are on it" }, admin);
const supMsg = rep.j.ticket.messages.find(m => m.authorRole === "super_admin");
chk("super_admin authorName = OctaSec Support", supMsg?.authorName, "OctaSec Support");

console.log("--- cross-company ticket isolation ---");
chk("client cannot view company ticket 404", (await J("GET", `/tickets/${tid}`, null, cli)).status, 404);
chk("company_admin cannot PATCH status 403", (await J("PATCH", `/tickets/${tid}`, { status: "open" }, ca)).status, 403);

console.log("--- employee mgmt authz ---");
chk("employee cannot list staff 403", (await J("GET", "/company/employees", null, emp)).status, 403);
chk("ca lists staff 200", (await J("GET", "/company/employees", null, ca)).status, 200);

console.log("--- FIX: admin companies aggregation + delete guards ---");
const comps = await J("GET", "/admin/companies", null, admin);
chk("companies have counts", typeof comps.j.companies[0].employees, "number");
chk("super cannot delete self 400", (await J("DELETE", `/admin/users/${(await J("GET","/auth/me",null,admin)).j.user._id}`, null, admin)).status, 400);

console.log(`\nCOMPREHENSIVE: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
