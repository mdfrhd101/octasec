// Inbound webhook: the scan engine pushes job progress + findings here.
//   POST /api/engine/callback
//   X-OctaSec-Timestamp: <unix seconds>
//   X-OctaSec-Signature: sha256=<hex HMAC-SHA256(ENGINE_WEBHOOK_SECRET, "<timestamp>.<raw body>")>
// Contract + signing examples: docs/ENGINE_INTEGRATION.md §5.
// Disabled (404) until ENGINE_WEBHOOK_SECRET is set. Mounted BEFORE the global
// JSON parser because the signature is computed over the raw bytes.
import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import Engagement from "../models/Engagement.js";
import { asyncHandler } from "../utils/http.js";
import { audit } from "../utils/audit.js";
import { verifySignature, applyResult } from "../engine/index.js";
import { normalizeFindings, normalizeState } from "../engine/normalize.js";

const r = Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

r.post(
  "/callback",
  limiter,
  express.raw({ type: "application/json", limit: "2mb" }),
  asyncHandler(async (req, res) => {
    if (!process.env.ENGINE_WEBHOOK_SECRET) return res.status(404).json({ error: "Not found" });
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!verifySignature(raw, req.get("X-OctaSec-Timestamp"), req.get("X-OctaSec-Signature"))) {
      return res.status(401).json({ error: "Invalid or expired signature" });
    }
    let body;
    try { body = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "Body must be JSON" }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ error: "Body must be a JSON object" });
    const jobId = typeof body.jobId === "string" ? body.jobId : "";
    if (!jobId || jobId.length > 120) return res.status(400).json({ error: "jobId is required" });

    const e = await Engagement.findOne({ "engine.jobId": jobId });
    if (!e) return res.status(404).json({ error: "Unknown jobId" });
    if (e.status !== "in_progress") return res.status(409).json({ error: `Engagement is ${e.status}` });
    if (["completed", "failed"].includes(e.engine.state)) return res.status(409).json({ error: "This job is already final" });
    // replay / reordering defence: each event must be newer than the last one applied
    const ts = Number(req.get("X-OctaSec-Timestamp"));
    if (e.engine.lastEventTs && ts < e.engine.lastEventTs) return res.status(409).json({ error: "Stale or replayed event" });

    const result = {
      state: normalizeState(body.state),
      progress: Number.isFinite(body.progress) ? Math.max(0, Math.min(100, Math.round(body.progress))) : null,
      error: typeof body.error === "string" ? body.error.slice(0, 500) : "",
      findings: body.findings !== undefined ? normalizeFindings(body.findings, e.domainName) : null,
    };
    if (!applyResult(e, result)) return res.status(409).json({ error: `State cannot go back from ${e.engine.state} to ${result.state}` });
    e.engine.lastEventTs = ts;
    await e.save();
    await audit(req, "engine.callback", {
      actorEmail: "scan-engine", actorRole: "engine",
      targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId,
      meta: { state: result.state, findings: result.findings ? result.findings.length : null },
    });
    res.json({ ok: true, state: e.engine.state });
  })
);

export default r;
