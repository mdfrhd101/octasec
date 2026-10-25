import mongoose from "mongoose";

const sslAlertSchema = new mongoose.Schema(
  {
    domainId: { type: mongoose.Schema.Types.ObjectId, ref: "Domain", required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    enabled: { type: Boolean, default: true },
    lastCheckedAt: { type: Date, default: null },
    daysRemaining: { type: Number, default: null },
    lastError: { type: String, default: "", maxlength: 300 },
    lastAlertKey: { type: String, default: "", maxlength: 120 },
  },
  { timestamps: true }
);

export default mongoose.model("SslAlert", sslAlertSchema);
