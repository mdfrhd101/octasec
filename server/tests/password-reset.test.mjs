// Forgot password. Spec: tests/specs/password-reset.spec.md
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
const email = `reset${ts}@test.com`;
const reg = await registerVerified(email, "original123", { name: "Reset User" });
const oldJwt = reg.token;

console.log("--- request: no enumeration ---");
const a = await forgot(email);
const b = await forgot(`nobody${ts}@test.com`);
const c = await J("POST", "/auth/forgot-password", { email: { $gt: "" } });
chk("existing account 200", a.status, 200);
chk("unknown account 200", b.status, 200);
chk("object-shaped email 200", c.status, 200);
chk("identical body (existing vs unknown)", JSON.stringify(a.j), JSON.stringify(b.j));
chk("identical body (existing vs malformed)", JSON.stringify(a.j), JSON.stringify(c.j));
const m1 = await waitMails(email, 1);
chk("one email sent to the account", m1.length, 1);
chk("email contains reset link", /\/portal\/reset-password#token=/.test(m1[0]?.text || ""), true);
await sleep(300);
chk("no email for unknown account", mails(`nobody${ts}@test.com`).length, 0);
const t1 = linkToken(m1[0]);
chk("token is 43 chars", t1?.length, 43);
const stored = await conn.collection("passwordresets").find({}).toArray();
chk("raw token never stored", JSON.stringify(stored).includes(t1), false);

console.log("--- newer link invalidates older; throttle ---");
await forgot(email);
const m2 = await waitMails(email, 2);
const t2 = linkToken(m2[1]);
chk("second link differs", t2 !== t1, true);
chk("older link now rejected 400", (await reset(t1, "whatever123")).status, 400);
await forgot(email);
await waitMails(email, 3);
await forgot(email); // 4th within the hour → silently skipped
await sleep(800);
chk("4th request in an hour sends nothing", mails(email).length, 3);
const t3 = linkToken(mails(email)[2]);

console.log("--- reset ---");
chk("short password 400", (await reset(t3, "short")).status, 400);
chk("too long password 400", (await reset(t3, "x".repeat(129))).status, 400);
chk("password = email 400", (await reset(t3, email)).status, 400);
chk("garbage token 400", (await reset("not-a-token", "brandnew123")).status, 400);
chk("object token 400", (await J("POST", "/auth/reset-password", { token: { $ne: "" }, newPassword: "brandnew123" })).status, 400);
const ok = await reset(t3, "brandnew123");
chk("valid reset 200 (token not burned by earlier bad passwords)", ok.status, 200);
chk("login with new password 200", (await login(email, "brandnew123")).status, 200);
chk("old password 401", (await login(email, "original123")).status, 401);
chk("old JWT revoked 401", (await J("GET", "/auth/me", null, oldJwt)).status, 401);
chk("same token again 400", (await reset(t3, "another123")).status, 400);

await done("PASSWORD RESET (request + reset)");
