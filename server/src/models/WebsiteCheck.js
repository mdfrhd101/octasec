import mongoose from "mongoose";

const websiteCheckSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true, index: true, match: /^[a-f0-9]{32}$/ },
    target: { type: String, required: true, maxlength: 253, index: true },
    report: { type: Object, required: true },
    ip: { type: String, default: "", maxlength: 60 },
    ua: { type: String, default: "", maxlength: 200 },
    createdAt: { type: Date, default: Date.now, expires: 90 * 24 * 60 * 60 },
  },
  { versionKey: false }
);

export default mongoose.model("WebsiteCheck", websiteCheckSchema);
