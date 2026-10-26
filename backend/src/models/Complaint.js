import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, default: "Marketplace complaint" },
  title: { type: String, trim: true, default: "Customer complaint" },
  reason: { type: String, trim: true, default: "Customer complaint" },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ["Open", "Resolved"], default: "Open" },
  resolution: { type: String, default: "", trim: true },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);
