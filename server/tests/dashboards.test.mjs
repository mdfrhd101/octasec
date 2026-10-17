// Phase P5: role dashboards. Spec: tests/specs/profiles.spec.md §Dashboards
import { J, token, chk, done } from "./lib.mjs";

const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const emp = await token("emp@demo.com", "emp12345");
const dash = await token("dash@demo.com", "dash12345");
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// a client whose authorisation expires in 10 days -> must show in expiringAuth
const PROFILE = { legalName: "Expiring Soon Ltd " + Date.now(), industry: "telecom", country: "BD", contacts: { primary: { name: "O", email: "o@exp.test" } } };
const exp = await J("POST", "/clients", { profile: PROFILE, authorization: { onFile: true, authorizerName: "A", authorizerTitle: "B", validUntil: day(10) } }, ca);

console.log("--- super admin ops ---");
const a = (await J("GET", "/dashboard", null, admin)).j;
chk("ops present", !!a.ops, true);
chk("queue.requested number", typeof a.ops?.queue?.requested, "number");
chk("queue.oldest list", Array.isArray(a.ops?.queue?.oldest), true);
chk("pipeline deliveredThisMonth", typeof a.ops?.pipeline?.deliveredThisMonth, "number");
chk("tickets by priority", typeof a.ops?.tickets?.urgent, "number");
chk("leads last 7d", typeof a.ops?.leads?.last7d, "number");
chk("tenants at risk list", Array.isArray(a.ops?.tenantsAtRisk), true);
chk("onboarding gaps", typeof a.ops?.onboarding?.clientsWithoutAuthorization, "number");
chk("security events list", Array.isArray(a.ops?.securityEvents), true);
chk("totals companies", typeof a.ops?.totals?.companies, "number");
chk("posture still present", typeof a.score, "number");

console.log("--- company admin ---");
const c = (await J("GET", "/dashboard", null, ca)).j;
chk("no ops for company", c.ops, undefined);
chk("clients risk rows", Array.isArray(c.clients) && c.clients.length > 0, true);
chk("client row has authorisation", typeof c.clients?.[0]?.authorization, "string");
chk("client row has critical count", typeof c.clients?.[0]?.critical, "number");
chk("expiring authorisation listed", c.expiringAuth?.some((x) => x.id === exp.j.client._id), true);
chk("profile completeness", typeof c.profile?.pct, "number");
chk("pipeline", typeof c.pipeline?.requested, "number");
chk("stale domains list", Array.isArray(c.stale), true);
chk("open tickets", typeof c.openTickets, "number");

console.log("--- employee ---");
const e = (await J("GET", "/dashboard", null, emp)).j;
chk("employee sees company clients", Array.isArray(e.clients), true);
chk("employee myRequests", typeof e.myRequests, "object");

console.log("--- self-serve client ---");
const d = (await J("GET", "/dashboard", null, dash)).j;
chk("client pipeline", typeof d.pipeline?.delivered, "number");
chk("client profile completeness", typeof d.profile?.pct, "number");
chk("client unverified count", typeof d.unverified, "number");
chk("client sees no company clients", d.clients, undefined);
chk("client sees no ops", d.ops, undefined);

await done("DASHBOARDS");
