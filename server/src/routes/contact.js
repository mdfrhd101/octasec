import { Router } from "express";
import { EMAIL_RE } from "../utils/profile.js";
import rateLimit from "express-rate-limit";
import Lead from "../models/Lead.js";
import { asyncHandler, asString } from "../utils/http.js";

const r = Router();

const TARGETS = ["Web app", "API", "Cloud", "Network", "AI feature", "Not sure"];

// public endpoint → tight per-IP rate limit to deter spam
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
});

// POST /api/contact  (PUBLIC — no auth)
r.post(
  "/",
  contactLimiter,
  asyncHandler(async (req, res) => {
    // honeypot: real users never fill this hidden field
    if (asString(req.body?.website).trim()) return res.json({ ok: true });

    const name = asString(req.body?.name).trim().slice(0, 120);
    const email = asString(req.body?.email).toLowerCase().trim().slice(0, 160);
    const company = asString(req.body?.company).trim().slice(0, 160);
    let target = asString(req.body?.target).trim();
    if (!TARGETS.includes(target)) target = "Not sure";
    const message = asString(req.body?.message).trim().slice(0, 4000);

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "A valid email is required" });

    await Lead.create({ name, email, company, target, message });
    res.status(201).json({ ok: true });
  })
);

export default r;
