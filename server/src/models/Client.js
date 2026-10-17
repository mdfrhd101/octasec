import mongoose from "mongoose";

// A client (business) that a Company handles (B2B). Owned by the Company, so
// every employee of that company shares access.
const clientSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
