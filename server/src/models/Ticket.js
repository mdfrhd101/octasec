import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorRole: String,
    authorName: String,
    body: { type: String, maxlength: 4000 },
  },
  { _id: true, timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    openedByEmail: String,
    subject: { type: String, required: true, trim: true },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    messages: { type: [messageSchema], default: [] },
    messageCount: { type: Number, default: 0 }, // denormalized so the list never loads message bodies
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
