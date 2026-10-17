import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";
import Client from "../models/Client.js";
import Domain from "../models/Domain.js";
import Asset from "../models/Asset.js";
import Ticket from "../models/Ticket.js";
import Lead from "../models/Lead.js";
import Engagement from "../models/Engagement.js";
import AuditLog from "../models/AuditLog.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, isId, asString, isBadParam } from "../utils/http.js";
import { audit } from "../utils/audit.js";

const r = Router();
r.use(auth, requireRole("super_admin"));

// platform-wide totals
r.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [companies, users, clients, domains, assets, verified, openTickets, newLeads, openEngagements] = await Promise.all([
      Company.countDocuments(), User.countDocuments(), Client.countDocuments(),
      Domain.countDocuments(), Asset.countDocuments(), Domain.countDocuments({ verified: true }),
      Ticket.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      Lead.countDocuments({ status: "new" }),
      Engagement.countDocuments({ status: { $in: ["requested", "assigned", "in_progress"] } }),
    ]);
    res.json({ companies, users, clients, domains, assets, verified, openTickets, newLeads, openEngagements, tenants: users });
  })
);

const PAGE_MAX = 200;
const page = (req) => ({
  limit: Math.min(PAGE_MAX, Math.max(1, parseInt(req.query.limit, 10) || 100)),
  skip: Math.max(0, parseInt(req.query.skip, 10) || 0),
});

// companies with per-company counts — 4 grouped aggregations, not 4×N queries
r.get(
  "/companies",
  asyncHandler(async (req, res) => {
    const { limit, skip } = page(req);
    const companies = await Company.find().sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
    if (!companies.length) return res.json({ companies: [] });
    const ids = companies.map((c) => c._id);
    const countBy = async (Model) => {
      const rows = await Model.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: "$companyId", n: { $sum: 1 } } }]);
      return Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
    };
    const [emp, cli, dom, ast] = await Promise.all([countBy(User), countBy(Client), countBy(Domain), countBy(Asset)]);
    res.json({
      companies: companies.map((c) => {
        const k = String(c._id);
        return { id: c._id, name: c.name, status: c.status, employees: emp[k] || 0, clients: cli[k] || 0, domains: dom[k] || 0, assets: ast[k] || 0, createdAt: c.createdAt };
      }),
    });
  })
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// provision a new company + its first company_admin
r.post(
  "/companies",
  asyncHandler(async (req, res) => {
    const name = asString(req.body?.name).trim().slice(0, 120);
    const adminName = asString(req.body?.adminName).trim().slice(0, 80);
    const adminEmail = asString(req.body?.adminEmail).toLowerCase().trim().slice(0, 160);
    const adminPassword = asString(req.body?.adminPassword);
    if (!name) return res.status(400).json({ error: "Company name is required" });
    if (!EMAIL_RE.test(adminEmail)) return res.status(400).json({ error: "A valid admin email is required" });
    if (adminPassword.length < 8) return res.status(400).json({ error: "Admin password must be at least 8 characters" });
    if (await User.exists({ email: adminEmail })) return res.status(409).json({ error: "That admin email is already in use" });

    const company = await Company.create({ name });
    try {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const admin = await User.create({ email: adminEmail, passwordHash, role: "company_admin", companyId: company._id, name: adminName, orgName: name });
      await audit(req, "company.create", {
        targetType: "Company", targetId: company._id.toString(), targetLabel: company.name, companyId: company._id,
        meta: { adminEmail: admin.email },
      });
      await audit(req, "user.create", {
        targetType: "User", targetId: admin._id.toString(), targetLabel: admin.email, companyId: company._id,
        meta: { role: "company_admin" },
      });
      res.status(201).json({ company: { id: company._id, name: company.name, status: company.status }, admin: { id: admin._id, email: admin.email, name: admin.name } });
    } catch (e) {
      await Company.deleteOne({ _id: company._id }); // roll back the company if the admin fails
      if (e && e.code === 11000) return res.status(409).json({ error: "That admin email is already in use" });
      throw e;
    }
  })
);

// suspend / re-activate a company (suspended companies' users cannot sign in)
r.patch(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const status = asString(req.body?.status);
    if (!["active", "suspended"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const company = await Company.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!company) return res.status(404).json({ error: "Not found" });
    await audit(req, status === "suspended" ? "company.suspend" : "company.activate", {
      targetType: "Company", targetId: company._id.toString(), targetLabel: company.name, companyId: company._id,
    });
    res.json({ company: { id: company._id, name: company.name, status: company.status } });
  })
);

// delete a company and everything under it (hard, cascading)
r.delete(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    await Promise.all([
      User.deleteMany({ companyId: company._id }),
      Client.deleteMany({ companyId: company._id }),
      Domain.deleteMany({ companyId: company._id }),
      Asset.deleteMany({ companyId: company._id }),
      Ticket.deleteMany({ companyId: company._id }),
    ]);
    await company.deleteOne();
    await audit(req, "company.delete", {
      targetType: "Company", targetId: company._id.toString(), targetLabel: company.name,
    });
    res.json({ ok: true });
  })
);

// list company users (company_admins + employees) across all companies
r.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { limit, skip } = page(req);
    const users = await User.find({ role: { $in: ["company_admin", "employee"] } }).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
    const companies = await Company.find().select("name").lean();
    const cmap = Object.fromEntries(companies.map((c) => [String(c._id), c.name]));
    res.json({ users: users.map((u) => ({ id: u._id, email: u.email, name: u.name, role: u.role, company: cmap[String(u.companyId)] || "—", createdAt: u.createdAt })) });
  })
);

/* ===== engagements / scan operations =====
   Mock run only: real scanning is the MD's separate engine (wired later).
   The human-gated workflow — assign → run → verify → sign → deliver — is real. */
const FINDINGS = [
  { title: "Missing security headers", severity: "medium", cvss: 4.3, owasp: "A05:2021 Security Misconfiguration", detail: "Served without HSTS / CSP.", fix: "Add HSTS, CSP and X-Content-Type-Options at the edge." },
  { title: "Outdated component with known CVEs", severity: "high", cvss: 7.5, owasp: "A06:2021 Vulnerable & Outdated Components", detail: "A public component advertises a version with published advisories.", fix: "Upgrade to a supported release and re-test." },
  { title: "Exposed non-production surface", severity: "high", cvss: 8.2, owasp: "A01:2021 Broken Access Control", detail: "A staging/admin host is reachable publicly.", fix: "Restrict to VPN/allowlist and require auth." },
  { title: "Weak TLS configuration", severity: "medium", cvss: 5.9, owasp: "A02:2021 Cryptographic Failures", detail: "Legacy protocol/cipher negotiated.", fix: "Disable legacy protocols; prefer TLS 1.2+." },
  { title: "Authentication bypass on admin route", severity: "critical", cvss: 9.4, owasp: "A07:2021 Identification & Authentication Failures", detail: "An admin endpoint is reachable without a valid session under a specific sequence.", fix: "Enforce server-side session checks on every privileged route." },
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

r.get(
  "/engagements",
  asyncHandler(async (req, res) => {
    const { limit, skip } = page(req);
    const q = {};
    const st = asString(req.query.status);
    if (st === "open") q.status = { $in: ["requested", "assigned", "in_progress"] };
    else if (["requested", "assigned", "in_progress", "delivered", "rejected", "cancelled"].includes(st)) q.status = st;
    const engagements = await Engagement.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .select("domainName status roe operatorName requestedByEmail companyId targets findings createdAt updatedAt signedAt").lean();
    const cids = [...new Set(engagements.map((e) => String(e.companyId)).filter((x) => x !== "null"))];
    const companies = cids.length ? await Company.find({ _id: { $in: cids } }).select("name").lean() : [];
    const cmap = Object.fromEntries(companies.map((c) => [String(c._id), c.name]));
    res.json({
      engagements: engagements.map((e) => ({
        id: e._id, domainName: e.domainName, status: e.status, intensity: e.roe?.intensity,
        operator: e.operatorName, requestedByEmail: e.requestedByEmail,
        tenant: e.companyId ? cmap[String(e.companyId)] || "—" : "Self-serve client",
        targets: e.targets?.length || 0, findings: e.findings?.length || 0,
        createdAt: e.createdAt, updatedAt: e.updatedAt, signedAt: e.signedAt,
      })),
    });
  })
);

r.get(
  "/engagements/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findById(req.params.id).lean();
    if (!e) return res.status(404).json({ error: "Not found" });
    const company = e.companyId ? await Company.findById(e.companyId).select("name").lean() : null;
    res.json({ engagement: { ...e, tenant: company?.name || "Self-serve client" } });
  })
);

async function opName(id) {
  const u = await User.findById(id).select("name email").lean();
  return u?.name || u?.email || "Operator";
}

// assign to self (requested → assigned)
r.post(
  "/engagements/:id/assign",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Not found" });
    if (e.status !== "requested") return res.status(409).json({ error: "Only a requested engagement can be assigned" });
    e.status = "assigned";
    e.assignedOperatorId = req.user.id;
    e.operatorName = await opName(req.user.id);
    await e.save();
    await audit(req, "engagement.assign", {
      targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId,
      meta: { operator: e.operatorName },
    });
    res.json({ engagement: e });
  })
);

// run the scan (assigned → in_progress); MOCK generates candidate findings
r.post(
  "/engagements/:id/run",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Not found" });
    if (e.status !== "assigned") return res.status(409).json({ error: "Assign the engagement before running it" });
    const hosts = e.targets.length ? e.targets : [e.domainName];
    const n = 1 + Math.floor(Math.random() * 4);
    e.findings = Array.from({ length: n }, () => {
      const f = pick(FINDINGS);
      return { ...f, host: pick(hosts), verified: false };
    });
    e.status = "in_progress";
    await e.save();
    await audit(req, "engagement.run", {
      targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId,
      meta: { findings: e.findings.length },
    });
    res.json({ engagement: e });
  })
);

// sign & deliver (in_progress → delivered); marks every finding human-verified
r.post(
  "/engagements/:id/sign",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Not found" });
    if (e.status !== "in_progress") return res.status(409).json({ error: "Run the engagement before signing" });
    e.findings = e.findings.map((f) => ({ ...f.toObject(), verified: true }));
    e.status = "delivered";
    e.signedBy = req.user.id;
    e.signedByName = await opName(req.user.id);
    e.signedAt = new Date();
    await e.save();
    await audit(req, "engagement.sign", {
      targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId,
      meta: { findings: e.findings.length, signedBy: e.signedByName },
    });
    res.json({ engagement: e });
  })
);

// reject a request (requested → rejected)
r.post(
  "/engagements/:id/reject",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Not found" });
    if (!["requested", "assigned"].includes(e.status)) return res.status(409).json({ error: "This engagement cannot be rejected" });
    e.status = "rejected";
    e.reason = asString(req.body?.reason).slice(0, 500);
    await e.save();
    await audit(req, "engagement.reject", {
      targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId,
      meta: { reason: e.reason },
    });
    res.json({ engagement: e });
  })
);

// contact-form leads (from the public marketing site)
r.get(
  "/leads",
  asyncHandler(async (req, res) => {
    const { limit, skip } = page(req);
    const q = {};
    const st = asString(req.query.status);
    if (["new", "contacted", "closed"].includes(st)) q.status = st;
    const leads = await Lead.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    res.json({ leads });
  })
);

r.patch(
  "/leads/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const status = asString(req.body?.status);
    if (!["new", "contacted", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const lead = await Lead.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!lead) return res.status(404).json({ error: "Not found" });
    await audit(req, "lead.status", {
      targetType: "Lead", targetId: lead._id.toString(), targetLabel: lead.email, meta: { to: status },
    });
    res.json({ lead });
  })
);

// delete a company user (company_admin or employee) — never a super_admin or self
r.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    if (req.params.id === req.user.id) return res.status(400).json({ error: "You cannot remove yourself" });
    const target = await User.findOne({ _id: req.params.id, role: { $in: ["company_admin", "employee"] } });
    if (!target) return res.status(404).json({ error: "User not found" });
    await target.deleteOne();
    await audit(req, "user.delete", {
      targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId,
      meta: { role: target.role },
    });
    res.json({ ok: true });
  })
);

/* ===== audit log (append-only; super_admin oversight) ===== */
const AUDIT_CATEGORIES = { auth: /^auth\./, company: /^company\./, user: /^user\./, engagement: /^engagement\./, lead: /^lead\./ };

r.get(
  "/audit",
  asyncHandler(async (req, res) => {
    if (isBadParam(req.query.category) || isBadParam(req.query.q)) return res.status(400).json({ error: "Invalid filter" });
    const { limit, skip } = page(req);
    const q = {};
    const cat = asString(req.query.category);
    if (AUDIT_CATEGORIES[cat]) q.action = AUDIT_CATEGORIES[cat];
    const search = asString(req.query.q).trim().slice(0, 120);
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape — no regex injection
      q.$or = [{ actorEmail: rx }, { targetLabel: rx }, { action: rx }];
    }
    const [rows, total] = await Promise.all([
      AuditLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(q),
    ]);
    res.json({
      total,
      entries: rows.map((a) => ({
        id: a._id, action: a.action, actorEmail: a.actorEmail || "—", actorRole: a.actorRole || "",
        targetType: a.targetType, targetId: a.targetId, targetLabel: a.targetLabel, meta: a.meta || {},
        ip: a.ip, createdAt: a.createdAt,
      })),
    });
  })
);

export default r;
