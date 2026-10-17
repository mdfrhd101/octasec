import { engagementBody, reviewAll } from "./lib.mjs";
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
const client = await login("dash@demo.com", "dash12345"); // self-serve, has verified domain acme.io
const corp = await login("corp@demo.com", "corp12345");

// client requests an engagement on their verified domain
const doms = (await J("GET", "/domains?owner=all", null, client)).j.domains;
const verified = doms.find((d) => d.verified);
console.log("--- tenant requests a scan ---");
chk("has a verified domain to scan", !!verified, true);
const req = await J("POST", "/engagements", engagementBody(verified._id), client);
chk("request engagement 201", req.status, 201);
const eid = req.j.engagement?.id;
chk("status requested", req.j.engagement?.status, "requested");
chk("unauthorized request -> 400", (await J("POST", "/engagements", { domainId: verified._id, roe: { authorized: false } }, client)).status, 400);

console.log("--- tenant sees it; findings hidden until delivered ---");
chk("tenant lists engagements", (await J("GET", "/engagements", null, client)).j.engagements.length >= 1, true);
chk("tenant view: findings hidden pre-delivery", (await J("GET", `/engagements/${eid}`, null, client)).j.engagement.findings.length, 0);
chk("another tenant cannot see it (404)", (await J("GET", `/engagements/${eid}`, null, corp)).status, 404);

console.log("--- super admin operations queue ---");
chk("super admin sees it in queue", (await J("GET", "/admin/engagements?status=open", null, admin)).j.engagements.some((e) => e.id === eid), true);
chk("company_admin denied ops queue 403", (await J("GET", "/admin/engagements", null, corp)).status, 403);

console.log("--- lifecycle: assign -> run -> sign -> delivered ---");
chk("cannot run before assign (409)", (await J("POST", `/admin/engagements/${eid}/run`, null, admin)).status, 409);
chk("assign 200", (await J("POST", `/admin/engagements/${eid}/assign`, null, admin)).j.engagement.status, "assigned");
chk("cannot sign before run (409)", (await J("POST", `/admin/engagements/${eid}/sign`, null, admin)).status, 409);
const run = await J("POST", `/admin/engagements/${eid}/run`, null, admin);
chk("run -> in_progress", run.j.engagement.status, "in_progress");
chk("run generated findings", run.j.engagement.findings.length >= 1, true);
chk("findings unverified before sign", run.j.engagement.findings.every((f) => f.verified === false), true);
chk("cannot sign with findings pending review (409)", (await J("POST", `/admin/engagements/${eid}/sign`, null, admin)).status, 409);
await reviewAll(eid, admin);
const sign = await J("POST", `/admin/engagements/${eid}/sign`, null, admin);
chk("sign -> delivered", sign.j.engagement.status, "delivered");
chk("signedBy set", !!sign.j.engagement.signedByName, true);
chk("findings verified after sign", sign.j.engagement.findings.every((f) => f.verified === true), true);

console.log("--- tenant now sees delivered findings ---");
const delivered = await J("GET", `/engagements/${eid}`, null, client);
chk("tenant sees delivered findings", delivered.j.engagement.findings.length >= 1, true);
chk("tenant cannot run/sign (403)", (await J("POST", `/admin/engagements/${eid}/run`, null, client)).status, 403);
chk("delivered cannot be cancelled by tenant (409)", (await J("POST", `/engagements/${eid}/cancel`, null, client)).status, 409);

console.log("--- stats has openEngagements ---");
chk("stats openEngagements present", typeof (await J("GET", "/admin/stats", null, admin)).j.openEngagements, "number");

console.log(`\nPHASE B (engagements): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
