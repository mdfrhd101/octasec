import { Router } from "express";
import rateLimit from "express-rate-limit";
import Domain from "../models/Domain.js";
import Asset from "../models/Asset.js";
import Client from "../models/Client.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler, isId, asString, isHostname, isBadParam } from "../utils/http.js";
import { scopeFor, ownerStamp, isCompanyUser } from "../utils/tenancy.js";
import { verifyDomainOwnership, isClaimableDomain } from "../utils/verifyDomain.js";
import Engagement from "../models/Engagement.js";
import { audit } from "../utils/audit.js";
import { canonicalHost } from "../utils/canonicalHost.js";
import { upsertAssets } from "../utils/assetInventory.js";
import * as engine from "../engine/index.js";

const OPEN_STATES = ["requested", "assigned", "in_progress"];

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
  const host = asString(v).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[\/\\].*$/, "");
  return canonicalHost(host); // www.example.com and example.com are the same site — store the apex
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
    if (!isClaimableDomain(name)) return res.status(400).json({ error: "That is a shared platform / public-suffix name — add your own domain (e.g. yourapp.com)" });
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
    const body = req.body || {};

    // descriptive details (label, environment, criticality, contact, tags, notes) — any subset
    const meta = {};
    if ("label" in body) meta.label = asString(body.label).trim().slice(0, 80);
    if ("contact" in body) meta.contact = asString(body.contact).trim().slice(0, 120);
    if ("notes" in body) meta.notes = asString(body.notes).trim().slice(0, 500);
    if ("tags" in body) meta.tags = cleanTags(body.tags);
    if ("env" in body) {
      if (!ENVS.includes(asString(body.env))) return res.status(400).json({ error: "Invalid environment" });
      meta.env = body.env;
    }
    if ("criticality" in body) {
      if (!CRITS.includes(asString(body.criticality))) return res.status(400).json({ error: "Invalid criticality" });
      meta.criticality = body.criticality;
    }
    const saveMeta = async () => {
      if (!Object.keys(meta).length) return;
      domain.set(meta);
      await domain.save();
      await audit(req, "domain.update", {
        targetType: "Domain", targetId: domain._id.toString(), targetLabel: domain.name, companyId: domain.companyId,
        meta: { fields: Object.keys(meta) },
      });
    };

    const ownerType = asString(body.ownerType);
    const from = domain.ownerType === "client" ? String(domain.clientId) : "self";
    const to = ownerType === "client" ? asString(body.clientId) : "self";
    if (!["client", "self"].includes(ownerType) || from === to) {
      await saveMeta();
      return res.json({ domain });
    }

    // ownership decides whose authorisation-to-test applies, so changes are tightly controlled:
    // a client's domain can never become "your own" (that would skip the client's authorisation)
    if (from !== "self" && to === "self") {
      return res.status(409).json({ error: "A client's domain cannot be moved to your own organisation. Contact OctaSec support if it was assigned by mistake." });
    }
    if (from !== "self" && req.user.role !== "company_admin") {
      return res.status(403).json({ error: "Only a company admin can move a domain between clients" });
    }
    if (await Engagement.exists({ domainId: domain._id, status: { $in: OPEN_STATES } })) {
      return res.status(409).json({ error: "This domain has an open scan — finish or cancel it first" });
    }
    if (to !== "self" && !(await ownsClient(req.user, to))) return res.status(400).json({ error: "Unknown client" });
    domain.set(meta);
    domain.ownerType = to === "self" ? "self" : "client";
    domain.clientId = to === "self" ? null : to;
    if (from !== "self") { domain.verified = false; domain.verifiedAt = null; } // moving between clients requires re-verification
    await domain.save();
    await audit(req, "domain.reassign", {
      targetType: "Domain", targetId: domain._id.toString(), targetLabel: domain.name, companyId: domain.companyId,
      meta: { from, to, reverify: from !== "self" },
    });
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
      await audit(req, "domain.verify", { targetType: "Domain", targetId: domain._id.toString(), targetLabel: domain.name, companyId: domain.companyId });
      // A freshly verified domain should never be empty: seed its own host as an asset
      // right away (cheap, so awaited — but guarded so a seed hiccup can't un-verify it).
      await upsertAssets(domain, req.user, [{ host: domain.name, tech: [] }]).catch((e) =>
        console.error("[domains] self-asset seed failed:", e?.message));
      // Then enumerate subdomains in the background. Discovery calls the scan engine, so a
      // failure must NEVER fail verification — fire-and-forget with a logging .catch,
      // exactly like the contact-form notification.
      engine
        .discover(domain.name)
        .then((found) => upsertAssets(domain, req.user, found))
        .catch((e) => console.error("[domains] asset discovery failed:", e?.message));
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
    // nothing may be scanned against a domain that is gone
    const cancelled = await Engagement.updateMany({ domainId: domain._id, status: { $in: OPEN_STATES } }, { $set: { status: "cancelled", reason: "Domain removed by the tenant" } });
    await audit(req, "domain.delete", {
      targetType: "Domain", targetId: domain._id.toString(), targetLabel: domain.name, companyId: domain.companyId,
      meta: { cancelledEngagements: cancelled.modifiedCount },
    });
    res.json({ ok: true });
  })
);

export default r;
