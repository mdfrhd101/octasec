import mongoose from "mongoose";

// One-time emailed token (password reset, admin reset, account invite, email
// verification). Only the SHA-256 hash of the token is stored.
const passwordResetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: { type: String, enum: ["reset", "admin_reset", "invite", "verify"], default: "reset", index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }, // validity is enforced on every lookup
    usedAt: { type: Date, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Rows are purged 4 days after creation — long enough to outlive the longest
// token (72 h invite) and the 1-hour throttle window that counts recent rows.
passwordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 4 * 24 * 3600 });

export default mongoose.model("PasswordReset", passwordResetSchema);
