// Role dashboards — every block answers a question that role actually asks.
// Requirements: docs/PORTAL_DATA_AND_DASHBOARDS.md §4.
import { Router } from "express";
import mongoose from "mongoose";
import Domain from "../models/Domain.js";
import Asset from "../models/Asset.js";
import Engagement from "../models/Engagement.js";
import Client from "../models/Client.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import Ticket from "../models/Ticket.js";
import Lead from "../models/Lead.js";
import AuditLog from "../models/AuditLog.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { scopeFor, isCompanyUser } from "../utils/tenancy.js";
import { completeness, authorizationState } from "../utils/profile.js";

const r = Router();
r.use(auth);

const WEIGHT = { critical: 14, high: 7, medium: 2, low: 0.5 };
const DAY = 86400000;
const STALE_DAYS = 90;
const EXPIRY_WINDOW_DAYS = 30;
const PIPE = ["requested", "assigned", "in_progress", "delivered"];
// audit actions a platform operator must see on the Overview
export const SECURITY_EVENTS = [
  "auth.login_fail", "auth.rate_limited", "auth.reset_fail", "auth.verify_fail", "auth.password_change_fail",
  "user.disable", "user.delete", "user.password_reset", "company.suspend", "company.delete",
];

function scoreFrom(sev) {
  let penalty = 0;
  for (const k of Object.keys(WEIGHT)) penalty += (sev[k] || 0) * WEIGHT[k];
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const label = score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "At risk";
  return { score, label };
}

const countBy = (rows) => Object.fromEntries(rows.map((x) => [x._id, x.n]));
const hours = (ms) => Math.round(ms / 3600000);

// posture block shared by every role (scoped)
async function posture(match) {
  const delivered = { ...match, status: "delivered" };
  const [domainCount, verified, assetCount, sevAgg, topFindings, recentAssets, assessedDomains, pipeAgg] = await Promise.all([
    Domain.countDocuments(match),
    Domain.countDocuments({ ...match, verified: true }),
    Asset.countDocuments(match),
    Engagement.aggregate([{ $match: delivered }, { $unwind: "$findings" }, { $match: { "findings.state": { $nin: ["fixed", "accepted_risk"] } } }, { $group: { _id: "$findings.severity", n: { $sum: 1 } } }]),
    Engagement.aggregate([
      { $match: delivered }, { $unwind: "$findings" }, { $match: { "findings.state": { $nin: ["fixed", "accepted_risk"] } } }, { $sort: { "findings.cvss": -1 } }, { $limit: 6 },
      { $project: { _id: 0, host: "$findings.host", title: "$findings.title", severity: "$findings.severity", cvss: "$findings.cvss", owasp: "$findings.owasp" } },
    ]),
    Asset.find(match).sort({ createdAt: -1 }).limit(6).select("host tech status createdAt").lean(),
    Engagement.distinct("domainId", delivered),
    Engagement.aggregate([{ $match: match }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const severity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const s of sevAgg) if (s._id in severity) severity[s._id] = s.n;
  const openFindings = severity.critical + severity.high + severity.medium + severity.low;
  const { score, label } = scoreFrom(severity);
  const assessedPct = domainCount ? Math.round((assessedDomains.length / domainCount) * 100) : 0;
  const p = countBy(pipeAgg);
  return {
    score, scoreLabel: label,
    tiles: { domains: domainCount, verified, assets: assetCount, assessed: assessedDomains.length, openFindings, critical: severity.critical },
    severity,
    coverage: { scannedPct: assessedPct, scanned: assessedDomains.length, assets: domainCount },
    topFindings, recentAssets,
    pipeline: Object.fromEntries(PIPE.map((k) => [k, p[k] || 0])),
  };
}

// verified domains never assessed, or last assessed > STALE_DAYS ago
async function staleDomains(match) {
  const [domains, last] = await Promise.all([
    Domain.find({ ...match, verified: true }).select("name").lean(),
    Engagement.aggregate([{ $match: { ...match, status: "delivered" } }, { $group: { _id: "$domainId", at: { $max: "$signedAt" } } }]),
  ]);
  const lastBy = Object.fromEntries(last.map((x) => [String(x._id), x.at]));
  const cutoff = Date.now() - STALE_DAYS * DAY;
  return domains
    .map((d) => ({ name: d.name, lastAssessed: lastBy[String(d._id)] || null }))
    .filter((d) => !d.lastAssessed || new Date(d.lastAssessed).getTime() < cutoff)
    .slice(0, 8);
}

// company view: per-client risk + authorisation, expiring authorisations
async function companyBlocks(user) {
  const companyId = new mongoose.Types.ObjectId(user.companyId);
  const [clients, domains, delivered, company, openTickets] = await Promise.all([
    Client.find({ companyId }).select("name status authorization").lean(),
    Domain.find({ companyId, clientId: { $ne: null } }).select("clientId verified").lean(),
    Engagement.find({ companyId, status: "delivered" }).sort({ signedAt: -1 }).limit(2000).select("domainId clientId signedAt findings.severity findings.state").lean(),
    Company.findById(companyId).select("profile").lean(),
    Ticket.countDocuments({ companyId, status: { $in: ["open", "in_progress"] } }),
  ]);
  const clientOf = Object.fromEntries(domains.map((d) => [String(d._id), String(d.clientId)]));
  const stats = {};
  for (const c of clients) stats[String(c._id)] = { domains: 0, verified: 0, critical: 0, high: 0, lastAssessed: null };
  for (const d of domains) { const s = stats[String(d.clientId)]; if (s) { s.domains++; if (d.verified) s.verified++; } }
  for (const e of delivered) {
    const s = stats[String(e.clientId || "")] || stats[clientOf[String(e.domainId)]];
    if (!s) continue;
    for (const f of e.findings || []) {
      if (f.state === "fixed" || f.state === "accepted_risk") continue;
      if (f.severity === "critical") s.critical++; if (f.severity === "high") s.high++;
    }
    if (!s.lastAssessed || e.signedAt > s.lastAssessed) s.lastAssessed = e.signedAt;
  }
  const soon = Date.now() + EXPIRY_WINDOW_DAYS * DAY;
  return {
    clients: clients
      .map((c) => ({ id: c._id, name: c.name, status: c.status || "active", authorization: authorizationState(c.authorization), ...stats[String(c._id)] }))
      .sort((a, b) => b.critical - a.critical || b.high - a.high),
    expiringAuth: clients
      .filter((c) => authorizationState(c.authorization) === "valid" && c.authorization.validUntil && new Date(c.authorization.validUntil).getTime() <= soon)
      .map((c) => ({ id: c._id, name: c.name, validUntil: c.authorization.validUntil })),
    profile: completeness(company?.profile),
    openTickets,
  };
}

// super admin: what needs attention on the platform
async function opsBlocks() {
  const now = Date.now();
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [statusAgg, oldest, deliveredMonth, turnaround, ticketAgg, leads7d, leadsNew, riskAgg, companies, badAuthClients, events, users, verified] = await Promise.all([
    Engagement.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Engagement.find({ status: "requested" }).sort({ createdAt: 1 }).limit(5).select("domainName requestedByEmail companyId createdAt").lean(),
    Engagement.countDocuments({ status: "delivered", signedAt: { $gte: monthStart } }),
    Engagement.aggregate([
      { $match: { status: "delivered", signedAt: { $gte: new Date(now - 30 * DAY) } } },
      { $group: { _id: null, avg: { $avg: { $subtract: ["$signedAt", "$createdAt"] } }, n: { $sum: 1 } } },
    ]),
    Ticket.aggregate([{ $match: { status: { $in: ["open", "in_progress"] } } }, { $group: { _id: "$priority", n: { $sum: 1 } } }]),
    Lead.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY) } }),
    Lead.countDocuments({ status: "new" }),
    Engagement.aggregate([
      { $match: { status: "delivered" } }, { $unwind: "$findings" }, { $match: { "findings.severity": { $in: ["critical", "high"] }, "findings.state": { $nin: ["fixed", "accepted_risk"] } } },
      { $group: { _id: { companyId: "$companyId", userId: { $cond: [{ $eq: ["$companyId", null] }, "$userId", null] } }, critical: { $sum: { $cond: [{ $eq: ["$findings.severity", "critical"] }, 1, 0] } }, high: { $sum: { $cond: [{ $eq: ["$findings.severity", "high"] }, 1, 0] } } } },
      { $sort: { critical: -1, high: -1 } }, { $limit: 5 },
    ]),
    Company.find().sort({ createdAt: -1 }).limit(1000).select("name profile status").lean(),
    Client.countDocuments({ $or: [{ "authorization.onFile": { $ne: true } }, { "authorization.validUntil": { $lt: new Date(new Date().setUTCHours(0, 0, 0, 0)) } }] }),
    AuditLog.find({ action: { $in: SECURITY_EVENTS } })
      .sort({ createdAt: -1 }).limit(8).select("action actorEmail targetLabel ip createdAt").lean(),
    // accounts that never confirmed their email are not "clients" yet — counted separately
    User.aggregate([{ $match: { status: { $ne: "pending" } } }, { $group: { _id: "$role", n: { $sum: 1 } } }]),
    Domain.countDocuments({ verified: true }),
  ]);
  const cname = Object.fromEntries(companies.map((c) => [String(c._id), c.name]));
  const st = countBy(statusAgg);
  const requested = st.requested || 0;
  const unassigned24 = await Engagement.countDocuments({ status: "requested", createdAt: { $lt: new Date(now - DAY) } });
  const clientUsers = await User.find({ _id: { $in: riskAgg.filter((x) => !x._id.companyId).map((x) => x._id.userId) } }).select("email orgName").lean();
  const uname = Object.fromEntries(clientUsers.map((u) => [String(u._id), u.orgName || u.email]));
  const incomplete = companies.map((c) => ({ id: c._id, name: c.name, pct: completeness(c.profile).pct })).filter((c) => c.pct < 100);
  return {
    queue: {
      requested, unassigned24,
      oldest: oldest.map((e) => ({ id: e._id, domainName: e.domainName, tenant: e.companyId ? cname[String(e.companyId)] || "—" : e.requestedByEmail, ageHours: hours(now - new Date(e.createdAt).getTime()) })),
    },
    pipeline: { requested: st.requested || 0, assigned: st.assigned || 0, in_progress: st.in_progress || 0, deliveredThisMonth: deliveredMonth },
    turnaroundHours: turnaround[0] ? hours(turnaround[0].avg) : null,
    tickets: { urgent: 0, high: 0, normal: 0, low: 0, ...countBy(ticketAgg) },
    leads: { last7d: leads7d, new: leadsNew },
    tenantsAtRisk: riskAgg.map((x) => ({
      name: x._id.companyId ? cname[String(x._id.companyId)] || "—" : uname[String(x._id.userId)] || "Self-serve client",
      kind: x._id.companyId ? "company" : "client", critical: x.critical, high: x.high,
    })),
    onboarding: {
      incompleteCompanies: incomplete.length, companies: incomplete.slice(0, 5),
      clientsWithoutAuthorization: badAuthClients,
      pendingSignups: await User.countDocuments({ status: "pending" }),
    },
    securityEvents: events.map((e) => ({ action: e.action, actor: e.actorEmail || "—", target: e.targetLabel || "", ip: e.ip || "", at: e.createdAt })),
    totals: { companies: companies.length, users: countBy(users), verifiedDomains: verified },
    generatedAt: new Date(),
  };
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const match = scopeFor(user);
    const base = await posture(match);
    const out = { role: user.role, ...base };

    if (user.role === "super_admin") {
      out.ops = await opsBlocks();
    } else {
      out.stale = await staleDomains(match);
      if (isCompanyUser(user) && user.companyId) {
        Object.assign(out, await companyBlocks(user));
        if (user.role === "employee") {
          const mine = await Engagement.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(user.id) } }, { $group: { _id: "$status", n: { $sum: 1 } } }]);
          out.myRequests = countBy(mine);
        }
      } else {
        const [me, openTickets] = await Promise.all([
          User.findById(user.id).select("profile").lean(),
          Ticket.countDocuments({ companyId: null, openedBy: user.id, status: { $in: ["open", "in_progress"] } }),
        ]);
        out.profile = completeness(me?.profile);
        out.openTickets = openTickets;
        out.unverified = await Domain.countDocuments({ ...match, verified: false });
      }
    }
    res.json(out);
  })
);

export default r;
