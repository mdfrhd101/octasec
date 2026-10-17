import mongoose from "mongoose";

// A contact-form submission from the public marketing site → Super Admin inbox.
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    company: { type: String, trim: true, default: "", maxlength: 160 },
    target: { type: String, default: "Not sure", maxlength: 60 },
    message: { type: String, trim: true, default: "", maxlength: 4000 },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new", index: true },
    // where the request came from and what was asked for (pricing page quote popup)
    source: { type: String, enum: ["contact", "pricing"], default: "contact", index: true },
    plan: { type: String, enum: ["", "assessment", "continuous", "enterprise"], default: "" },
    scope: { type: String, enum: ["", "1", "2-5", "6-20", "20+", "Not sure"], default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
