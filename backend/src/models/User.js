import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["customer", "entrepreneur", "admin"],
      default: "customer"
    },
    phone: { type: String, default: "" },
    city: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
