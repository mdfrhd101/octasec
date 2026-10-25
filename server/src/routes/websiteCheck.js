import { Router } from "express";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import WebsiteCheck from "../models/WebsiteCheck.js";
import SslAlert from "../models/SslAlert.js";
import Domain from "../models/Domain.js";
import { asyncHandler, asString, isId } from "../utils/http.js";
import { audit } from "../utils/audit.js";
import { auth } from "../middleware/auth.js";
import { scopeFor, ownerStamp } from "../utils/tenancy.js";
import { runWebsiteCheck } from "../services/websiteCheck.js";
import { resolvePublicTarget } from "../utils/ssrfFetch.js";
import { websiteCheckPdf } from "../services/websiteCheckPdf.js";

const r = Router();
const checkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Hourly safety-check limit reached. Try again later or contact us for an estate assessment." },
});
const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Daily safety-check limit reached. Automated bulk scanning is not available on the free tool." },
});
const pdfLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
let activeChecks = 0;
const activeIps = new Set();

r.post("/check", checkLimiter, dailyLimiter, asyncHandler(async (req, res) => {
  const raw = asString(req.body?.url).trim().slice(0, 300);
  if (!raw) return res.status(400).json({ error: "Website URL is required" });
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const validated = await resolvePublicTarget(withScheme);
  const target = validated.u.hostname.replace(/^\[(.*)\]$/, "$1");
  const recent = await WebsiteCheck.findOne({ target, ip: req.ip, "report.engineVersion": 2, createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } }).sort({ createdAt: -1 });
  if (recent) {
    await audit(req, "website-check.cached", { targetType: "Website", targetLabel: target, meta: { reportId: recent.reportId } });
    return res.json({ ...recent.report, reportId: recent.reportId, cached: true });
  }
  if (activeChecks >= 4 || activeIps.has(req.ip)) return res.status(429).json({ error: "A check is already running or the service is busy. Try again shortly." });
  activeChecks++;
  activeIps.add(req.ip);
  try {
    const report = await runWebsiteCheck(withScheme);
    const doc = await WebsiteCheck.create({
      reportId: crypto.randomBytes(16).toString("hex"),
      target: report.target,
      report,
      ip: String(req.ip || "").slice(0, 60),
      ua: String(req.headers["user-agent"] || "").slice(0, 200),
    });
    await audit(req, "website-check.run", { targetType: "Website", targetId: doc.reportId, targetLabel: report.target, meta: { requests: report.requests, critical: report.counts.critical, high: report.counts.high, warning: report.counts.warning } });
    res.json({ ...report, reportId: doc.reportId, cached: false });
  } finally {
    activeChecks--;
    activeIps.delete(req.ip);
  }
}));

r.get("/alerts", auth, asyncHandler(async (req, res) => {
  const alerts = await SslAlert.find(scopeFor(req.user)).lean();
  res.json({ alerts: alerts.map((a) => ({ domainId: a.domainId, enabled: a.enabled, lastCheckedAt: a.lastCheckedAt, daysRemaining: a.daysRemaining, lastError: a.lastError })) });
}));

r.post("/alerts", auth, asyncHandler(async (req, res) => {
  const domainId = asString(req.body?.domainId);
  if (!isId(domainId)) return res.status(400).json({ error: "Invalid domain" });
  const enabled = req.body?.enabled !== false;
  const domain = await Domain.findOne({ _id: domainId, ...scopeFor(req.user) });
  if (!domain) return res.status(404).json({ error: "Domain not found" });
  if (!domain.verified) return res.status(409).json({ error: "Verify domain ownership before enabling SSL alerts" });
  if (!enabled) {
    await SslAlert.deleteOne({ _id: domainId, ...scopeFor(req.user) });
    await audit(req, "ssl-alert.disable", { targetType: "Domain", targetId: domain._id.toString(), targetLabel: domain.name });
    return res.json({ domainId, enabled: false });
  }
  const alert = await SslAlert.findOneAndUpdate(
    { _id: domainId },
    { $set: { ...ownerStamp(req.user), domainId: domain._id, enabled: true }, $setOnInsert: { lastAlertKey: "" } },
    { new: true, upsert: true, runValidators: true }
  );
  await audit(req, "ssl-alert.enable", { targetType: "Domain", targetId: domain._id.toString(), targetLabel: domain.name });
  res.status(201).json({ domainId, enabled: true, alert: { lastCheckedAt: alert.lastCheckedAt, daysRemaining: alert.daysRemaining, lastError: alert.lastError } });
}));

r.get("/:reportId/report.pdf", pdfLimiter, asyncHandler(async (req, res) => {
  if (!/^[a-f0-9]{32}$/.test(req.params.reportId)) return res.status(400).json({ error: "Invalid report ID" });
  const doc = await WebsiteCheck.findOne({ reportId: req.params.reportId }).lean();
  if (!doc) return res.status(404).json({ error: "Report not found or expired" });
  const pdf = await websiteCheckPdf(doc.report, doc.reportId);
  const safeTarget = doc.target.replace(/[^a-z0-9.-]/g, "-").slice(0, 100);
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="octasec-${safeTarget}-${doc.reportId.slice(0, 8)}.pdf"`,
    "Content-Length": pdf.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(pdf);
}));

export default r;
