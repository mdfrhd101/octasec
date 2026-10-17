import mongoose from "mongoose";
import { profileSchema } from "../utils/profile.js";

// A corporate tenant. Groups a company_admin + employees, and the clients they handle.
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
    // organisation profile — docs/PORTAL_DATA_AND_DASHBOARDS.md §1
    profile: { type: profileSchema, default: undefined },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
