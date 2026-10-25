import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import domainRoutes from "./routes/domains.js";
import assetRoutes from "./routes/assets.js";
import dashboardRoutes from "./routes/dashboard.js";
import companyRoutes from "./routes/company.js";
import ticketRoutes from "./routes/tickets.js";
import adminRoutes from "./routes/admin.js";
import contactRoutes from "./routes/contact.js";
import engagementRoutes from "./routes/engagements.js";
import engineCallbackRoutes from "./routes/engineCallback.js";
import PasswordReset from "./models/PasswordReset.js";
import User from "./models/User.js";
import php2shellRoutes from "./routes/php2shell.js";
import websiteCheckRoutes from "./routes/websiteCheck.js";
import { startSslAlertScheduler } from "./services/sslAlerts.js";

/* ---- fail fast on missing / weak config ---- */
function requireEnv() {
  const miss = [];
  if (!process.env.MONGO_URI) miss.push("MONGO_URI");
  if (!process.env.JWT_SECRET) miss.push("JWT_SECRET");
  if (miss.length) { console.error("[boot] missing env:", miss.join(", ")); process.exit(1); }
  const s = process.env.JWT_SECRET;
  if (s.length < 32) { console.error("[boot] JWT_SECRET must be >= 32 chars"); process.exit(1); }
  // reject the shipped placeholder / obviously weak secrets so a copy-paste deploy fails loudly
  if (/change[-_ ]?me|replace|example|placeholder|your[-_ ]?secret|^secret$|password/i.test(s)) {
    console.error("[boot] JWT_SECRET looks like a placeholder — set a real random value (openssl rand -hex 32)");
    process.exit(1);
  }
}
requireEnv();
if (process.env.ENGINE_WEBHOOK_SECRET && process.env.ENGINE_WEBHOOK_SECRET.length < 32) {
  console.error("[boot] ENGINE_WEBHOOK_SECRET must be >= 32 chars (openssl rand -hex 32)"); process.exit(1);
}
if (process.env.NODE_ENV === "production" && !/^https:\/\//.test(process.env.APP_URL || "")) {
  console.error("[boot] APP_URL must be set to the public https:// URL in production (used in emailed links)"); process.exit(1);
}
if (process.env.NODE_ENV === "production" && !process.env.SMTP_HOST) {
  console.warn("[boot] SMTP_HOST is not set — password-reset emails cannot be sent (see docs/EMAIL_AND_PASSWORD_RESET.md)");
}

const app = express();
app.set("trust proxy", 1); // behind nginx on the VPS — needed for correct client IP (rate limiting)
app.disable("x-powered-by");

/* CORS: fail closed — only the configured origins, never reflect-all */
const origins = (process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);           // same-origin / curl / server-to-server
    return cb(null, origins.includes(origin));    // browsers: only allowlisted origins
  },
  credentials: true,
}));

app.use(helmet());
// engine webhook verifies an HMAC over the RAW body, so it is mounted before the JSON parser
app.use("/api/engine", engineCallbackRoutes);
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));

/* light global limiter (auth & verify routes have tighter ones of their own) */
app.use(rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/php2shell", php2shellRoutes);
app.use("/api/website-check", websiteCheckRoutes);
app.use("/api/engagements", engagementRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

/* central error handler — maps common errors to clean statuses, never leaks internals */
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body" });
  if (err && (err.name === "CastError" || err.name === "ValidationError")) return res.status(400).json({ error: "Invalid request" });
  if (err && err.code === 11000) return res.status(409).json({ error: "Duplicate entry" });
  if (err && err.status && err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message || "Request error" });
  console.error("[err]", err && err.message);
  res.status(500).json({ error: "Server error" });
});

/* After a true uncaught error Node's state is undefined — log and exit so the
   process manager (pm2/systemd) restarts a clean worker rather than serving
   from a corrupt state. Routine request errors are already caught by
   asyncHandler + the error middleware and never reach here. */
process.on("uncaughtException", (e) => { console.error("[uncaughtException]", e && e.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("[unhandledRejection]", e && (e.stack || e.message) || e); process.exit(1); });

const PORT = process.env.PORT || 5050;
const HOST = process.env.HOST || "127.0.0.1"; // bind localhost; nginx reverse-proxies on the VPS
connectDB(process.env.MONGO_URI)
  .then(() => PasswordReset.syncIndexes()) // keeps the token TTL index in step with the schema
  // accounts created before the status field existed are active (one-time backfill, idempotent)
  .then(() => User.updateMany({ status: { $exists: false } }, { $set: { status: "active" } }))
  .then(() => {
    if (process.env.NODE_ENV !== "test") startSslAlertScheduler();
    app.listen(PORT, HOST, () => console.log(`[api] http://${HOST}:${PORT}`));
  })
  .catch((e) => { console.error("[db] connection failed:", e.message); process.exit(1); });
