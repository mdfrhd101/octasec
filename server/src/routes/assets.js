import { Router } from "express";
import Asset from "../models/Asset.js";
import Domain from "../models/Domain.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler, isId, asString, isHostname, isBadParam } from "../utils/http.js";
import { scopeFor, ownerStamp } from "../utils/tenancy.js";
import * as engine from "../engine/index.js";
import Engagement from "../models/Engagement.js";
import { audit } from "../utils/audit.js";

const r = Router();
r.use(auth);

// Discovery runs in the scan engine (engine/index.js, ENGINE_DRIVER=mock|http).
const PAGE_MAX = 200;
// an asset always lands in the tenant that owns the domain
const ownerOf = (domain, user) => (domain.companyId ? { userId: user.id, companyId: domain.companyId } : { userId: domain.userId, companyId: null });
const ASSETS_PER_DOMAIN_MAX = 500;

async function ownedDomain(user, domainId) {
  if (!isId(domainId)) return null;
  return Domain.findOne({ _id: domainId, ...scopeFor(user) });
}

// list assets (optionally by domain)
r.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isBadParam(req.query.domainId)) return res.status(400).json({ error: "Invalid domainId" });
    const q = { ...scopeFor(req.user) };
    const domainId = asString(req.query.domainId);
    if (domainId) {
      if (!isId(domainId)) return res.status(400).json({ error: "Invalid domainId" });
      q.domainId = domainId;
    }
    const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(asString(req.query.limit), 10) || 100));
    const skip = Math.max(0, parseInt(asString(req.query.skip), 10) || 0);
    const assets = await Asset.find(q).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
    res.json({ assets });
  })
);

// "Look for assets" on a verified domain — subdomain enumeration + fingerprinting by the engine
r.post(
  "/discover",
  asyncHandler(async (req, res) => {
    const domain = await ownedDomain(req.user, asString(req.body?.domainId));
    if (!domain) return res.status(404).json({ error: "Domain not found" });
    if (!domain.verified) return res.status(409).json({ error: "Verify the domain first" });
    const found = await engine.discover(domain.name); // in-scope hosts only
    const room = Math.max(0, ASSETS_PER_DOMAIN_MAX - (await Asset.countDocuments({ domainId: domain._id })));
    const created = [];
    for (const a of found.slice(0, room)) {
      try {
        created.push(await Asset.create({ ...ownerOf(domain, req.user), domainId: domain._id, host: a.host, tech: a.tech, status: "unscanned" }));
      } catch (e) {
        if (!(e && e.code === 11000)) throw e; // ignore already-known hosts
      }
    }
    res.json({ discovered: created.length, assets: created, mock: engine.engineName() === "mock" });
  })
);

// manual add asset
r.post(
  "/",
  asyncHandler(async (req, res) => {
    const domain = await ownedDomain(req.user, asString(req.body?.domainId));
    if (!domain) return res.status(404).json({ error: "Domain not found" });
    if (!domain.verified) return res.status(409).json({ error: "Verify the domain first" });
    const host = asString(req.body?.host).trim().toLowerCase();
    if (!isHostname(host)) return res.status(400).json({ error: "Enter a valid host" });
    // the host must be the domain itself or a subdomain of it — never an
    // arbitrary/third-party/internal host (this is what the scanner will hit)
    if (host !== domain.name && !host.endsWith("." + domain.name)) {
      return res.status(400).json({ error: `Host must be ${domain.name} or a subdomain of it` });
    }
    if ((await Asset.countDocuments({ domainId: domain._id })) >= ASSETS_PER_DOMAIN_MAX) {
      return res.status(409).json({ error: "Asset limit reached for this domain" });
    }
    try {
      const asset = await Asset.create({ ...ownerOf(domain, req.user), domainId: domain._id, host, tech: [] });
      res.status(201).json({ asset });
    } catch (e) {
      if (e && e.code === 11000) return res.status(409).json({ error: "Host already added" });
      throw e;
    }
  })
);

// remove an asset (not while a scan is open on its domain — the scan's target list was snapshotted)
r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const asset = await Asset.findOne({ _id: req.params.id, ...scopeFor(req.user) });
    if (!asset) return res.status(404).json({ error: "Not found" });
    if (await Engagement.exists({ domainId: asset.domainId, status: { $in: ["requested", "assigned", "in_progress"] } })) {
      return res.status(409).json({ error: "This domain has an open scan — remove the asset after it finishes" });
    }
    await asset.deleteOne();
    await audit(req, "asset.delete", { targetType: "Asset", targetId: asset._id.toString(), targetLabel: asset.host, companyId: asset.companyId });
    res.json({ ok: true });
  })
);

export default r;
