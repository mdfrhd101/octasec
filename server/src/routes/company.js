import { Router } from "express";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, isId, asString } from "../utils/http.js";
import { audit } from "../utils/audit.js";
import { USER_STATUS, applyStatus, applyAdminReset, lockedPasswordHash } from "../utils/accounts.js";
import { issueToken, sendInvite, sendAdminReset } from "../utils/emailTokens.js";
import { parseProfile, completeness, EMAIL_RE } from "../utils/profile.js";

const r = Router();
r.use(auth);

const EMPLOYEES_MAX = 100;

// company info (admin + employee)
r.get(
  "/",
  requireRole("company_admin", "employee"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(404).json({ error: "No company" });
    const company = await Company.findById(req.user.companyId).lean();
    if (!company) return res.status(404).json({ error: "No company" });
    const employees = await User.countDocuments({ companyId: company._id });
    res.json({ company: { ...company, employees } });
  })
);

// ---- organisation profile: company_admin edits, employees read ----
r.get(
  "/profile",
  requireRole("company_admin", "employee"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(404).json({ error: "No company" });
    const company = await Company.findById(req.user.companyId).select("name status profile").lean();
    if (!company) return res.status(404).json({ error: "No company" });
    res.json({ company: { id: company._id, name: company.name, status: company.status }, profile: company.profile || null, completeness: completeness(company.profile) });
  })
);

r.patch(
  "/profile",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(403).json({ error: "No company context" });
    const profile = parseProfile(req.body?.profile);
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ error: "No company" });
    company.profile = profile;
    company.name = profile.tradeName || profile.legalName;
    await company.save();
    await audit(req, "company.profile_update", {
      targetType: "Company", targetId: company._id.toString(), targetLabel: company.name, companyId: company._id,
    });
    res.json({ company: { id: company._id, name: company.name, status: company.status }, profile: company.profile, completeness: completeness(company.profile) });
  })
);

// ---- employees: company_admin only (employees cannot manage staff) ----
r.get(
  "/employees",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.json({ employees: [] });
    const users = await User.find({ companyId: req.user.companyId }).sort({ createdAt: 1 }).lean();
    res.json({ employees: users.map((u) => ({ id: u._id, email: u.email, name: u.name, phone: u.phone, role: u.role, status: u.status || "active", mustChangePassword: !!u.mustChangePassword, createdAt: u.createdAt })) });
  })
);

r.post(
  "/employees",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(403).json({ error: "No company context" });
    const email = asString(req.body?.email).toLowerCase().trim().slice(0, 160);
    const name = asString(req.body?.name).trim().slice(0, 80);
    const phone = asString(req.body?.phone).trim().slice(0, 32);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
    if ((await User.countDocuments({ companyId: req.user.companyId })) >= EMPLOYEES_MAX) {
      return res.status(409).json({ error: "Employee limit reached" });
    }
    await User.deleteOne({ email, status: "pending" }); // an unverified self-signup cannot squat the address
    try {
      // the employee sets their own password from an emailed invite — the admin never knows it
      const user = await User.create({ email, passwordHash: await lockedPasswordHash(), role: "employee", companyId: req.user.companyId, name, phone });
      await audit(req, "user.create", {
        targetType: "User", targetId: user._id.toString(), targetLabel: user.email, companyId: user.companyId, meta: { role: "employee" },
      });
      const company = await Company.findById(req.user.companyId).select("name").lean();
      let inviteSent = true;
      try { await sendInvite(user, await issueToken(user, "invite", req.ip), company?.name); }
      catch (e) { inviteSent = false; console.error("[invite] mail failed:", e.message); }
      res.status(201).json({ employee: { id: user._id, email: user.email, name: user.name, phone: user.phone, role: user.role }, inviteSent });
    } catch (e) {
      if (e && e.code === 11000) return res.status(409).json({ error: "An account with that email already exists" });
      throw e;
    }
  })
);

r.delete(
  "/employees/:id",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    if (req.params.id === req.user.id) return res.status(400).json({ error: "You cannot remove yourself" });
    // only an employee of the SAME company, and never another company_admin
    const target = await User.findOne({ _id: req.params.id, companyId: req.user.companyId, role: "employee" });
    if (!target) return res.status(404).json({ error: "Employee not found" });
    await target.deleteOne();
    await audit(req, "user.delete", {
      targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId, meta: { role: "employee" },
    });
    res.json({ ok: true });
  })
);

// an employee of the caller's own company (never another company_admin, never self)
async function ownEmployee(req, res) {
  if (!isId(req.params.id)) { res.status(400).json({ error: "Invalid id" }); return null; }
  if (req.params.id === req.user.id) { res.status(400).json({ error: "You cannot change your own account here" }); return null; }
  const target = await User.findOne({ _id: req.params.id, companyId: req.user.companyId, role: "employee" });
  if (!target) { res.status(404).json({ error: "Employee not found" }); return null; }
  return target;
}

// edit an employee: name / phone, and/or disable / re-enable (disabling revokes their live sessions)
r.patch(
  "/employees/:id",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const status = "status" in body ? asString(body.status) : "";
    if ("status" in body && !USER_STATUS.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const hasDetails = "name" in body || "phone" in body;
    if (!status && !hasDetails) return res.status(400).json({ error: "Nothing to update" });
    const target = await ownEmployee(req, res);
    if (!target) return;
    if ("name" in body) target.name = asString(body.name).trim().slice(0, 80);
    if ("phone" in body) target.phone = asString(body.phone).trim().slice(0, 32);
    const statusChanged = status && status !== (target.status || "active");
    if (status) applyStatus(target, status);
    await target.save();
    if (hasDetails) {
      await audit(req, "user.update", {
        targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId, meta: { role: "employee" },
      });
    }
    if (statusChanged) {
      await audit(req, status === "disabled" ? "user.disable" : "user.enable", {
        targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId, meta: { role: "employee" },
      });
    }
    res.json({ employee: { id: target._id, email: target.email, name: target.name, phone: target.phone, status: target.status } });
  })
);

// reset an employee's password: their password + sessions die, they get an emailed set-password link
r.post(
  "/employees/:id/reset-password",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    const target = await ownEmployee(req, res);
    if (!target) return;
    if (target.status === "disabled") return res.status(409).json({ error: "Enable the account first" });
    await applyAdminReset(target);
    await target.save();
    let emailSent = true;
    try { await sendAdminReset(target, await issueToken(target, "admin_reset", req.ip)); }
    catch (e) { emailSent = false; console.error("[admin-reset] mail failed:", e.message); }
    await audit(req, "user.password_reset", {
      targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId, meta: { role: "employee", emailSent },
    });
    res.json({ employee: { id: target._id, email: target.email }, emailSent });
  })
);

// ---- API keys: NOT BUILT YET — contract in docs/PORTAL_FRONTEND_PLAN.md §3 ----
// The portal (services/apiKeys.js) already calls these and shows "not available yet" on 501.
const notImplemented = (req, res) => res.status(501).json({ error: "API keys are not available yet", code: "NOT_IMPLEMENTED" });
r.get("/api-keys", requireRole("company_admin"), notImplemented);
r.post("/api-keys", requireRole("company_admin"), notImplemented);
r.delete("/api-keys/:id", requireRole("company_admin"), notImplemented);

export default r;
