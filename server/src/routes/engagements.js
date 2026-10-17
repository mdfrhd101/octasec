import { Router } from "express";
import Engagement from "../models/Engagement.js";
import Domain from "../models/Domain.js";
import Asset from "../models/Asset.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler, isId, asString, isBadParam } from "../utils/http.js";
import { scopeFor, ownerStamp } from "../utils/tenancy.js";

const r = Router();
r.use(auth);

const INTENSITY = ["safe", "standard", "aggressive"];
const OPEN_STATES = ["requested", "assigned", "in_progress"];
const ENGAGEMENTS_MAX = 500;

// list the tenant's engagements
r.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isBadParam(req.query.status)) return res.status(400).json({ error: "Invalid status" });
    const q = { ...scopeFor(req.user) };
    const st = asString(req.query.status);
    if (st === "open") q.status = { $in: OPEN_STATES };
    else if (st) q.status = st;
    const engagements = await Engagement.find(q).sort({ createdAt: -1 }).limit(200)
      .select("domainName status roe.intensity targets createdAt updatedAt signedAt findings").lean();
    res.json({
      engagements: engagements.map((e) => ({
        id: e._id, domainName: e.domainName, status: e.status, intensity: e.roe?.intensity,
        targets: e.targets?.length || 0, findings: e.findings?.length || 0,
        createdAt: e.createdAt, updatedAt: e.updatedAt, signedAt: e.signedAt,
      })),
    });
  })
);

// view one (tenant only sees delivered findings)
r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findOne({ _id: req.params.id, ...scopeFor(req.user) }).lean();
    if (!e) return res.status(404).json({ error: "Not found" });
    // hide un-delivered (unsigned) findings from the tenant
    if (e.status !== "delivered") e.findings = [];
    res.json({ engagement: e });
  })
);

// request a scan engagement
r.post(
  "/",
  asyncHandler(async (req, res) => {
    const domainId = asString(req.body?.domainId);
    if (!isId(domainId)) return res.status(400).json({ error: "Invalid domain" });
    const domain = await Domain.findOne({ _id: domainId, ...scopeFor(req.user) });
    if (!domain) return res.status(404).json({ error: "Domain not found" });
    if (!domain.verified) return res.status(409).json({ error: "Verify the domain before requesting a scan" });

    const roe = req.body?.roe || {};
    if (roe.authorized !== true) return res.status(400).json({ error: "You must confirm authorization to test" });
    const intensity = INTENSITY.includes(asString(roe.intensity)) ? roe.intensity : "standard";

    if ((await Engagement.countDocuments({ ...scopeFor(req.user), status: { $in: OPEN_STATES } })) >= ENGAGEMENTS_MAX) {
      return res.status(409).json({ error: "You already have the maximum number of open engagements" });
    }

    // snapshot the in-scope hosts (the domain's assets), bounded
    const assets = await Asset.find({ domainId: domain._id }).select("host").limit(500).lean();
    const targets = assets.map((a) => a.host);
    if (!targets.length) targets.push(domain.name);

    const me = await User.findById(req.user.id).select("email").lean();
    const engagement = await Engagement.create({
      ...ownerStamp(req.user),
      requestedByEmail: me?.email || "",
      domainId: domain._id, domainName: domain.name, targets,
      roe: { intensity, window: asString(roe.window).slice(0, 120), excludes: asString(roe.excludes).slice(0, 500), authorized: true },
      status: "requested",
    });
    res.status(201).json({ engagement: { id: engagement._id, status: engagement.status, domainName: engagement.domainName } });
  })
);

// cancel a still-pending request
r.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const e = await Engagement.findOne({ _id: req.params.id, ...scopeFor(req.user) });
    if (!e) return res.status(404).json({ error: "Not found" });
    if (e.status !== "requested") return res.status(409).json({ error: "This engagement can no longer be cancelled" });
    e.status = "cancelled";
    await e.save();
    res.json({ ok: true });
  })
);

export default r;
