// Phase P1/P2: organisation profiles (company, client, self-serve). Spec: tests/specs/profiles.spec.md
import { J, token, chk, done, activate } from "./lib.mjs";

const ts = Date.now();
const FULL = {
  legalName: "Octagram Limited", tradeName: "Octagram", regNo: "TRAD/DSCC/123456", taxId: "BIN-000123456",
  industry: "software_saas", size: "51-200", website: "https://octagramltd.com",
  country: "BD", city: "Dhaka", address: "House 1, Road 2, Gulshan", timezone: "Asia/Dhaka",
  contacts: {
    primary: { name: "Hassan", title: "MD", email: "md@octagram.test", phone: "+8801711000000" },
    technical: { name: "Tech Lead", title: "CTO", email: "cto@octagram.test", phone: "+8801711000001" },
    security: { name: "SOC", title: "Security", email: "soc@octagram.test", phone: "+8801711000002" },
    billing: { name: "Accounts", title: "Finance", email: "ap@octagram.test", phone: "" },
  },
  compliance: ["iso27001", "bb_ict"], dataTypes: ["pii", "financial"], reportLanguage: "en", notifyCritical: true, notes: "VIP",
};
const withP = (patch) => ({ profile: { ...FULL, ...patch } });
const withC = (kind, patch) => ({ profile: { ...FULL, contacts: { ...FULL.contacts, [kind]: { ...FULL.contacts[kind], ...patch } } } });

const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const emp = await token("emp@demo.com", "emp12345");
const cli = await token("client@demo.com", "client12345");

console.log("--- company profile: happy path ---");
const put = await J("PATCH", "/company/profile", { profile: FULL }, ca);
chk("save full profile 200", put.status, 200);
const got = (await J("GET", "/company/profile", null, ca)).j;
chk("legal name round-trips", got.profile?.legalName, FULL.legalName);
chk("security contact phone round-trips", got.profile?.contacts?.security?.phone, "+8801711000002");
chk("compliance round-trips", got.profile?.compliance?.join(","), "iso27001,bb_ict");
chk("completeness 100%", got.completeness?.pct, 100);
chk("company display name = trade name", got.company?.name, "Octagram");

console.log("--- validation ---");
const bad = async (name, body) => chk(name, (await J("PATCH", "/company/profile", body, ca)).status, 400);
await bad("missing legal name", withP({ legalName: "" }));
await bad("missing industry", withP({ industry: "" }));
await bad("primary contact without email", withC("primary", { email: "" }));
chk("legal name 160 chars ok", (await J("PATCH", "/company/profile", withP({ legalName: "L".repeat(160) }), ca)).status, 200);
await bad("legal name 161 chars", withP({ legalName: "L".repeat(161) }));
chk("notes 1000 chars ok", (await J("PATCH", "/company/profile", withP({ notes: "n".repeat(1000) }), ca)).status, 200);
await bad("notes 1001 chars", withP({ notes: "n".repeat(1001) }));
await bad("invalid industry", withP({ industry: "banana" }));
await bad("invalid size", withP({ size: "huge" }));
await bad("invalid compliance", withP({ compliance: ["iso9001"] }));
await bad("invalid email", withC("technical", { email: "not-an-email" }));
await bad("invalid phone", withC("security", { phone: "call me" }));
await bad("javascript: website", withP({ website: "javascript:alert(1)" }));
await bad("ftp website", withP({ website: "ftp://octagram.test" }));
await bad("operator object in string", withP({ legalName: { $gt: "" } }));
await bad("country not ISO-2", withP({ country: "bangladesh" }));
await bad("profile missing", {});
const extra = await J("PATCH", "/company/profile", withP({ hacker: "x", isAdmin: true }), ca);
chk("unknown keys accepted but dropped", extra.status === 200 && extra.j.profile.hacker === undefined && extra.j.profile.isAdmin === undefined, true);
await J("PATCH", "/company/profile", { profile: FULL }, ca);

console.log("--- company profile authz ---");
chk("employee can read 200", (await J("GET", "/company/profile", null, emp)).status, 200);
chk("employee cannot edit 403", (await J("PATCH", "/company/profile", { profile: FULL }, emp)).status, 403);
chk("client cannot read company profile 403", (await J("GET", "/company/profile", null, cli)).status, 403);

console.log("--- super admin: company with profile ---");
const nc = await J("POST", "/admin/companies", { name: "Profiled " + ts, adminName: "PA", adminEmail: `pa${ts}@test.com`, profile: { ...FULL, legalName: "Profiled Ltd " + ts, tradeName: "" } }, admin);
chk("create company with profile 201", nc.status, 201);
const ncId = nc.j.company.id;
chk("create with bad profile 400", (await J("POST", "/admin/companies", { name: "X", adminEmail: `x${ts}@test.com`, adminPassword: "xxxxxxxx", profile: { industry: "banana" } }, admin)).status, 400);
const det = await J("GET", `/admin/companies/${ncId}`, null, admin);
chk("company detail 200", det.status, 200);
chk("detail has profile", det.j.profile?.legalName, "Profiled Ltd " + ts);
chk("detail lists its admin", det.j.users?.length, 1);
chk("detail has counts", typeof det.j.counts?.domains, "number");
const ed = await J("PATCH", `/admin/companies/${ncId}/profile`, { profile: { ...FULL, legalName: "Renamed Ltd", tradeName: "" } }, admin);
chk("super admin edits profile 200", ed.status, 200);
chk("company renamed from legal name", ed.j.company.name, "Renamed Ltd");
const listed = (await J("GET", "/admin/companies", null, admin)).j.companies.find((c) => c.id === ncId);
chk("list shows industry", listed?.industry, "software_saas");
chk("list shows profile %", listed?.profilePct, 100);
chk("company_admin cannot read company detail 403", (await J("GET", `/admin/companies/${ncId}`, null, ca)).status, 403);

console.log("--- clients with profile + authorisation ---");
const CLIENT = { ...FULL, legalName: "Northwind Traders Ltd", tradeName: "Northwind", industry: "ecommerce_retail" };
const AUTH = { onFile: true, authorizerName: "Rahim Uddin", authorizerTitle: "CEO", documentRef: "LoA-2026-014", validUntil: "2027-12-31" };
const nw = await J("POST", "/clients", { profile: CLIENT, authorization: AUTH }, emp);
chk("employee creates client with profile 201", nw.status, 201);
const nwId = nw.j.client._id;
const row = (await J("GET", "/clients", null, ca)).j.clients.find((c) => c._id === nwId);
chk("list shows industry", row?.industry, "ecommerce_retail");
chk("list shows primary contact", row?.primaryContact?.email, "md@octagram.test");
chk("list shows authorisation valid", row?.authorization, "valid");
const one = await J("GET", `/clients/${nwId}`, null, ca);
chk("client detail 200", one.status, 200);
chk("client detail authorizer", one.j.client.authorization.authorizerName, "Rahim Uddin");
chk("client detail state", one.j.client.authorizationState, "valid");
chk("inactive status 200", (await J("PATCH", `/clients/${nwId}`, { status: "inactive" }, ca)).j.client.status, "inactive");
chk("bad status 400", (await J("PATCH", `/clients/${nwId}`, { status: "deleted" }, ca)).status, 400);
chk("bad validUntil 400", (await J("PATCH", `/clients/${nwId}`, { authorization: { ...AUTH, validUntil: "soon" } }, ca)).status, 400);
chk("onFile without authoriser 400", (await J("POST", "/clients", { profile: CLIENT, authorization: { onFile: true } }, ca)).status, 400);
chk("client with bad profile 400", (await J("POST", "/clients", { profile: { ...CLIENT, industry: "" } }, ca)).status, 400);
const keep = await J("PATCH", `/clients/${nwId}`, { status: "active" }, ca);
chk("status-only patch keeps authorisation", keep.j.client.authorization.onFile, true);
chk("legacy name-only create 201", (await J("POST", "/clients", { name: "Legacy Co " + ts }, ca)).status, 201);
const other = await activate(`pa${ts}@test.com`, "profiled123", "profiled456");
chk("other company cannot read client 404", (await J("GET", `/clients/${nwId}`, null, other)).status, 404);
chk("other company cannot edit client 404", (await J("PATCH", `/clients/${nwId}`, { status: "inactive" }, other)).status, 404);
chk("bad client id 400", (await J("GET", "/clients/xyz", null, ca)).status, 400);

console.log("--- self-serve client profile ---");
chk("client reads own profile 200", (await J("GET", "/auth/profile", null, cli)).status, 200);
const sp = await J("PATCH", "/auth/profile", { profile: { ...FULL, legalName: "Acme io Ltd", tradeName: "" } }, cli);
chk("client saves profile 200", sp.status, 200);
chk("client orgName follows legal name", sp.j.user.orgName, "Acme io Ltd");
chk("client profile completeness 100", (await J("GET", "/auth/profile", null, cli)).j.completeness.pct, 100);
chk("client bad profile 400", (await J("PATCH", "/auth/profile", { profile: { ...FULL, website: "javascript:x" } }, cli)).status, 400);
chk("company user cannot use /auth/profile 403", (await J("PATCH", "/auth/profile", { profile: FULL }, ca)).status, 403);

console.log("--- audit ---");
const acts = (await J("GET", "/admin/audit?limit=200", null, admin)).j.entries.map((e) => e.action);
for (const a of ["company.profile_update", "client.create", "client.update", "profile.update"]) chk(`audit has ${a}`, acts.includes(a), true);

await done("PROFILES");
