import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

const email = process.env.ADMIN_EMAIL || "admin@hunarhub.com";
const password = process.env.ADMIN_PASSWORD || "ChangeThisAdminPassword123!";
const name = process.env.ADMIN_NAME || "HunarHub Admin";

await mongoose.connect(process.env.MONGODB_URI);
const hash = await bcrypt.hash(password, 12);
const existing = await User.findOne({ email });
if (existing) {
  existing.name = name;
  existing.password = hash;
  existing.role = "admin";
  existing.isActive = true;
  await existing.save();
  console.log(`Admin updated: ${email}`);
} else {
  await User.create({ name, email, password: hash, role: "admin" });
  console.log(`Admin created: ${email}`);
}
await mongoose.disconnect();
