import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    entrepreneurId: { type: mongoose.Schema.Types.ObjectId, ref: "Entrepreneur", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
