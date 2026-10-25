import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler, asString } from "../utils/http.js";
import { runPhp2ShellCheck } from "../services/php2shellCheck.js";

const r = Router();
const checkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit reached — 6 checks per hour. For estates, use the patching service." },
});

r.post("/check", checkLimiter, asyncHandler(async (req, res) => {
  const raw = asString(req.body?.url).trim().slice(0, 300);
  if (!raw) return res.status(400).json({ error: "URL is required" });
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  res.json(await runPhp2ShellCheck(withScheme));
}));

export default r;
