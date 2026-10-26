import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function register(req, res) {
  try {
    const { name, email, password, role = "customer", phone = "", city = "" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (!["customer", "entrepreneur"].includes(role)) {
      return res.status(400).json({ message: "Invalid registration role" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      phone,
      city
    });

    res.status(201).json({
      token: makeToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !user.isActive || user.isSuspended) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password || "", user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      token: makeToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
}

export async function deleteAccount(req, res) {
  try {
    const { password, confirmText } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (user.role === "admin") return res.status(403).json({ message: "Admin accounts cannot be deleted from this option." });
    if (!password || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Your password is incorrect." });
    if (confirmText !== "DELETE") return res.status(400).json({ message: 'Type DELETE to confirm account deletion.' });

    // Disable sign-in and anonymize personal details while preserving transaction history.
    user.isActive = false;
    user.name = "Deleted User";
    user.email = `deleted-${user._id}@deleted.hunarhub.invalid`;
    user.phone = "";
    user.city = "";
    user.password = await bcrypt.hash(`${user._id}-${Date.now()}-${Math.random()}`, 12);
    await user.save();
    return res.json({ message: "Your account has been deactivated and personal details anonymized." });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete account right now." });
  }
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
}
