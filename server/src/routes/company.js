import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, isId, asString } from "../utils/http.js";

const r = Router();
r.use(auth);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

// ---- employees: company_admin only (employees cannot manage staff) ----
r.get(
  "/employees",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.json({ employees: [] });
    const users = await User.find({ companyId: req.user.companyId }).sort({ createdAt: 1 }).lean();
    res.json({ employees: users.map((u) => ({ id: u._id, email: u.email, name: u.name, phone: u.phone, role: u.role, createdAt: u.createdAt })) });
  })
);

r.post(
  "/employees",
  requireRole("company_admin"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(403).json({ error: "No company context" });
    const email = asString(req.body?.email).toLowerCase().trim();
    const password = asString(req.body?.password);
    const name = asString(req.body?.name).trim().slice(0, 80);
    const phone = asString(req.body?.phone).trim().slice(0, 32);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    if ((await User.countDocuments({ companyId: req.user.companyId })) >= EMPLOYEES_MAX) {
      return res.status(409).json({ error: "Employee limit reached" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const user = await User.create({ email, passwordHash, role: "employee", companyId: req.user.companyId, name, phone });
      res.status(201).json({ employee: { id: user._id, email: user.email, name: user.name, phone: user.phone, role: user.role } });
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
    res.json({ ok: true });
  })
);

export default r;
