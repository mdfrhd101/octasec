// SA-13: per-account login throttle + engine callback ordering (own suite: uses the auth rate budget).
import crypto from "node:crypto";
import mongoose from "mongoose";
import { BASE, J, login, chk, done, db } from "./lib.mjs";

const email = "lock" + Date.now() + "@nobody.test";
let last;
for (let i = 0; i < 10; i++) last = await login(email, "wrong-" + i);
chk("10 failures → still 401", last.status, 401);
const locked = await login(email, "wrong-final");
chk("11th attempt for that account → 429", locked.status, 429);
chk("other accounts unaffected", (await login("client@demo.com", "client12345")).status, 200);

console.log("--- SA-06: callback replay / backwards state ---");
const conn = await db();
const e = await conn.collection("engagements").findOne({ status: "delivered" });
const jobId = "job-order-" + Date.now();
await conn.collection("engagements").updateOne({ _id: e._id }, { $set: { status: "in_progress", "engine.state": "running", "engine.jobId": jobId, "engine.lastEventTs": 0 } });
const send = async (body, ts) => {
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac("sha256", process.env.ENGINE_WEBHOOK_SECRET).update(`${ts}.`).update(raw).digest("hex");
  return (await fetch(BASE + "/engine/callback", { method: "POST", headers: { "Content-Type": "application/json", "X-OctaSec-Timestamp": String(ts), "X-OctaSec-Signature": "sha256=" + sig }, body: raw })).status;
};
const now = Math.floor(Date.now() / 1000);
chk("progress event 200", await send({ jobId, state: "running", progress: 50 }, now), 200);
chk("older (replayed) event 409", await send({ jobId, state: "running", progress: 10 }, now - 30), 409);
chk("backwards state running → queued 409", await send({ jobId, state: "queued" }, now + 1), 409);
await conn.collection("engagements").updateOne({ _id: e._id }, { $set: { status: "delivered" } });

await done("LOCKOUT + CALLBACK ORDER");
