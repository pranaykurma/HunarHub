import mongoose from "mongoose";

const entrepreneurSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    skill: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    experience: { type: Number, default: 0 },
    description: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    verified: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    available: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Entrepreneur", entrepreneurSchema);
