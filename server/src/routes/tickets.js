import { Router } from "express";
import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler, isId, asString } from "../utils/http.js";
import { audit } from "../utils/audit.js";

const r = Router();
r.use(auth);

const PRIO = ["low", "normal", "high", "urgent"];
const STATUS = ["open", "in_progress", "resolved", "closed"];
const TICKETS_MAX = 500;      // per company
const CLIENT_TICKETS_MAX = 100; // per self-serve client
const MESSAGES_MAX = 200;     // per ticket thread
const isSuper = (u) => u.role === "super_admin";
const isCompanyUser = (u) => u.role === "company_admin" || u.role === "employee";
const isClient = (u) => u.role === "client";
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const SELF_SERVE = "Self-serve";
const authorNameFor = (user, me) => (isSuper(user) ? "OctaSec Support" : me?.name || me?.email);

// tenants see who wrote a message, never an OctaSec staff member's user id
function forViewer(ticket, user) {
  if (isSuper(user)) return ticket;
  const t = typeof ticket.toObject === "function" ? ticket.toObject() : { ...ticket };
  t.messages = (t.messages || []).map((m) => (m.authorRole === "super_admin" ? { ...m, authorId: undefined } : m));
  return t;
}

// can this user see/act on this ticket?
function canAccess(user, ticket) {
  if (isSuper(user)) return true;
  if (isCompanyUser(user)) return !!user.companyId && !!ticket.companyId && String(ticket.companyId) === String(user.companyId);
  // a self-serve client sees only tickets they opened outside any company
  return isClient(user) && !ticket.companyId && String(ticket.openedBy) === String(user.id);
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
      q.companyId = oid(req.user.companyId);
    } else if (isClient(req.user)) {
      q.companyId = null;
      q.openedBy = oid(req.user.id);
    } else {
      return res.json({ tickets: [] });
    }
    // never select the messages array in the list (loads every body) — use messageCount
    const tickets = await Ticket.find(q).sort({ updatedAt: -1 }).limit(200)
      .select("subject status priority companyId openedByEmail createdAt updatedAt messageCount").lean();
    const companyIds = [...new Set(tickets.filter((t) => t.companyId).map((t) => String(t.companyId)))];
    const companies = await Company.find({ _id: { $in: companyIds } }).select("name").lean();
    const cmap = Object.fromEntries(companies.map((c) => [String(c._id), c.name]));
    res.json({
      tickets: tickets.map((t) => ({
        id: t._id, subject: t.subject, status: t.status, priority: t.priority,
        company: t.companyId ? cmap[String(t.companyId)] || "—" : SELF_SERVE, openedByEmail: t.openedByEmail,
        messages: t.messageCount || 0, createdAt: t.createdAt, updatedAt: t.updatedAt,
      })),
    });
  })
);

// open a ticket (company_admin + employee for their company; client for themselves)
r.post(
  "/",
  requireRole("company_admin", "employee", "client"),
  asyncHandler(async (req, res) => {
    const client = isClient(req.user);
    if (!client && !req.user.companyId) return res.status(403).json({ error: "No company context" });
    const subject = asString(req.body?.subject).trim().slice(0, 160);
    const body = asString(req.body?.body).trim().slice(0, 4000);
    const priority = PRIO.includes(asString(req.body?.priority)) ? req.body.priority : "normal";
    if (!subject || !body) return res.status(400).json({ error: "Subject and message are required" });
    const owned = client ? { companyId: null, openedBy: req.user.id } : { companyId: req.user.companyId };
    if ((await Ticket.countDocuments(owned)) >= (client ? CLIENT_TICKETS_MAX : TICKETS_MAX)) {
      return res.status(409).json({ error: "Ticket limit reached" });
    }
    const me = await User.findById(req.user.id).select("email name").lean();
    const ticket = await Ticket.create({
      companyId: client ? null : req.user.companyId, openedBy: req.user.id, openedByEmail: me?.email, subject, priority,
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
    const company = ticket.companyId ? await Company.findById(ticket.companyId).select("name").lean() : null;
    res.json({ ticket: { ...forViewer(ticket, req.user), company: ticket.companyId ? company?.name || "—" : SELF_SERVE } });
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
    // a customer reply on a resolved ticket reopens it; super admin reply moves it to in_progress
    if (isSuper(req.user) && ticket.status === "open") ticket.status = "in_progress";
    if (!isSuper(req.user) && ticket.status === "resolved") ticket.status = "open";
    await ticket.save();
    res.json({ ticket: forViewer(ticket, req.user) });
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
    await audit(req, "ticket.status", { targetType: "Ticket", targetId: ticket._id.toString(), targetLabel: ticket.subject, companyId: ticket.companyId, meta: { to: status } });
    res.json({ ticket });
  })
);

export default r;
