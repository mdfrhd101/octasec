// Contact form + pricing-page quote requests → Super Admin leads. Spec: docs/PRICING_PAGE.md
import { J, token, chk, done } from "./lib.mjs";

const ts = Date.now();
const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const leads = async (q = "") => (await J("GET", "/admin/leads" + q, null, admin)).j.leads;

console.log("--- pricing quote request ---");
const q = await J("POST", "/contact", { name: "Quote Person", email: `quote${ts}@test.com`, company: "Acme", target: "API", source: "pricing", plan: "continuous", scope: "6-20", message: "Weekly API releases" });
chk("quote request 201", q.status, 201);
const ql = (await leads()).find((l) => l.email === `quote${ts}@test.com`);
chk("source recorded", ql?.source, "pricing");
chk("plan recorded", ql?.plan, "continuous");
chk("scope recorded", ql?.scope, "6-20");
chk("status starts new", ql?.status, "new");
chk("filter by source=pricing", (await leads("?source=pricing")).every((l) => l.source === "pricing"), true);

console.log("--- coercion + legacy form ---");
await J("POST", "/contact", { name: "Odd", email: `odd${ts}@test.com`, source: "evil", plan: { $ne: "" }, scope: "1000" });
const odd = (await leads()).find((l) => l.email === `odd${ts}@test.com`);
chk("unknown source → contact", odd?.source, "contact");
chk("object plan → empty", odd?.plan, "");
chk("unknown scope → empty", odd?.scope, "");
await J("POST", "/contact", { name: "Classic", email: `classic${ts}@test.com`, target: "Web app", message: "hi" });
chk("contact page form still works (source contact)", (await leads()).find((l) => l.email === `classic${ts}@test.com`)?.source, "contact");

console.log("--- abuse controls ---");
const hp = await J("POST", "/contact", { name: "Bot", email: `bot${ts}@test.com`, website: "http://spam" });
chk("honeypot replies ok", hp.status, 200);
chk("honeypot stores nothing", (await leads()).some((l) => l.email === `bot${ts}@test.com`), false);
chk("bad email 400", (await J("POST", "/contact", { name: "x", email: "not-an-email", source: "pricing" })).status, 400);
chk("missing name 400", (await J("POST", "/contact", { email: `n${ts}@test.com`, source: "pricing" })).status, 400);
chk("company admin cannot read leads 403", (await J("GET", "/admin/leads", null, ca)).status, 403);
chk("anonymous cannot read leads 401", (await J("GET", "/admin/leads")).status, 401);

await done("LEADS (contact + pricing)");
