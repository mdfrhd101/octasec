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
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
