import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { sign, auth } from "../middleware/auth.js";
import { asyncHandler, asString } from "../utils/http.js";
import { audit } from "../utils/audit.js";

const r = Router();

const BCRYPT_COST = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// a fixed dummy hash so login spends the same time whether or not the user exists
const DUMMY_HASH = bcrypt.hashSync("octasec-timing-equalizer", BCRYPT_COST);

// strict limiter on auth endpoints (per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

r.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = asString(req.body?.email).toLowerCase().trim();
    const password = asString(req.body?.password);
    const name = asString(req.body?.name).trim().slice(0, 80);
    const phone = asString(req.body?.phone).trim().slice(0, 32);
    const orgName = asString(req.body?.orgName).trim().slice(0, 120);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    try {
      // role is NEVER taken from the client — self-service accounts are always "client".
      // corp/admin are granted only out of band (admin tooling / invite).
      const user = await User.create({ email, passwordHash, role: "client", name, phone, orgName });
      await audit(req, "auth.register", {
        actorId: user._id, actorEmail: user.email, actorRole: user.role,
        targetType: "User", targetId: user._id.toString(), targetLabel: user.email,
      });
      res.status(201).json({ token: sign(user), user });
    } catch (e) {
      if (e && e.code === 11000) return res.status(409).json({ error: "An account with that email already exists" });
      throw e;
    }
  })
);

r.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = asString(req.body?.email).toLowerCase().trim();
    const password = asString(req.body?.password);
    const user = await User.findOne({ email });
    // always run a compare (dummy hash when the user is missing) to equalize timing
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) {
      await audit(req, "auth.login_fail", { actorEmail: email, targetType: "User", targetLabel: email });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // block sign-in for users whose company has been suspended
    if (user.companyId) {
      const company = await Company.findById(user.companyId).select("status").lean();
      if (company && company.status === "suspended") {
        await audit(req, "auth.login_fail", {
          actorId: user._id, actorEmail: user.email, actorRole: user.role,
          targetType: "User", targetId: user._id.toString(), targetLabel: user.email, meta: { reason: "company_suspended" },
        });
        return res.status(403).json({ error: "Your company account is suspended. Contact OctaSec." });
      }
    }
    await audit(req, "auth.login", {
      actorId: user._id, actorEmail: user.email, actorRole: user.role,
      targetType: "User", targetId: user._id.toString(), targetLabel: user.email,
    });
    res.json({ token: sign(user), user });
  })
);

r.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  })
);

export default r;
