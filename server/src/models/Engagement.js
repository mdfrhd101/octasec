import mongoose from "mongoose";

// A finding produced during an engagement (human-verified before delivery).
const findingSchema = new mongoose.Schema(
  {
    title: String,
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    cvss: { type: Number, default: 0 },
    owasp: { type: String, default: "" },
    detail: String,
    fix: String,
    host: String,
    verified: { type: Boolean, default: false },
  },
  { _id: true }
);

// A scan engagement: a tenant REQUESTS it, a super_admin operator runs, verifies and signs it.
//   requested → assigned → in_progress → delivered   (+ rejected, cancelled)
const engagementSchema = new mongoose.Schema(
  {
    // tenant (same scoping as domains/assets)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    requestedByEmail: String,

    // scope
    domainId: { type: mongoose.Schema.Types.ObjectId, ref: "Domain", required: true },
    domainName: String,
    targets: { type: [String], default: [] },
    roe: {
      intensity: { type: String, enum: ["safe", "standard", "aggressive"], default: "standard" },
      window: { type: String, default: "" },
      excludes: { type: String, default: "" },
      authorized: { type: Boolean, default: false },
    },

    // workflow
    status: { type: String, enum: ["requested", "assigned", "in_progress", "delivered", "rejected", "cancelled"], default: "requested", index: true },
    assignedOperatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    operatorName: { type: String, default: "" },
    reason: { type: String, default: "" }, // for a rejection

    // results (filled during the engagement, delivered on sign)
    findings: { type: [findingSchema], default: [] },
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    signedByName: { type: String, default: "" },
    signedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Engagement", engagementSchema);
