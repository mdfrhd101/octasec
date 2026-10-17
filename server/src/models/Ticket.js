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
    // null = a self-serve client's ticket (owned by openedBy)
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
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
