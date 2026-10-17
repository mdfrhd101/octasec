import mongoose from "mongoose";
import { profileSchema } from "../utils/profile.js";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["super_admin", "company_admin", "employee", "client"], default: "client" },
    // set for company_admin + employee; null for client / super_admin
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    orgName: { type: String, trim: true, default: "" },
    // disabled users cannot sign in and their live tokens are rejected
    status: { type: String, enum: ["pending", "active", "disabled"], default: "active", index: true }, // pending = email not verified yet
    emailVerifiedAt: { type: Date, default: null },
    // embedded in every JWT ("tv"); bumping it revokes all tokens issued before
    tokenVersion: { type: Number, default: 0 },
    // set by an admin password reset — the API refuses everything but a password change until cleared
    mustChangePassword: { type: Boolean, default: false },
    // self-serve clients describe their organisation here (company users use Company.profile)
    profile: { type: profileSchema, default: undefined },
  },
  { timestamps: true }
);

// never leak the hash
userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.passwordHash;
  delete o.tokenVersion;
  delete o.__v;
  return o;
};

export default mongoose.model("User", userSchema);
