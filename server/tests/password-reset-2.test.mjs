// Forgot password, part 2. Spec: tests/specs/password-reset.spec.md
import fs from "node:fs";
import mongoose from "mongoose";
import { J, login, token, chk, done, db, registerVerified } from "./lib.mjs";

const OUTBOX = process.env.MAIL_DEV_OUTBOX;
const ts = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mails = (to) => {
  try { return fs.readFileSync(OUTBOX, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.to === to && /^Reset your/.test(m.subject)); }
  catch { return []; }
};
// the API replies before it sends; give the mail a moment to land
async function waitMails(to, n) { for (let i = 0; i < 30; i++) { if (mails(to).length >= n) break; await sleep(100); } return mails(to); }
const linkToken = (m) => (m.text.match(/reset-password#token=([A-Za-z0-9_-]+)/) || [])[1];
const forgot = (email) => J("POST", "/auth/forgot-password", { email });
const reset = (t, p) => J("POST", "/auth/reset-password", { token: t, newPassword: p });

const conn = await db();
const admin = await token("admin@octasec.ai", "admin12345");
console.log("--- expiry, disabled, mustChangePassword ---");
const reg2 = { j: await registerVerified(`exp${ts}@test.com`, "original123") };
await forgot(`exp${ts}@test.com`);
const te = linkToken((await waitMails(`exp${ts}@test.com`, 1))[0]);
await conn.collection("passwordresets").updateMany({ userId: new mongoose.Types.ObjectId(reg2.j.user._id) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
chk("expired token 400", (await reset(te, "brandnew123")).status, 400);
await J("PATCH", `/admin/users/${reg2.j.user._id}`, { status: "disabled" }, admin);
await forgot(`exp${ts}@test.com`);
await sleep(800);
chk("disabled account gets no email", mails(`exp${ts}@test.com`).length, 1);
await J("PATCH", `/admin/users/${reg2.j.user._id}`, { status: "active" }, admin);
const ar = await J("POST", `/admin/users/${reg2.j.user._id}/reset-password`, null, admin);
await forgot(`exp${ts}@test.com`);
const tm = linkToken((await waitMails(`exp${ts}@test.com`, 2))[1]);
chk("reset after admin reset 200", (await reset(tm, "selfchosen123")).status, 200);
chk("mustChangePassword cleared", (await login(`exp${ts}@test.com`, "selfchosen123")).j.user.mustChangePassword, false);
chk("admin reset returns no password", ar.j.tempPassword, undefined);
chk("original password no longer works", (await login(`exp${ts}@test.com`, "original123")).status, 401);

console.log("--- audit ---");
const entries = (await J("GET", "/admin/audit?category=auth&limit=200", null, admin)).j.entries;
const acts = entries.map((e) => e.action);
chk("audit auth.reset_request", acts.includes("auth.reset_request"), true);
chk("audit auth.reset_complete", acts.includes("auth.reset_complete"), true);
chk("no reset token in any audit entry", /token=|[A-Za-z0-9_-]{43}/.test(JSON.stringify(entries.map((e) => e.meta))), false);

await done("PASSWORD RESET (expiry, disabled, admin reset, audit)");
