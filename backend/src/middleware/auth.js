import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.id || !mongoose.isValidObjectId(payload.id)) {
      return res.status(401).json({ message: "Invalid authentication token" });
    }

    const user = await mongoose.connection.collection("users").findOne(
      { _id: new mongoose.Types.ObjectId(payload.id) },
      { projection: { isActive: 1, isSuspended: 1, role: 1 } }
    );
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "This account is inactive or deleted. Please contact support." });
    }
    if (user.isSuspended === true) {
      return res.status(403).json({ message: "This account has been suspended. Please contact support." });
    }

    req.user = { ...payload, role: user.role || payload.role };
    return next();
  } catch (error) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Could not validate account status" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}
