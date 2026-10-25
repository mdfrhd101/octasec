import mongoose from "mongoose";

const findingSchema = new mongoose.Schema(
  {
    title: String,
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    cvss: { type: Number, default: 0 },
    owasp: { type: String, default: "" },
    detail: String,
    fix: String,
    // triage workflow state (Cobalt/ServiceNow style)
    state: { type: String, enum: ["open", "triaged", "fixed", "accepted", "false-positive"], default: "open" },
    verification: { type: String, default: "pending-human-verification" },
  },
  { _id: true }
);

const assetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    domainId: { type: mongoose.Schema.Types.ObjectId, ref: "Domain", required: true, index: true },
    host: { type: String, required: true, trim: true, lowercase: true },
    // other names that resolve to the same site (e.g. the www form of an apex host)
    aliases: { type: [String], default: [] },
    tech: { type: [String], default: [] },
    status: { type: String, enum: ["unscanned", "scanning", "clean", "findings"], default: "unscanned" },
    findings: { type: [findingSchema], default: [] },
    lastScanAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// one host per domain
assetSchema.index({ domainId: 1, host: 1 }, { unique: true });

export default mongoose.model("Asset", assetSchema);
