import { Router } from "express";
import rateLimit from "express-rate-limit";
import Engagement from "../models/Engagement.js";
import Domain from "../models/Domain.js";
import Asset from "../models/Asset.js";
import User from "../models/User.js";
import Client from "../models/Client.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, isId, asString, isBadParam } from "../utils/http.js";
import { scopeFor, ownerStamp } from "../utils/tenancy.js";
import { audit } from "../utils/audit.js";
import { parseScoping } from "../utils/scoping.js";
import { authorizationState } from "../utils/profile.js";
import { inScope } from "../engine/normalize.js";

const r = Router();
r.use(auth);

const INTENSITY = ["safe", "standard", "aggressive"];
const OPEN_STATES = ["requested", "assigned", "in_progress"];
const STATUSES = ["requested", "assigned", "in_progress", "delivered", "rejected", "cancelled"];
const ENGAGEMENTS_MAX = 500;
const REVERIFY_DAYS = 90;

// What a tenant may see of an engagement — never operator ids, engine internals
// or un-reviewed findings.
function tenantView(e) {
  const delivered = e.status === "delivered";
  return {
    _id: e._id, id: e._id, domainName: e.domainName, status: e.status, targets: e.targets || [],
    roe: e.roe, scoping: e.scoping, clientId: e.clientId || null,
    engine: e.engine?.state ? { state: e.engine.state, progress: e.engine.progress ?? null } : null,
    operatorName: e.operatorName || "", reason: e.reason || "",
    signedByName: e.signedByName || "", signedAt: e.signedAt || null,
    findings: delivered ? (e.findings || []).map((f) => ({
      _id: f._id, title: f.title, severity: f.severity, cvss: f.cvss, owasp: f.owasp, cwe: f.cwe,
      detail: f.detail, fix: f.fix, evidence: f.evidence, host: f.host, verified: f.verified,
    })) : [],
    rejectedCount: delivered ? e.rejectedCount || 0 : 0,
    createdAt: e.createdAt, updatedAt: e.updatedAt,
  };
}

// list the tenant's engagements (finding counts only once delivered)
r.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isBadParam(req.query.status)) return res.status(400).json({ error: "Invalid status" });
    const q = { ...scopeFor(req.user) };
    const st = asString(req.query.status);
    if (st === "open") q.status = { $in: OPEN_STATES };
    else if (STATUSES.includes(st)) q.status = st;
    else if (st) return res.status(400).json({ error: "Invalid status" });
    const engagements = await Engagement.aggregate([
      { $match: q }, { $sort: { createdAt: -1 } }, { $limit: 200 },
      { $project: {
        domainName: 1, status: 1, intensity: "$roe.intensity", createdAt: 1, updatedAt: 1, signedAt: 1,
        targets: { $size: { $ifNull: ["$targets", []] } },
        findings: { $cond: [{ $eq: ["$status", "delivered"] }, { $size: { $ifNull: ["$findings", []] } }, 0] },
      } },
    ]);
    res.json({ engagements: engagements.map((e) => ({ id: e._id, ...e, _id: undefined })) });
  })
);

// view one
r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findOne({ _id: req.params.id, ...scopeFor(req.user) }).lean();
    if (!e) return res.status(404).json({ error: "Not found" });
    res.json({ engagement: tenantView(e) });
  })
);

// a tenant can't flood the operator queue
const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => "u:" + req.user.id,
  message: { error: "Too many scan requests — try again later." },
});

// request a scan engagement (tenants only — operators work the queue, they don't file requests)
r.post(
  "/",
  requireRole("company_admin", "employee", "client"),
  requestLimiter,
  asyncHandler(async (req, res) => {
    const domainId = asString(req.body?.domainId);
    if (!isId(domainId)) return res.status(400).json({ error: "Invalid domain" });
    const domain = await Domain.findOne({ _id: domainId, ...scopeFor(req.user) });
    if (!domain) return res.status(404).json({ error: "Domain not found" });
    if (!domain.verified) return res.status(409).json({ error: "Verify the domain before requesting a scan" });
    if (!domain.verifiedAt || Date.now() - new Date(domain.verifiedAt).getTime() > REVERIFY_DAYS * 86400000) {
      domain.verified = false; await domain.save();
      return res.status(409).json({ error: `Ownership was last verified over ${REVERIFY_DAYS} days ago — verify the domain again first` });
    }

    const roe = req.body?.roe && typeof req.body.roe === "object" ? req.body.roe : {};
    if (roe.authorized !== true) return res.status(400).json({ error: "You must confirm authorization to test" });
    const intensity = INTENSITY.includes(asString(roe.intensity)) ? roe.intensity : "standard";
    const authorizerName = asString(roe.authorizerName).trim().slice(0, 80);
    const authorizerTitle = asString(roe.authorizerTitle).trim().slice(0, 80);
    if (!authorizerName || !authorizerTitle) return res.status(400).json({ error: "Authoriser name and title are required" });
    const scoping = parseScoping(req.body?.scoping);
    if (scoping.apiDocsUrl && !inScope(new URL(scoping.apiDocsUrl).hostname.toLowerCase(), domain.name)) {
      return res.status(400).json({ error: `The API docs URL must be on ${domain.name} or one of its subdomains` });
    }

    // an MSSP may only test a client's assets with that client's valid written authorisation,
    // and that authorisation must cover the requested test dates
    let clientId = null;
    if (domain.ownerType === "client" && domain.clientId) {
      const client = await Client.findOne({ _id: domain.clientId, companyId: domain.companyId }).select("name status authorization").lean();
      if (!client) return res.status(409).json({ error: "This domain's client no longer exists" });
      if ((client.status || "active") !== "active") return res.status(409).json({ error: `Client "${client.name}" is inactive` });
      const st = authorizationState(client.authorization);
      if (st !== "valid") {
        return res.status(409).json({ error: st === "expired"
          ? `Client "${client.name}" authorisation to test has expired — renew it on the client record`
          : `Record client "${client.name}" authorisation to test before requesting a scan` });
      }
      const until = client.authorization.validUntil ? new Date(client.authorization.validUntil) : null;
      const lastDay = scoping.deadline || scoping.preferredStart;
      if (until && lastDay > until) {
        return res.status(409).json({ error: `Client "${client.name}" authorisation ends ${until.toISOString().slice(0, 10)} — before the requested test dates` });
      }
      clientId = client._id;
    }

    if (await Engagement.exists({ domainId: domain._id, status: { $in: OPEN_STATES } })) {
      return res.status(409).json({ error: "This domain already has an open scan request" });
    }
    if ((await Engagement.countDocuments({ ...scopeFor(req.user), status: { $in: OPEN_STATES } })) >= ENGAGEMENTS_MAX) {
      return res.status(409).json({ error: "You already have the maximum number of open engagements" });
    }

    // snapshot the in-scope hosts (the domain's assets), bounded
    const assets = await Asset.find({ domainId: domain._id }).select("host").limit(500).lean();
    const targets = assets.map((a) => a.host).filter((h) => inScope(h, domain.name));
    if (!targets.length) targets.push(domain.name);

    const me = await User.findById(req.user.id).select("email").lean();
    const engagement = await Engagement.create({
      ...ownerStamp(req.user),
      requestedByEmail: me?.email || "",
      domainId: domain._id, domainName: domain.name, targets,
      roe: { intensity, window: asString(roe.window).slice(0, 120), excludes: asString(roe.excludes).slice(0, 500), authorized: true, authorizerName, authorizerTitle },
      scoping, clientId,
      status: "requested",
    });
    await audit(req, "engagement.request", {
      targetType: "Engagement", targetId: engagement._id.toString(), targetLabel: domain.name, companyId: engagement.companyId,
      meta: { authorizer: authorizerName, environment: scoping.environment, testType: scoping.testType },
    });
    res.status(201).json({ engagement: { id: engagement._id, status: engagement.status, domainName: engagement.domainName } });
  })
);

// cancel a still-pending request (atomic: cannot race an operator's assign)
r.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findOneAndUpdate(
      { _id: req.params.id, ...scopeFor(req.user), status: "requested" },
      { $set: { status: "cancelled", reason: "Cancelled by the requester" } },
      { new: true }
    );
    if (!e) {
      const exists = await Engagement.exists({ _id: req.params.id, ...scopeFor(req.user) });
      return res.status(exists ? 409 : 404).json({ error: exists ? "This engagement can no longer be cancelled" : "Not found" });
    }
    await audit(req, "engagement.cancel", { targetType: "Engagement", targetId: e._id.toString(), targetLabel: e.domainName, companyId: e.companyId });
    res.json({ ok: true });
  })
);

export default r;
