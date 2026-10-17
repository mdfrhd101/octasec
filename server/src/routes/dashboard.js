import { Router } from "express";
import Domain from "../models/Domain.js";
import Asset from "../models/Asset.js";
import Engagement from "../models/Engagement.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { scopeFor } from "../utils/tenancy.js";

const r = Router();
r.use(auth);

const WEIGHT = { critical: 14, high: 7, medium: 2, low: 0.5 };

function scoreFrom(sev) {
  let penalty = 0;
  for (const k of Object.keys(WEIGHT)) penalty += (sev[k] || 0) * WEIGHT[k];
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const label = score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "At risk";
  return { score, label };
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const match = scopeFor(req.user);
    const delivered = { ...match, status: "delivered" };

    const [domainCount, verified, assetCount, sevAgg, topFindings, recentAssets, assessedDomains] = await Promise.all([
      Domain.countDocuments(match),
      Domain.countDocuments({ ...match, verified: true }),
      Asset.countDocuments(match),
      // findings live on DELIVERED (signed) engagements, not on assets
      Engagement.aggregate([
        { $match: delivered }, { $unwind: "$findings" },
        { $group: { _id: "$findings.severity", n: { $sum: 1 } } },
      ]),
      Engagement.aggregate([
        { $match: delivered }, { $unwind: "$findings" },
        { $sort: { "findings.cvss": -1 } }, { $limit: 6 },
        { $project: { _id: 0, host: "$findings.host", title: "$findings.title", severity: "$findings.severity", cvss: "$findings.cvss", owasp: "$findings.owasp" } },
      ]),
      Asset.find(match).sort({ createdAt: -1 }).limit(6).select("host tech status createdAt").lean(),
      Engagement.distinct("domainId", delivered),
    ]);

    const severity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const s of sevAgg) if (s._id in severity) severity[s._id] = s.n;
    const openFindings = severity.critical + severity.high + severity.medium + severity.low;
    const { score, label } = scoreFrom(severity);
    const assessedPct = domainCount ? Math.round((assessedDomains.length / domainCount) * 100) : 0;

    res.json({
      role: req.user.role,
      score, scoreLabel: label,
      tiles: { domains: domainCount, verified, assets: assetCount, assessed: assessedDomains.length, openFindings, critical: severity.critical },
      severity,
      coverage: { scannedPct: assessedPct, scanned: assessedDomains.length, assets: domainCount },
      topFindings,
      recentAssets,
    });
  })
);

export default r;
