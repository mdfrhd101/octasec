import mongoose from "mongoose";

// A corporate tenant. Groups a company_admin + employees, and the clients they handle.
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
