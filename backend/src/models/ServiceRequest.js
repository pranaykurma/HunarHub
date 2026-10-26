import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    entrepreneurId: { type: mongoose.Schema.Types.ObjectId, ref: "Entrepreneur", required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    // Snapshot the price when the customer requests the service so later price edits
    // do not rewrite the value of an already accepted/completed request.
    agreedPrice: { type: Number, min: 0, default: null },
    requestedDate: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export default mongoose.model("ServiceRequest", serviceRequestSchema);
