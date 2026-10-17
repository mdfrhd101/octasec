import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { sign, auth, requireRole } from "../middleware/auth.js";
import { parseProfile, completeness, EMAIL_RE } from "../utils/profile.js";
import { asyncHandler, asString } from "../utils/http.js";
import { audit } from "../utils/audit.js";
import { BCRYPT_COST, passwordProblem, revokeSessions } from "../utils/accounts.js";
import {
  issueToken, consumeToken, peekToken, revokeTokens, recentCount, noteMailSent, MAX_PER_HOUR, PURPOSE,
  sendReset, sendVerify, sendAlreadyRegistered,
} from "../utils/emailTokens.js";

const r = Router();

// a fixed dummy hash so login spends the same time whether or not the user exists
const DUMMY_HASH = bcrypt.hashSync("octasec-timing-equalizer", BCRYPT_COST);
const normEmail = (v) => asString(v).toLowerCase().trim().slice(0, 160);

// per-IP limiter on every auth endpoint; hits are audited
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    audit(req, "auth.rate_limited", { actorEmail: normEmail(req.body?.email), meta: { path: req.path } });
    res.status(options.statusCode).json({ error: "Too many attempts. Try again later." });
  },
});

/* ---- per-account login throttle (credential stuffing from many IPs) ----
   10 failed passwords for one email in 15 min → that email is locked for the
   rest of the window, existing or not (no enumeration). In-memory: one API
   process per deployment (pm2 single instance); use Redis if you scale out. */
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const LOCK_MAX_FAILS = 10;
const fails = new Map(); // email -> { n, first }
function lockedOut(email) {
  const f = fails.get(email);
  if (!f) return false;
  if (Date.now() - f.first > LOCK_WINDOW_MS) { fails.delete(email); return false; }
  return f.n >= LOCK_MAX_FAILS;
}
function noteFail(email) {
  const f = fails.get(email);
  if (!f || Date.now() - f.first > LOCK_WINDOW_MS) fails.set(email, { n: 1, first: Date.now() });
  else f.n++;
  if (fails.size > 50000) fails.clear(); // memory bound under attack
}

/* ===== registration with email verification ===== */
const REGISTER_REPLY = { ok: true, message: "Check your email — we've sent a link to confirm your address and activate your account." };

async function sendVerifyIfAllowed(req, user) {
  if ((await recentCount(user._id, "verify")) >= MAX_PER_HOUR) return;
  await sendVerify(user, await issueToken(user, "verify", req.ip));
}

r.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normEmail(req.body?.email);
    const password = asString(req.body?.password);
    const name = asString(req.body?.name).trim().slice(0, 80);
    const phone = asString(req.body?.phone).trim().slice(0, 32);
    const orgName = asString(req.body?.orgName).trim().slice(0, 120);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
    const bad = passwordProblem(password, email);
    if (bad) return res.status(400).json({ error: bad });

    // the reply is identical whether or not the email is already registered
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(202).json(REGISTER_REPLY);
      try {
        if (existing.status === "pending") await sendVerifyIfAllowed(req, existing);
        else if ((await recentCount(existing._id, "verify")) < MAX_PER_HOUR) {
          await sendAlreadyRegistered(existing);
          await noteMailSent(existing._id, "verify"); // counts toward the per-hour mail throttle
        }
      } catch (e) { console.error("[register] notice failed:", e.message); }
      return;
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;
    try {
      // role is NEVER taken from the client — self-service accounts are always "client"
      user = await User.create({ email, passwordHash, role: "client", name, phone, orgName, status: "pending" });
    } catch (e) {
      if (e && e.code === 11000) return res.status(202).json(REGISTER_REPLY); // lost a race with an identical signup
      throw e;
    }
    res.status(202).json(REGISTER_REPLY);
    try {
      await audit(req, "auth.register", {
        actorId: user._id, actorEmail: user.email, actorRole: user.role,
        targetType: "User", targetId: user._id.toString(), targetLabel: user.email,
      });
      await sendVerifyIfAllowed(req, user);
    } catch (e) { console.error("[register] verification mail failed:", e.message); }
  })
);

// confirm the email address → account active → signed in
r.post(
  "/verify-email",
  authLimiter,
  asyncHandler(async (req, res) => {
    const rec = await consumeToken(asString(req.body?.token), ["verify"]);
    if (!rec) {
      await audit(req, "auth.verify_fail", { meta: { reason: "invalid_or_expired" } });
      return res.status(400).json({ error: "This confirmation link is invalid or has expired. Sign in to get a new one." });
    }
    const user = await User.findById(rec.userId);
    if (!user || user.status === "disabled") return res.status(400).json({ error: "This confirmation link is invalid or has expired." });
    if (user.status === "pending") { user.status = "active"; user.emailVerifiedAt = new Date(); await user.save(); }
    await audit(req, "auth.verify_email", { actorId: user._id, actorEmail: user.email, actorRole: user.role, targetType: "User", targetId: user._id.toString(), targetLabel: user.email });
    res.json({ token: sign(user), user });
  })
);

r.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normEmail(req.body?.email);
    const password = asString(req.body?.password);
    if (lockedOut(email)) {
      await audit(req, "auth.login_fail", { actorEmail: email, targetType: "User", targetLabel: email, meta: { reason: "account_throttled" } });
      return res.status(429).json({ error: "Too many failed attempts for this account. Try again in 15 minutes." });
    }
    const user = await User.findOne({ email });
    // always run a compare (dummy hash when the user is missing) to equalize timing
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) {
      noteFail(email);
      await audit(req, "auth.login_fail", { actorEmail: email, targetType: "User", targetLabel: email });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    fails.delete(email);
    const deny = async (reason, status, body) => {
      await audit(req, "auth.login_fail", {
        actorId: user._id, actorEmail: user.email, actorRole: user.role,
        targetType: "User", targetId: user._id.toString(), targetLabel: user.email, meta: { reason },
      });
      return res.status(status).json(body);
    };
    // these are only revealed after a correct password, so they leak nothing to a guesser
    if (user.status === "disabled") return deny("account_disabled", 403, { error: "Your account is disabled. Contact your administrator." });
    if (user.status === "pending") {
      try { await sendVerifyIfAllowed(req, user); } catch (e) { console.error("[login] verify resend failed:", e.message); }
      return deny("email_not_verified", 403, { error: "Confirm your email first — we've sent you a new confirmation link.", code: "EMAIL_NOT_VERIFIED" });
    }
    if (user.companyId) {
      const company = await Company.findById(user.companyId).select("status").lean();
      if (company && company.status === "suspended") return deny("company_suspended", 403, { error: "Your company account is suspended. Contact OctaSec." });
    }
    await audit(req, "auth.login", {
      actorId: user._id, actorEmail: user.email, actorRole: user.role,
      targetType: "User", targetId: user._id.toString(), targetLabel: user.email,
    });
    res.json({ token: sign(user), user });
  })
);

// sign out: revokes every session of this user server-side
r.post(
  "/logout",
  auth,
  asyncHandler(async (req, res) => {
    await revokeSessions(req.user.id);
    await audit(req, "auth.logout", { targetType: "User", targetId: req.user.id });
    res.json({ ok: true });
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

/* ===== forgot password — docs/EMAIL_AND_PASSWORD_RESET.md ===== */
const RESET_GENERIC = { ok: true, message: `If an account exists for that email, a password-reset link has been sent. It expires in ${PURPOSE.reset.ttlMin} minutes.` };
const RESET_BAD = { error: "This link is invalid or has expired. Request a new one." };

async function issueReset(req, email) {
  const user = await User.findOne({ email }).select("email name status companyId").lean();
  if (!user || (user.status || "active") !== "active") return;
  if (user.companyId) {
    const company = await Company.findById(user.companyId).select("status").lean();
    if (!company || company.status === "suspended") return;
  }
  if ((await recentCount(user._id, "reset")) >= MAX_PER_HOUR) {
    await audit(req, "auth.reset_throttled", { actorId: user._id, actorEmail: user.email, targetType: "User", targetId: user._id.toString(), targetLabel: user.email });
    return; // anti mail-bombing — silently
  }
  await sendReset(user, await issueToken(user, "reset", req.ip));
  await audit(req, "auth.reset_request", {
    actorId: user._id, actorEmail: user.email, targetType: "User", targetId: user._id.toString(), targetLabel: user.email, companyId: user.companyId,
  });
}

r.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normEmail(req.body?.email);
    // reply FIRST and identically for every case: no account enumeration, no timing oracle
    res.json(RESET_GENERIC);
    if (!EMAIL_RE.test(email)) return;
    try { await issueReset(req, email); } catch (e) { console.error("[reset] could not issue reset:", e.message); }
  })
);

// set a new password from an emailed link (self reset, admin reset, or account invite)
r.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const token = asString(req.body?.token);
    const newPassword = asString(req.body?.newPassword);
    const peek = await peekToken(token, ["reset", "admin_reset", "invite"]);
    if (!peek) {
      await audit(req, "auth.reset_fail", { meta: { reason: "invalid_or_expired" } });
      return res.status(400).json(RESET_BAD);
    }
    const user = await User.findById(peek.userId);
    if (!user || user.status === "disabled") return res.status(400).json(RESET_BAD);
    // validate BEFORE burning the token so a weak password can be retried
    const bad = passwordProblem(newPassword, user.email);
    if (bad) return res.status(400).json({ error: bad });
    const rec = await consumeToken(token, ["reset", "admin_reset", "invite"]); // atomic single use
    if (!rec) return res.status(400).json(RESET_BAD);
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    user.mustChangePassword = false;
    if (user.status === "pending") { user.status = "active"; user.emailVerifiedAt = new Date(); } // the link proves the inbox
    if (rec.purpose === "invite" && !user.emailVerifiedAt) user.emailVerifiedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1; // sign out every session
    await user.save();
    await revokeTokens(user._id);
    await audit(req, rec.purpose === "invite" ? "auth.invite_accept" : "auth.reset_complete", {
      actorId: user._id, actorEmail: user.email, actorRole: user.role,
      targetType: "User", targetId: user._id.toString(), targetLabel: user.email, companyId: user.companyId,
    });
    res.json({ ok: true, message: "Password set. Sign in with your new password." });
  })
);

// self-serve clients describe their own organisation (company users use /company/profile)
r.get(
  "/profile",
  auth,
  requireRole("client"),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("profile").lean();
    res.json({ profile: user?.profile || null, completeness: completeness(user?.profile) });
  })
);

r.patch(
  "/profile",
  auth,
  requireRole("client"),
  asyncHandler(async (req, res) => {
    const profile = parseProfile(req.body?.profile);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: "Session no longer valid" });
    user.profile = profile;
    user.orgName = profile.tradeName || profile.legalName;
    await user.save();
    await audit(req, "profile.update", { targetType: "User", targetId: user._id.toString(), targetLabel: user.email });
    res.json({ profile: user.profile, completeness: completeness(user.profile), user });
  })
);

// self-service password change (also clears a forced change on legacy accounts)
r.post(
  "/change-password",
  authLimiter,
  auth,
  asyncHandler(async (req, res) => {
    const currentPassword = asString(req.body?.currentPassword);
    const newPassword = asString(req.body?.newPassword);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: "Session no longer valid" });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      await audit(req, "auth.password_change_fail", { targetType: "User", targetId: user._id.toString(), targetLabel: user.email, companyId: user.companyId });
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    const bad = passwordProblem(newPassword, user.email);
    if (bad) return res.status(400).json({ error: bad });
    if (newPassword === currentPassword) return res.status(400).json({ error: "New password must be different" });
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // sign out every other session
    await user.save();
    await revokeTokens(user._id); // outstanding emailed links die too
    await audit(req, "auth.password_change", {
      targetType: "User", targetId: user._id.toString(), targetLabel: user.email, companyId: user.companyId,
    });
    res.json({ token: sign(user), user });
  })
);

export default r;
