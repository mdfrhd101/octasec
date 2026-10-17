import { Router } from "express";
import mongoose from "mongoose";
import Client from "../models/Client.js";
import Domain from "../models/Domain.js";
import Engagement from "../models/Engagement.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, asString, isId } from "../utils/http.js";
import { audit } from "../utils/audit.js";
import { parseProfile, parseAuthorization, authorizationState, completeness } from "../utils/profile.js";

const r = Router();
// company_admin + employee manage the company's clients
r.use(auth, requireRole("company_admin", "employee"));

const CLIENTS_MAX = 500;
const STATUS = ["active", "inactive"];

// summary row for the list / dashboard
function row(c, counts = {}) {
  const p = c.profile || {};
  return {
    _id: c._id, name: c.name, status: c.status || "active",
    industry: p.industry || "", country: p.country || "",
    primaryContact: p.contacts?.primary?.name ? { name: p.contacts.primary.name, email: p.contacts.primary.email } : null,
    authorization: authorizationState(c.authorization), authorizationValidUntil: c.authorization?.validUntil || null,
    completeness: completeness(c.profile).pct,
    domainCount: counts.domainCount || 0, assetCount: counts.assetCount || 0,
    createdAt: c.createdAt,
  };
}

// validate a create/update body. Legacy callers may send just { name } (no profile).
function parseBody(body) {
  const hasProfile = body?.profile !== undefined;
  const profile = hasProfile ? parseProfile(body.profile) : undefined;
  const name = profile ? profile.tradeName || profile.legalName : asString(body?.name).trim();
  if (!name) { const e = new Error("Client name required"); e.status = 400; throw e; }
  if (name.length > 120) { const e = new Error("Name too long"); e.status = 400; throw e; }
  const status = body?.status === undefined ? "active" : asString(body.status);
  if (!STATUS.includes(status)) { const e = new Error("Invalid status"); e.status = 400; throw e; }
  return { name, profile, status, authorization: parseAuthorization(body?.authorization) };
}

// list clients + live domain/asset counts (single aggregation, no N+1)
r.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.json({ clients: [] });
    const clients = await Client.find({ companyId: req.user.companyId }).sort({ createdAt: 1 }).lean();
    if (!clients.length) return res.json({ clients: [] });
    const agg = await Domain.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(req.user.companyId), ownerType: "client", clientId: { $ne: null } } },
      { $lookup: { from: "assets", localField: "_id", foreignField: "domainId", as: "a" } },
      { $group: { _id: "$clientId", domainCount: { $sum: 1 }, assetCount: { $sum: { $size: "$a" } } } },
    ]);
    const map = Object.fromEntries(agg.map((d) => [String(d._id), d]));
    res.json({ clients: clients.map((c) => row(c, map[String(c._id)])) });
  })
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(403).json({ error: "No company context" });
    const b = parseBody(req.body);
    if ((await Client.countDocuments({ companyId: req.user.companyId })) >= CLIENTS_MAX) {
      return res.status(409).json({ error: "Client limit reached" });
    }
    const client = await Client.create({ companyId: req.user.companyId, ...b });
    await audit(req, "client.create", {
      targetType: "Client", targetId: client._id.toString(), targetLabel: client.name, companyId: client.companyId,
    });
    res.status(201).json({ client });
  })
);

// full record (profile + authorisation) + its domains and engagement history
r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const client = await Client.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
    if (!client) return res.status(404).json({ error: "Not found" });
    const domains = await Domain.find({ companyId: req.user.companyId, clientId: client._id })
      .select("name verified env criticality createdAt").lean();
    // history follows the client that was authorised AT REQUEST TIME (stored on the engagement)
    const engagements = await Engagement.find({ companyId: req.user.companyId, clientId: client._id })
      .sort({ createdAt: -1 }).limit(20).select("domainName status createdAt signedAt findings.severity").lean();
    res.json({
      client: { ...client, authorizationState: authorizationState(client.authorization), completeness: completeness(client.profile) },
      domains,
      engagements: engagements.map((e) => ({ id: e._id, domainName: e.domainName, status: e.status, createdAt: e.createdAt, signedAt: e.signedAt, findings: e.status === "delivered" ? e.findings.length : 0 })),
    });
  })
);

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const client = await Client.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!client) return res.status(404).json({ error: "Not found" });
    const before = { status: client.status, onFile: !!client.authorization?.onFile, validUntil: client.authorization?.validUntil ? new Date(client.authorization.validUntil).toISOString().slice(0, 10) : "", ref: client.authorization?.documentRef || "" };
    // partial update: only the groups present in the body change
    const body = req.body || {};
    if (body.profile !== undefined) {
      client.profile = parseProfile(body.profile);
      client.name = client.profile.tradeName || client.profile.legalName;
    } else if (body.name !== undefined) {
      client.name = parseBody({ name: body.name }).name;
    }
    if (body.status !== undefined) {
      if (!STATUS.includes(asString(body.status))) return res.status(400).json({ error: "Invalid status" });
      client.status = body.status;
    }
    if (body.authorization !== undefined) client.authorization = parseAuthorization(body.authorization);
    await client.save();
    await audit(req, "client.update", {
      targetType: "Client", targetId: client._id.toString(), targetLabel: client.name, companyId: client.companyId,
      meta: {
        status: client.status, authState: authorizationState(client.authorization),
        onFileBefore: before.onFile, onFileAfter: !!client.authorization?.onFile,
        validUntilBefore: before.validUntil, validUntilAfter: client.authorization?.validUntil ? new Date(client.authorization.validUntil).toISOString().slice(0, 10) : "",
        docRefBefore: before.ref, docRefAfter: client.authorization?.documentRef || "",
      },
    });
    res.json({ client });
  })
);

export default r;
