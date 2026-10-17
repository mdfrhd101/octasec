import { Router } from "express";
import rateLimit from "express-rate-limit";
import Domain from "../models/Domain.js";
import Asset from "../models/Asset.js";
import Client from "../models/Client.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler, isId, asString, isHostname, isBadParam } from "../utils/http.js";
import { scopeFor, ownerStamp, isCompanyUser } from "../utils/tenancy.js";
import { verifyDomainOwnership } from "../utils/verifyDomain.js";

const r = Router();
r.use(auth);

const ENVS = ["production", "staging", "development", "other"];
const CRITS = ["critical", "high", "medium", "low"];
const DOMAINS_MAX = 200;
const PAGE_MAX = 100;

function pageParams(req) {
  const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(asString(req.query.limit), 10) || 50));
  const skip = Math.max(0, parseInt(asString(req.query.skip), 10) || 0);
  return { limit, skip };
}
function cleanName(v) {
  return asString(v).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[\/\\].*$/, "");
}
function cleanTags(v) {
  if (!Array.isArray(v)) v = asString(v).split(",");
  return v.map((t) => asString(t).trim().toLowerCase()).filter(Boolean).slice(0, 12);
}
// a client must belong to the caller's company
async function ownsClient(user, clientId) {
  if (!isId(clientId) || !isCompanyUser(user) || !user.companyId) return false;
  return !!(await Client.exists({ _id: clientId, companyId: user.companyId }));
}

// list (filter by owner: "self" | "all" | a clientId)
r.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isBadParam(req.query.owner)) return res.status(400).json({ error: "Invalid owner filter" });
    const owner = asString(req.query.owner) || "all";
    const q = { ...scopeFor(req.user) };
    if (owner === "self") q.ownerType = "self";
    else if (owner !== "all") {
      if (!isId(owner)) return res.status(400).json({ error: "Invalid owner filter" });
      q.clientId = owner;
    }
    const { limit, skip } = pageParams(req);
    const domains = await Domain.find(q).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
    const ids = domains.map((d) => d._id);
    const counts = ids.length
      ? await Asset.aggregate([{ $match: { domainId: { $in: ids } } }, { $group: { _id: "$domainId", n: { $sum: 1 } } }])
      : [];
    const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({ domains: domains.map((d) => ({ ...d, assetCount: map[String(d._id)] || 0 })) });
  })
);

// add a domain (generates a unique verification file + token)
r.post(
  "/",
  asyncHandler(async (req, res) => {
    const name = cleanName(req.body?.name);
    if (!isHostname(name)) return res.status(400).json({ error: "Enter a valid domain (e.g. example.com)" });
    let ownerType = asString(req.body?.ownerType) === "client" ? "client" : "self";
    let clientId = null;
    if (ownerType === "client") {
      clientId = asString(req.body?.clientId);
      if (!(await ownsClient(req.user, clientId))) return res.status(400).json({ error: "Unknown client" });
    }
    const env = ENVS.includes(asString(req.body?.env)) ? req.body.env : "production";
    const criticality = CRITS.includes(asString(req.body?.criticality)) ? req.body.criticality : "medium";
    if ((await Domain.countDocuments(scopeFor(req.user))) >= DOMAINS_MAX) {
      return res.status(409).json({ error: "Domain limit reached" });
    }
    try {
      const domain = await Domain.create({
        ...ownerStamp(req.user), name, ownerType, clientId, env, criticality,
        label: asString(req.body?.label).trim().slice(0, 80),
        contact: asString(req.body?.contact).trim().slice(0, 120),
        notes: asString(req.body?.notes).trim().slice(0, 500),
        tags: cleanTags(req.body?.tags),
        verifyToken: Domain.freshToken(48), verifyFile: Domain.freshFile(),
      });
      res.status(201).json({ domain });
    } catch (e) {
      if (e && e.code === 11000) return res.status(409).json({ error: "Domain already added" });
      throw e;
    }
  })
);

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const domain = await Domain.findOne({ _id: req.params.id, ...scopeFor(req.user) });
    if (!domain) return res.status(404).json({ error: "Not found" });
    const ownerType = asString(req.body?.ownerType);
    if (ownerType === "client") {
      const clientId = asString(req.body?.clientId);
      if (!(await ownsClient(req.user, clientId))) return res.status(400).json({ error: "Unknown client" });
      domain.ownerType = "client";
      domain.clientId = clientId;
    } else if (ownerType === "self") {
      domain.ownerType = "self";
      domain.clientId = null;
    }
    await domain.save();
    res.json({ domain });
  })
);

const verifyLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many verification attempts. Try again later." } });
r.post(
  "/:id/verify",
  verifyLimiter,
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const domain = await Domain.findOne({ _id: req.params.id, ...scopeFor(req.user) });
    if (!domain) return res.status(404).json({ error: "Not found" });
    if (domain.verified) return res.json({ verified: true, domain });
    const result = await verifyDomainOwnership(domain.name, domain.verifyFile, domain.verifyToken);
    if (result.verified) {
      domain.verified = true;
      domain.verifiedAt = new Date();
      await domain.save();
      return res.json({ verified: true, domain });
    }
    res.status(422).json({ verified: false, reason: "Could not find a matching verification file on the domain." });
  })
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const domain = await Domain.findOneAndDelete({ _id: req.params.id, ...scopeFor(req.user) });
    if (!domain) return res.status(404).json({ error: "Not found" });
    await Asset.deleteMany({ domainId: domain._id });
    res.json({ ok: true });
  })
);

export default r;
