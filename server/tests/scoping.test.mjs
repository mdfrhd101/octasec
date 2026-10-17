// Phase P3: client authorisation rule + scoping questionnaire. Spec: tests/specs/profiles.spec.md
import mongoose from "mongoose";
import { J, token, chk, done, db, engagementBody, SCOPING } from "./lib.mjs";

const ts = Date.now();
const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const conn = await db();
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const PROFILE = { legalName: "Scope Client", industry: "banking_finance", country: "BD", contacts: { primary: { name: "Owner", email: "owner@scope.test" } } };
async function clientWith(label, authorization, status = "active") {
  const c = await J("POST", "/clients", { profile: { ...PROFILE, legalName: `${label} ${ts}` }, authorization, status }, ca);
  const d = await J("POST", "/domains", { name: `${label.toLowerCase()}-${ts}.com`, ownerType: "client", clientId: c.j.client._id }, ca);
  await conn.collection("domains").updateOne({ _id: oid(d.j.domain._id) }, { $set: { verified: true, verifiedAt: new Date() } });
  return d.j.domain._id;
}
const VALID = { onFile: true, authorizerName: "Client CEO", authorizerTitle: "CEO", documentRef: "LoA-1", validUntil: day(365) };

console.log("--- client authorisation rule ---");
const noAuth = await clientWith("Noauth", undefined);
const expired = await clientWith("Expired", { ...VALID, validUntil: day(-1) });
const inactive = await clientWith("Inactive", VALID, "inactive");
const good = await clientWith("Good", VALID);
const r1 = await J("POST", "/engagements", engagementBody(noAuth), ca);
chk("no authorisation on file -> 409", r1.status, 409);
chk("message tells what to do", /authorisation/i.test(r1.j?.error || ""), true);
chk("expired authorisation -> 409", (await J("POST", "/engagements", engagementBody(expired), ca)).status, 409);
chk("inactive client -> 409", (await J("POST", "/engagements", engagementBody(inactive), ca)).status, 409);
const ok = await J("POST", "/engagements", engagementBody(good), ca);
chk("valid authorisation -> 201", ok.status, 201);

console.log("--- scoping questionnaire validation ---");
const bad = async (name, scoping, roe) => chk(name, (await J("POST", "/engagements", engagementBody(good, { ...(scoping ? { scoping } : {}), ...(roe ? { roe } : {}) }), ca)).status, 400);
chk("scoping absent -> 400", (await J("POST", "/engagements", { ...engagementBody(good), scoping: undefined }, ca)).status, 400);
await bad("missing test type", { ...SCOPING, testType: "" });
await bad("bad environment", { ...SCOPING, environment: "prod-ish" });
await bad("no target types", { ...SCOPING, targetTypes: [] });
await bad("bad target type", { ...SCOPING, targetTypes: ["satellite"] });
await bad("missing start date", { ...SCOPING, preferredStart: "" });
await bad("deadline before start", { ...SCOPING, deadline: "2026-10-01" });
await bad("bad objective", { ...SCOPING, objective: "fun" });
await bad("emergency phone missing", { ...SCOPING, emergencyContact: { name: "X" } });
await bad("api docs javascript url", { ...SCOPING, apiDocsUrl: "javascript:alert(1)" });
await bad("user roles out of range", { ...SCOPING, userRoles: 51 });
await bad("missing authoriser", null, { intensity: "standard", authorized: true, authorizerName: "", authorizerTitle: "CTO" });

console.log("--- stored + visible to operator ---");
const detail = await J("GET", `/admin/engagements/${ok.j.engagement.id}`, null, admin);
chk("operator sees environment", detail.j.engagement?.scoping?.environment, "staging");
chk("operator sees target types", detail.j.engagement?.scoping?.targetTypes?.join(","), "web_app,api");
chk("operator sees emergency contact", detail.j.engagement?.scoping?.emergencyContact?.phone, "+8801700000000");
chk("operator sees authoriser", detail.j.engagement?.roe?.authorizerName, "Test Owner");
chk("client id recorded", !!detail.j.engagement?.clientId, true);
chk("second open request on the same domain -> 409", (await J("POST", "/engagements", engagementBody(good), ca)).status, 409);
await J("POST", `/engagements/${ok.j.engagement.id}/cancel`, null, ca);
const credTry = await J("POST", "/engagements", engagementBody(good, { scoping: { ...SCOPING, password: "hunter2" } }), ca);
const stored = await conn.collection("engagements").findOne({ _id: oid(credTry.j.engagement.id) });
chk("stray credential field never stored", JSON.stringify(stored).includes("hunter2"), false);
const acts = (await J("GET", "/admin/audit?category=engagement&limit=50", null, admin)).j.entries.map((e) => e.action);
chk("audit has engagement.request", acts.includes("engagement.request"), true);

await done("SCOPING");
