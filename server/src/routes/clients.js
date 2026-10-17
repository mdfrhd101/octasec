import { Router } from "express";
import mongoose from "mongoose";
import Client from "../models/Client.js";
import Domain from "../models/Domain.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, asString } from "../utils/http.js";

const r = Router();
// company_admin + employee manage the company's clients
r.use(auth, requireRole("company_admin", "employee"));

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
    res.json({
      clients: clients.map((c) => ({
        ...c,
        domainCount: map[String(c._id)]?.domainCount || 0,
        assetCount: map[String(c._id)]?.assetCount || 0,
      })),
    });
  })
);

const CLIENTS_MAX = 500;

r.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(403).json({ error: "No company context" });
    const name = asString(req.body?.name).trim();
    if (!name) return res.status(400).json({ error: "Client name required" });
    if (name.length > 120) return res.status(400).json({ error: "Name too long" });
    if ((await Client.countDocuments({ companyId: req.user.companyId })) >= CLIENTS_MAX) {
      return res.status(409).json({ error: "Client limit reached" });
    }
    const client = await Client.create({ companyId: req.user.companyId, name });
    res.status(201).json({ client });
  })
);

export default r;
