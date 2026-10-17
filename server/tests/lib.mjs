// Shared helpers for the API suites. The runner (run.mjs) sets API_BASE and
// MONGO_URI to an isolated test API + database.
import mongoose from "mongoose";

export const BASE = process.env.API_BASE || "http://127.0.0.1:5050/api";

export async function J(method, path, body, tok) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
}

export const login = (email, password) => J("POST", "/auth/login", { email, password });
export const token = async (email, password) => (await login(email, password)).j?.token;

let pass = 0, fail = 0;
export function chk(name, got, want) {
  if (got === want) pass++;
  else { fail++; console.log(`  FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
}
export function done(label) {
  console.log(`\n${label}: ${pass} passed, ${fail} failed`);
  return mongoose.connection.readyState ? mongoose.disconnect().then(() => process.exit(fail ? 1 : 0)) : process.exit(fail ? 1 : 0);
}

// direct DB access for state the API deliberately cannot create (e.g. a verified domain)
export async function db() {
  if (!mongoose.connection.readyState) await mongoose.connect(process.env.MONGO_URI);
  return mongoose.connection;
}

// a complete, valid scan request body (scoping questionnaire + signed RoE)
export const SCOPING = {
  testType: "grey", environment: "staging", targetTypes: ["web_app", "api"], userRoles: 2,
  testAccountsViaSecureChannel: true, preferredStart: "2026-11-01", deadline: "2026-11-20",
  objective: "pre_launch", emergencyContact: { name: "Ops On-call", phone: "+8801700000000" },
};
export const engagementBody = (domainId, extra = {}) => ({
  domainId,
  roe: { intensity: "standard", authorized: true, authorizerName: "Test Owner", authorizerTitle: "CTO" },
  scoping: SCOPING,
  ...extra,
});

/* ---- emailed links (the runner points the dev mailer at MAIL_DEV_OUTBOX) ---- */
import fs from "node:fs";
export function mailsTo(to) {
  try {
    return fs.readFileSync(process.env.MAIL_DEV_OUTBOX, "utf8").trim().split("\n").filter(Boolean)
      .map((l) => JSON.parse(l)).filter((m) => m.to === to);
  } catch { return []; }
}
export const linkToken = (m) => ((m && m.text.match(/(?:reset-password|verify-email)#token=([A-Za-z0-9_-]{43})/)) || [])[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** newest emailed link token for an address (waits briefly: some mails are sent after the reply) */
export async function latestLink(to, minCount = 1) {
  for (let i = 0; i < 40; i++) {
    const m = mailsTo(to).filter((x) => linkToken(x));
    if (m.length >= minCount) return linkToken(m[m.length - 1]);
    await sleep(100);
  }
  return undefined;
}

/** accept the newest invite / admin-reset link for this address and sign in */
export async function activate(email, _unused, newPassword) {
  const t = await latestLink(email);
  await J("POST", "/auth/reset-password", { token: t, newPassword });
  return (await login(email, newPassword)).j?.token;
}

/** self-signup + email confirmation → { token, user } */
export async function registerVerified(email, password, extra = {}) {
  const before = mailsTo(email).length;
  await J("POST", "/auth/register", { email, password, ...extra });
  const t = await latestLink(email, before + 1);
  return (await J("POST", "/auth/verify-email", { token: t })).j;
}

/** the operator verifies every finding of an engagement (the human gate before sign-off) */
export async function reviewAll(id, adminTok, decision = "verified") {
  const e = (await J("GET", `/admin/engagements/${id}`, null, adminTok)).j.engagement;
  for (const f of e.findings || []) await J("POST", `/admin/engagements/${id}/findings/${f._id}`, { decision, note: decision === "rejected" ? "false positive" : "" }, adminTok);
}
