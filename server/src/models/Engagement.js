import mongoose from "mongoose";

// A finding produced during an engagement (human-verified before delivery).
const findingSchema = new mongoose.Schema(
  {
    title: String,
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    cvss: { type: Number, default: 0 },
    owasp: { type: String, default: "" },
    cwe: { type: String, default: "" },
    detail: String,
    evidence: { type: String, default: "" }, // raw request/response proof from the engine
    fix: String,
    host: String,
    verified: { type: Boolean, default: false },
    // operator review — every finding is verified or rejected by a human before sign-off
    review: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewedByName: { type: String, default: "" },
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
      authorizerName: { type: String, default: "" },  // typed signature on the RoE
      authorizerTitle: { type: String, default: "" },
    },
    // pre-engagement scoping questionnaire — docs/PORTAL_DATA_AND_DASHBOARDS.md §3
    scoping: {
      testType: { type: String, enum: ["black", "grey", "white", ""], default: "" },
      environment: { type: String, enum: ["production", "staging", "development", ""], default: "" },
      targetTypes: { type: [String], default: [] },
      userRoles: { type: Number, default: 0 },
      testAccountsViaSecureChannel: { type: Boolean, default: false },
      apiDocsUrl: { type: String, default: "" },
      wafInPlace: { type: Boolean, default: false },
      ipAllowlistOk: { type: Boolean, default: false },
      preferredStart: { type: Date, default: null },
      deadline: { type: Date, default: null },
      objective: { type: String, default: "" },
      maxRps: { type: Number, default: 0 },
      emergencyContact: { name: { type: String, default: "" }, phone: { type: String, default: "" } },
      notes: { type: String, default: "" },
    },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    // scan-engine job — docs/ENGINE_INTEGRATION.md
    engine: {
      driver: { type: String, default: "" },
      jobId: { type: String, default: "", index: true },
      state: { type: String, enum: ["", "queued", "running", "completed", "failed"], default: "" },
      progress: { type: Number, default: null },
      error: { type: String, default: "" },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      lastEventAt: { type: Date, default: null },
      lastEventTs: { type: Number, default: 0 }, // last applied callback timestamp (replay defence)
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
    rejectedCount: { type: Number, default: 0 }, // false positives the operator removed before delivery
  },
  { timestamps: true }
);

export default mongoose.model("Engagement", engagementSchema);
