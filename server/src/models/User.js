import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

// never leak the hash
userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.passwordHash;
  delete o.__v;
  return o;
};

export default mongoose.model("User", userSchema);
