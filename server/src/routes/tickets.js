import { Router } from "express";
import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, isId, asString } from "../utils/http.js";

const r = Router();
r.use(auth);

const PRIO = ["low", "normal", "high", "urgent"];
const STATUS = ["open", "in_progress", "resolved", "closed"];
const TICKETS_MAX = 500;      // per company
const MESSAGES_MAX = 200;     // per ticket thread
const isSuper = (u) => u.role === "super_admin";
const isCompanyUser = (u) => u.role === "company_admin" || u.role === "employee";
const authorNameFor = (user, me) => (isSuper(user) ? "OctaSec Support" : me?.name || me?.email);

// can this user see/act on this ticket?
function canAccess(user, ticket) {
  if (isSuper(user)) return true;
  return isCompanyUser(user) && user.companyId && String(ticket.companyId) === String(user.companyId);
}

// list tickets
r.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = {};
    if (isSuper(req.user)) {
      const st = asString(req.query.status);
      if (STATUS.includes(st)) q.status = st;
    } else if (isCompanyUser(req.user) && req.user.companyId) {
      q.companyId = new mongoose.Types.ObjectId(req.user.companyId);
    } else {
      return res.json({ tickets: [] });
    }
    // never select the messages array in the list (loads every body) — use messageCount
    const tickets = await Ticket.find(q).sort({ updatedAt: -1 }).limit(200)
      .select("subject status priority companyId openedByEmail createdAt updatedAt messageCount").lean();
    const companyIds = [...new Set(tickets.map((t) => String(t.companyId)))];
    const companies = await Company.find({ _id: { $in: companyIds } }).select("name").lean();
    const cmap = Object.fromEntries(companies.map((c) => [String(c._id), c.name]));
    res.json({
      tickets: tickets.map((t) => ({
        id: t._id, subject: t.subject, status: t.status, priority: t.priority,
        company: cmap[String(t.companyId)] || "—", openedByEmail: t.openedByEmail,
        messages: t.messageCount || 0, createdAt: t.createdAt, updatedAt: t.updatedAt,
      })),
    });
  })
);

// open a ticket (company_admin + employee)
r.post(
  "/",
  requireRole("company_admin", "employee"),
  asyncHandler(async (req, res) => {
    if (!req.user.companyId) return res.status(403).json({ error: "No company context" });
    const subject = asString(req.body?.subject).trim().slice(0, 160);
    const body = asString(req.body?.body).trim().slice(0, 4000);
    const priority = PRIO.includes(asString(req.body?.priority)) ? req.body.priority : "normal";
    if (!subject || !body) return res.status(400).json({ error: "Subject and message are required" });
    if ((await Ticket.countDocuments({ companyId: req.user.companyId })) >= TICKETS_MAX) {
      return res.status(409).json({ error: "Ticket limit reached" });
    }
    const me = await User.findById(req.user.id).select("email name").lean();
    const ticket = await Ticket.create({
      companyId: req.user.companyId, openedBy: req.user.id, openedByEmail: me?.email, subject, priority,
      messageCount: 1,
      messages: [{ authorId: req.user.id, authorRole: req.user.role, authorName: authorNameFor(req.user, me), body }],
    });
    res.status(201).json({ ticket });
  })
);

// view one ticket (with thread)
r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket || !canAccess(req.user, ticket)) return res.status(404).json({ error: "Not found" });
    const company = await Company.findById(ticket.companyId).select("name").lean();
    res.json({ ticket: { ...ticket, company: company?.name || "—" } });
  })
);

// reply (either side)
r.post(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket || !canAccess(req.user, ticket)) return res.status(404).json({ error: "Not found" });
    if (ticket.status === "closed") return res.status(409).json({ error: "This ticket is closed" });
    if (ticket.messages.length >= MESSAGES_MAX) return res.status(409).json({ error: "This thread has reached its message limit" });
    const body = asString(req.body?.body).trim().slice(0, 4000);
    if (!body) return res.status(400).json({ error: "Message required" });
    const me = await User.findById(req.user.id).select("email name").lean();
    ticket.messages.push({ authorId: req.user.id, authorRole: req.user.role, authorName: authorNameFor(req.user, me), body });
    ticket.messageCount = ticket.messages.length;
    // a company reply on a resolved ticket reopens it; super admin reply moves it to in_progress
    if (isSuper(req.user) && ticket.status === "open") ticket.status = "in_progress";
    if (isCompanyUser(req.user) && ticket.status === "resolved") ticket.status = "open";
    await ticket.save();
    res.json({ ticket });
  })
);

// change status — super admin only
r.patch(
  "/:id",
  requireRole("super_admin"),
  asyncHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const status = asString(req.body?.status);
    if (!STATUS.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ error: "Not found" });
    res.json({ ticket });
  })
);

export default r;
