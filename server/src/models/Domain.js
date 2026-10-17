import mongoose from "mongoose";
import crypto from "crypto";

const domainSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    name: { type: String, required: true, trim: true, lowercase: true },
    // ownerType "self" = the account's own domain; "client" = assigned to a managed client
    ownerType: { type: String, enum: ["self", "client"], default: "self" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    // onboarding context (ASM/PTaaS style)
    label: { type: String, trim: true, default: "" },
    env: { type: String, enum: ["production", "staging", "development", "other"], default: "production" },
    criticality: { type: String, enum: ["critical", "high", "medium", "low"], default: "medium" },
    contact: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },
    notes: { type: String, trim: true, default: "" },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    // ownership-verification artefacts (unique per domain)
    verifyToken: { type: String, required: true },
    verifyFile: { type: String, required: true },
  },
  { timestamps: true }
);

// 32–126 char unguessable token (MD requirement). Default 48.
domainSchema.statics.freshToken = function (len = 48) {
  return crypto.randomBytes(Math.ceil((len * 3) / 4)).toString("base64url").slice(0, len);
};
domainSchema.statics.freshFile = function () {
  return "octasec-verify-" + crypto.randomBytes(6).toString("hex") + ".txt";
};

// one domain name per account (client-tier) …
domainSchema.index({ userId: 1, name: 1 }, { unique: true });
// … and one per company (shared-company tier) so two employees can't add the same domain
domainSchema.index({ companyId: 1, name: 1 }, { unique: true, partialFilterExpression: { companyId: { $type: "objectId" } } });

export default mongoose.model("Domain", domainSchema);
