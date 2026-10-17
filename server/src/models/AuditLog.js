import mongoose from "mongoose";

// Append-only record of a sensitive action: WHO did WHAT, WHEN, to WHICH target.
// Never edited or deleted via the app (no update/delete routes). Actor identity is
// SNAPSHOTTED (email/role) so the log survives the actor being deleted later.
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true, maxlength: 60 }, // e.g. "engagement.sign"
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorEmail: { type: String, default: "", maxlength: 160 },
    actorRole: { type: String, default: "", maxlength: 30 },
    targetType: { type: String, default: "", maxlength: 40 }, // "Company" | "User" | "Engagement" | "Lead" | ...
    targetId: { type: String, default: "", maxlength: 64 },
    targetLabel: { type: String, default: "", maxlength: 200 }, // human label, e.g. company/domain name
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    meta: { type: Object, default: {} }, // tiny bounded context — NEVER secrets/bodies
    ip: { type: String, default: "", maxlength: 60 },
    ua: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // created-only; entries are immutable
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
