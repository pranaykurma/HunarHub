import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: "", trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
