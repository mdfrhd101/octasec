import mongoose from "mongoose";
import { profileSchema, authorizationSchema } from "../utils/profile.js";

// A client (business) that a Company handles (B2B). Owned by the Company, so
// every employee of that company shares access.
const clientSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true }, // display name (trade name, else legal name)
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    // organisation profile — docs/PORTAL_DATA_AND_DASHBOARDS.md §1
    profile: { type: profileSchema, default: undefined },
    // the client's written permission for us to test its assets (§2)
    authorization: { type: authorizationSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
