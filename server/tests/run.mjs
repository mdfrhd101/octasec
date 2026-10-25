// Test runner: `npm test` (from server/).
// Drops + seeds an ISOLATED database, then for each suite starts a fresh API
// process (fresh in-memory rate-limit state) and runs the suite against it.
// Never touches the dev DB: the DB name must contain "test".
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import os from "node:os";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(HERE, "..");
const PORT = process.env.TEST_PORT || "5059";
const MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/octasec_test";
const API_BASE = `http://127.0.0.1:${PORT}/api`;

if (!/test/i.test(new URL(MONGO_URI).pathname)) {
  console.error(`[test] refusing: database in ${MONGO_URI} must be a *test* database`);
  process.exit(1);
}

const SUITES = [
  "roles.test.mjs",
  "tenants.test.mjs",
  "comprehensive.test.mjs",
  "provisioning.test.mjs",
  "engagements.test.mjs",
  "audit.test.mjs",
  "regression.test.mjs",
  "hardening.test.mjs",
  "hardening-2.test.mjs",
  "support-client.test.mjs",
  "profiles.test.mjs",
  "scoping.test.mjs",
  "dashboards.test.mjs",
  "password-reset.test.mjs",
  "password-reset-2.test.mjs",
  "engine.test.mjs",
  "engine-http.test.mjs",
  "security-fixes.test.mjs",
  "website-check.test.mjs",
  "lockout.test.mjs",
  "leads.test.mjs",
  "findings.test.mjs",
  "assets-inventory.test.mjs",
];

const env = {
  ...process.env,
  NODE_ENV: "test",
  ALLOW_SEED: "true", // seed.js requires explicit opt-in; the runner seeds an isolated test DB
  PORT,
  HOST: "127.0.0.1",
  MONGO_URI,
  JWT_SECRET: crypto.randomBytes(32).toString("hex"),
  JWT_EXPIRES: "1h",
  CLIENT_ORIGIN: "http://localhost:5173",
  API_BASE,
  // no SMTP in tests: the dev mailer appends each email here so suites can read links
  MAIL_DEV_OUTBOX: path.join(os.tmpdir(), `octasec-test-outbox-${process.pid}.jsonl`),
  SMTP_HOST: "",
  CONTACT_NOTIFY_TO: "ops@octasec.test", // set, but SMTP absent → notify is skipped; contact still 201

  ENGINE_DRIVER: "mock",
  ENGINE_WEBHOOK_SECRET: crypto.randomBytes(32).toString("hex"),
  APP_URL: "http://127.0.0.1:3000",
};
try { fs.unlinkSync(env.MAIL_DEV_OUTBOX); } catch {}

const run = (args, opts = {}) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd: SERVER, env, stdio: opts.quiet ? "ignore" : "inherit" });
    p.on("exit", (code) => resolve(code));
  });

async function startApi() {
  const p = spawn(process.execPath, ["src/index.js"], { cwd: SERVER, env, stdio: ["ignore", "ignore", "inherit"] });
  for (let i = 0; i < 75; i++) {
    try { if ((await fetch(API_BASE + "/health")).ok) return p; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  p.kill();
  throw new Error("API did not start");
}
const stopApi = (p) => new Promise((resolve) => { p.on("exit", resolve); p.kill(); });

await mongoose.connect(MONGO_URI);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
if ((await run(["src/seed.js"], { quiet: true })) !== 0) { console.error("[test] seed failed"); process.exit(1); }
if ((await run(["tests/fixtures.mjs"], { quiet: true })) !== 0) { console.error("[test] fixtures failed"); process.exit(1); }

// optional filter: npm test -- hardening engine
const only = process.argv.slice(2);
const RUN = only.length ? SUITES.filter((x) => only.some((o) => x.includes(o))) : SUITES;
const failed = [];
for (const s of RUN) {
  console.log(`\n=== ${s} ===`);
  const api = await startApi();
  const code = await run([path.join("tests", s)]);
  await stopApi(api);
  if (code !== 0) failed.push(s);
}

console.log(`\n${RUN.length - failed.length}/${RUN.length} suites passed${failed.length ? " — FAILED: " + failed.join(", ") : ""}`);
process.exit(failed.length ? 1 : 0);
