import { Router } from "express";
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
import { USER_STATUS, applyStatus, applyAdminReset, lockedPasswordHash } from "../utils/accounts.js";
import { issueToken, sendInvite, sendAdminReset } from "../utils/emailTokens.js";
import { parseProfile, completeness, authorizationState, EMAIL_RE } from "../utils/profile.js";
import * as engine from "../engine/index.js";

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
        return { id: c._id, name: c.name, status: c.status, industry: c.profile?.industry || "", country: c.profile?.country || "", profilePct: completeness(c.profile).pct, employees: emp[k] || 0, clients: cli[k] || 0, domains: dom[k] || 0, assets: ast[k] || 0, createdAt: c.createdAt };
      }),
    });
  })
);


// send an account invite (set-your-password link); never fails the caller's action
async function invite(req, user, orgName) {
  try { await sendInvite(user, await issueToken(user, "invite", req.ip), orgName); return true; }
  catch (e) { console.error("[invite] mail failed:", e.message); return false; }
}

// provision a new company + its first company_admin (who sets their own password from an emailed invite)
r.post(
  "/companies",
  asyncHandler(async (req, res) => {
    const name = asString(req.body?.name).trim().slice(0, 120);
    const adminName = asString(req.body?.adminName).trim().slice(0, 80);
    const adminEmail = asString(req.body?.adminEmail).toLowerCase().trim().slice(0, 160);
    if (!name) return res.status(400).json({ error: "Company name is required" });
    if (!EMAIL_RE.test(adminEmail)) return res.status(400).json({ error: "A valid admin email is required" });
    // organisation profile (optional for API callers; the portal form always sends it)
    const profile = req.body?.profile !== undefined ? parseProfile(req.body.profile) : undefined;
    // an unverified self-signup cannot squat a customer's admin address
    await User.deleteOne({ email: adminEmail, status: "pending" });
    if (await User.exists({ email: adminEmail })) return res.status(409).json({ error: "That admin email is already in use" });

    const company = await Company.create({ name, profile });
    try {
      const admin = await User.create({ email: adminEmail, passwordHash: await lockedPasswordHash(), role: "company_admin", companyId: company._id, name: adminName, orgName: name });
      await audit(req, "company.create", {
        targetType: "Company", targetId: company._id.toString(), targetLabel: company.name, companyId: company._id,
        meta: { adminEmail: admin.email },
      });
      await audit(req, "user.create", {
        targetType: "User", targetId: admin._id.toString(), targetLabel: admin.email, companyId: company._id,
        meta: { role: "company_admin" },
      });
      const inviteSent = await invite(req, admin, company.name);
      res.status(201).json({ company: { id: company._id, name: company.name, status: company.status }, admin: { id: admin._id, email: admin.email, name: admin.name }, inviteSent });
    } catch (e) {
      await Company.deleteOne({ _id: company._id }); // roll back the company if the admin fails
      if (e && e.code === 11000) return res.status(409).json({ error: "That admin email is already in use" });
      throw e;
    }
  })
);

// one company: profile + people + what it handles
r.get(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ error: "Not found" });
    const cid = company._id;
    const [users, clients, domains, verified, assets, engagements, openTickets] = await Promise.all([
      User.find({ companyId: cid }).select("email name role status createdAt").sort({ createdAt: 1 }).lean(),
      Client.find({ companyId: cid }).select("name status profile.industry authorization").lean(),
      Domain.countDocuments({ companyId: cid }), Domain.countDocuments({ companyId: cid, verified: true }),
      Asset.countDocuments({ companyId: cid }),
      Engagement.aggregate([{ $match: { companyId: cid } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
      Ticket.countDocuments({ companyId: cid, status: { $in: ["open", "in_progress"] } }),
    ]);
    res.json({
      company: { id: cid, name: company.name, status: company.status, createdAt: company.createdAt },
      profile: company.profile || null, completeness: completeness(company.profile),
      users: users.map((u) => ({ id: u._id, email: u.email, name: u.name, role: u.role, status: u.status || "active" })),
      clients: clients.map((c) => ({ id: c._id, name: c.name, status: c.status || "active", industry: c.profile?.industry || "", authorization: authorizationState(c.authorization) })),
      counts: { domains, verified, assets, openTickets, engagements: Object.fromEntries(engagements.map((e) => [e._id, e.n])) },
    });
  })
);

// edit a company's organisation profile
r.patch(
  "/companies/:id/profile",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const profile = parseProfile(req.body?.profile);
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    company.profile = profile;
    company.name = profile.tradeName || profile.legalName;
    await company.save();
    await audit(req, "company.profile_update", {
      targetType: "Company", targetId: company._id.toString(), targetLabel: company.name, companyId: company._id,
    });
    res.json({ company: { id: company._id, name: company.name, status: company.status }, profile: company.profile, completeness: completeness(company.profile) });
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
    company.status = "suspended"; // every live session of the company is refused from here on
    await company.save();
    await Promise.all([
      User.deleteMany({ companyId: company._id }),
      Client.deleteMany({ companyId: company._id }),
      Domain.deleteMany({ companyId: company._id }),
      Asset.deleteMany({ companyId: company._id }),
      Ticket.deleteMany({ companyId: company._id }),
      Engagement.deleteMany({ companyId: company._id }),
    ]);
    await company.deleteOne();
    await audit(req, "company.delete", {
      targetType: "Company", targetId: company._id.toString(), targetLabel: company.name,
    });
    res.json({ ok: true });
  })
);

// list tenant users (company_admins, employees, self-serve clients) across the platform
const MANAGED_ROLES = ["company_admin", "employee", "client"];
r.get(
  "/users",
  asyncHandler(async (req, res) => {
    if (isBadParam(req.query.role)) return res.status(400).json({ error: "Invalid filter" });
    const { limit, skip } = page(req);
    const role = asString(req.query.role);
    const q = { role: MANAGED_ROLES.includes(role) ? role : { $in: MANAGED_ROLES } };
    const users = await User.find(q).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
    const companies = await Company.find().select("name").lean();
    const cmap = Object.fromEntries(companies.map((c) => [String(c._id), c.name]));
    res.json({
      users: users.map((u) => ({
        id: u._id, email: u.email, name: u.name, role: u.role,
        company: u.companyId ? cmap[String(u.companyId)] || "—" : "Self-serve",
        status: u.status || "active", mustChangePassword: !!u.mustChangePassword, createdAt: u.createdAt,
      })),
    });
  })
);

// find a tenant user an admin may manage — never a super_admin, never yourself
async function managedUser(req, res) {
  if (!isId(req.params.id)) { res.status(400).json({ error: "Invalid id" }); return null; }
  if (req.params.id === req.user.id) { res.status(400).json({ error: "You cannot change your own account here" }); return null; }
  const target = await User.findOne({ _id: req.params.id, role: { $in: MANAGED_ROLES } });
  if (!target) { res.status(404).json({ error: "User not found" }); return null; }
  return target;
}

// disable / re-enable any tenant user (disabling revokes their live sessions)
r.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const status = asString(req.body?.status);
    if (!USER_STATUS.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const target = await managedUser(req, res);
    if (!target) return;
    applyStatus(target, status);
    await target.save();
    await audit(req, status === "disabled" ? "user.disable" : "user.enable", {
      targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId,
      meta: { role: target.role },
    });
    res.json({ user: { id: target._id, email: target.email, status: target.status } });
  })
);

// reset a tenant user's password: current password + sessions die, user gets an emailed set-password link
r.post(
  "/users/:id/reset-password",
  asyncHandler(async (req, res) => {
    const target = await managedUser(req, res);
    if (!target) return;
    if (target.status === "disabled") return res.status(409).json({ error: "Enable the account first" });
    await applyAdminReset(target);
    await target.save();
    let emailSent = true;
    try { await sendAdminReset(target, await issueToken(target, "admin_reset", req.ip)); }
    catch (e) { emailSent = false; console.error("[admin-reset] mail failed:", e.message); }
    await audit(req, "user.password_reset", {
      targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId,
      meta: { role: target.role, emailSent },
    });
    res.json({ user: { id: target._id, email: target.email }, emailSent });
  })
);

/* ===== engagements / scan operations =====
   The human-gated workflow — assign → run (engine) → verify → sign → deliver.
   The scanner itself sits behind engine/index.js (ENGINE_DRIVER=mock|http). */
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

// Before an operator assigns or runs a scan, re-check everything the request
// relied on: the domain still exists, is verified and owned by the same
// tenant, and — for a client's domain — the client is active with a valid,
// in-date authorisation to test. Returns an error message or "".
async function runnableProblem(e) {
  const tenant = e.companyId ? { companyId: e.companyId } : { userId: e.userId };
  const domain = await Domain.findOne({ _id: e.domainId, ...tenant }).select("verified ownerType clientId").lean();
  if (!domain) return "The domain was removed — reject this engagement";
  if (!domain.verified) return "The domain is no longer verified — reject this engagement";
  const domainClient = domain.ownerType === "client" ? String(domain.clientId || "") : "";
  if (String(e.clientId || "") !== domainClient) return "The domain's owner changed after this request — reject it and ask for a new request";
  if (e.clientId) {
    const client = await Client.findOne({ _id: e.clientId, companyId: e.companyId }).select("name status authorization").lean();
    if (!client) return "The client no longer exists — reject this engagement";
    if ((client.status || "active") !== "active") return `Client "${client.name}" is inactive — reject this engagement`;
    if (authorizationState(client.authorization) !== "valid") return `Client "${client.name}" has no valid authorisation to test — reject this engagement`;
  }
  return "";
}

const isOperator = (e, req) => String(e.assignedOperatorId || "") === String(req.user.id);
const NOT_OPERATOR = { error: "Only the assigned operator can do this — assign it to yourself first" };

// assign to self (requested → assigned)
r.post(
  "/engagements/:id/assign",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const cur = await Engagement.findById(req.params.id).lean();
    if (!cur) return res.status(404).json({ error: "Not found" });
    if (cur.status !== "requested") return res.status(409).json({ error: "Only a requested engagement can be assigned" });
    const problem = await runnableProblem(cur);
    if (problem) return res.status(409).json({ error: problem });
    const operatorName = await opName(req.user.id);
    // atomic transition: a concurrent cancel/assign cannot interleave
    const e = await Engagement.findOneAndUpdate(
      { _id: cur._id, status: "requested" },
      { $set: { status: "assigned", assignedOperatorId: req.user.id, operatorName } },
      { new: true }
    );
    if (!e) return res.status(409).json({ error: "This engagement changed meanwhile — reload" });
    await audit(req, "engagement.assign", {
      targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId,
      meta: { operator: e.operatorName },
    });
    res.json({ engagement: e });
  })
);

// run the scan (assigned → in_progress): hands the job to the scan engine
r.post(
  "/engagements/:id/run",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const cur = await Engagement.findById(req.params.id).lean();
    if (!cur) return res.status(404).json({ error: "Not found" });
    const retry = cur.status === "in_progress" && cur.engine?.state === "failed"; // re-run after an engine failure
    if (cur.status !== "assigned" && !retry) return res.status(409).json({ error: "Assign the engagement before running it" });
    if (!isOperator(cur, req)) return res.status(403).json(NOT_OPERATOR);
    const problem = await runnableProblem(cur);
    if (problem) return res.status(409).json({ error: problem });
    const targetProblem = await engine.unsafeTargets(cur);
    if (targetProblem) return res.status(409).json({ error: targetProblem });

    // claim atomically BEFORE calling the engine: a double click cannot start two jobs
    const claim = await Engagement.findOneAndUpdate(
      // older engagements have no engine field at all — $in [ "", null ] matches empty AND missing
      { _id: cur._id, status: cur.status, "engine.state": cur.engine?.state ? cur.engine.state : { $in: ["", null] } },
      { $set: { status: "in_progress", engine: { driver: engine.engineName(), jobId: "", state: "queued", startedAt: new Date() }, findings: [] } },
      { new: true }
    );
    if (!claim) return res.status(409).json({ error: "This engagement changed meanwhile — reload" });
    let r;
    try {
      r = await engine.start(claim);
    } catch (err) {
      // the engine refused / was unreachable: release the claim so the operator can retry
      await Engagement.updateOne({ _id: claim._id }, { $set: { status: cur.status, "engine.state": retry ? "failed" : "", "engine.error": String(err.message || "").slice(0, 300) } });
      throw err;
    }
    claim.engine.jobId = r.jobId;
    engine.applyResult(claim, r);
    await claim.save();
    await audit(req, "engagement.run", {
      targetType: "Engagement", targetId: claim._id.toString(), targetLabel: claim.domainName, companyId: claim.companyId,
      meta: { engine: claim.engine.driver, jobId: claim.engine.jobId, state: claim.engine.state, findings: claim.findings.length },
    });
    res.json({ engagement: claim });
  })
);

// pull the latest status/findings from the engine (for engines that do not call back)
r.post(
  "/engagements/:id/sync",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Not found" });
    if (e.status !== "in_progress" || !e.engine?.jobId) return res.status(409).json({ error: "This engagement has no running scan" });
    if (["completed", "failed"].includes(e.engine.state)) return res.json({ engagement: e });
    engine.applyResult(e, await engine.poll(e));
    await e.save();
    res.json({ engagement: e });
  })
);

// human review of ONE finding: verify it (with proof checked) or reject it as a false positive
r.post(
  "/engagements/:id/findings/:fid",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id) || !isId(req.params.fid)) return res.status(400).json({ error: "Invalid id" });
    const decision = asString(req.body?.decision);
    if (!["verified", "rejected"].includes(decision)) return res.status(400).json({ error: "Decision must be verified or rejected" });
    const note = asString(req.body?.note).trim().slice(0, 1000);
    if (decision === "rejected" && !note) return res.status(400).json({ error: "Say why the finding is rejected" });
    const e = await Engagement.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Not found" });
    if (e.status !== "in_progress") return res.status(409).json({ error: "Findings can only be reviewed while the engagement is in progress" });
    if (e.engine?.state && e.engine.state !== "completed") return res.status(409).json({ error: "Wait for the scan to complete" });
    if (!isOperator(e, req)) return res.status(403).json(NOT_OPERATOR);
    const f = e.findings.id(req.params.fid);
    if (!f) return res.status(404).json({ error: "Finding not found" });
    f.review = decision;
    f.reviewNote = note;
    f.reviewedAt = new Date();
    f.reviewedByName = await opName(req.user.id);
    await e.save();
    await audit(req, "engagement.finding_review", {
      targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId,
      meta: { finding: f.title.slice(0, 120), decision },
    });
    res.json({ engagement: e });
  })
);

// sign & deliver (in_progress → delivered): only after every finding was reviewed by the operator;
// only VERIFIED findings reach the tenant
r.post(
  "/engagements/:id/sign",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Not found" });
    if (e.status !== "in_progress") return res.status(409).json({ error: "Run the engagement before signing" });
    if (e.engine?.state && e.engine.state !== "completed") return res.status(409).json({ error: `The scan is ${e.engine.state} — wait for it to complete before signing` });
    if (!isOperator(e, req)) return res.status(403).json(NOT_OPERATOR);
    const pending = e.findings.filter((f) => (f.review || "pending") === "pending").length;
    if (pending) return res.status(409).json({ error: `Review every finding first — ${pending} still pending` });
    const verified = e.findings.filter((f) => f.review === "verified").map((f) => ({ ...f.toObject(), verified: true }));
    const rejected = e.findings.length - verified.length;
    const signedByName = await opName(req.user.id);
    const done = await Engagement.findOneAndUpdate(
      { _id: e._id, status: "in_progress" },
      { $set: { status: "delivered", findings: verified, rejectedCount: rejected, signedBy: req.user.id, signedByName, signedAt: new Date() } },
      { new: true }
    );
    if (!done) return res.status(409).json({ error: "This engagement changed meanwhile — reload" });
    await audit(req, "engagement.sign", {
      targetType: "Engagement", targetId: done._id.toString(), targetLabel: done.domainName, companyId: done.companyId,
      meta: { findings: verified.length, rejected, signedBy: signedByName },
    });
    res.json({ engagement: done });
  })
);

// reject a request (requested/assigned → rejected)
r.post(
  "/engagements/:id/reject",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const reason = asString(req.body?.reason).slice(0, 500);
    const e = await Engagement.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["requested", "assigned"] } },
      { $set: { status: "rejected", reason } },
      { new: true }
    );
    if (!e) {
      const exists = await Engagement.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({ error: exists ? "This engagement cannot be rejected" : "Not found" });
    }
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
    const src = asString(req.query.source);
    if (["contact", "pricing"].includes(src)) q.source = src;
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
    if (target.role === "company_admin" && (await User.countDocuments({ companyId: target.companyId, role: "company_admin" })) <= 1) {
      return res.status(409).json({ error: "This is the company's only admin — add another admin first, or delete the company" });
    }
    await target.deleteOne();
    await audit(req, "user.delete", {
      targetType: "User", targetId: target._id.toString(), targetLabel: target.email, companyId: target.companyId,
      meta: { role: target.role },
    });
    res.json({ ok: true });
  })
);

/* ===== audit log (append-only; super_admin oversight) ===== */
const AUDIT_CATEGORIES = { auth: /^auth\./, company: /^company\./, client: /^client\./, user: /^(user|profile)\./, engagement: /^(engagement|engine)\./, domain: /^domain\./, ticket: /^ticket\./, lead: /^lead\./ };

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
