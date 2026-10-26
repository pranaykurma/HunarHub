import mongoose from "mongoose";

export async function listUsers(req, res) {
  try {
    const users = await mongoose.connection.collection("users")
      .find({}, { projection: { password: 0, __v: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      users: users.map(u => ({
        id: String(u._id),
        name: u.name || "Unnamed user",
        email: u.email || "",
        role: u.role || "customer",
        joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recently",
        status: u.isActive === false ? "Inactive" : u.isSuspended === true ? "Suspended" : "Active"
      }))
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load users", error: error.message });
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });
    if (String(req.user?.id) === String(id)) return res.status(400).json({ message: "You cannot suspend your own admin account" });
    if (typeof req.body.suspended !== "boolean") return res.status(400).json({ message: "suspended must be true or false" });

    const users = mongoose.connection.collection("users");
    const target = await users.findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { password: 0 } });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "admin") return res.status(403).json({ message: "Admin accounts cannot be suspended here" });
    if (target.isActive === false || String(target.email || "").endsWith("@deleted.hunarhub.invalid")) {
      return res.status(409).json({ message: "Deleted/inactive accounts cannot be reactivated from this screen" });
    }

    await users.updateOne({ _id: target._id }, { $set: { isSuspended: req.body.suspended, updatedAt: new Date() } });
    const user = {
      id: String(target._id),
      name: target.name || "Unnamed user",
      email: target.email || "",
      role: target.role || "customer",
      joined: target.createdAt ? new Date(target.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recently",
      status: req.body.suspended ? "Suspended" : "Active"
    };
    res.json({ user, message: req.body.suspended ? "User suspended" : "User reactivated" });
  } catch (error) {
    res.status(500).json({ message: "Could not update user status", error: error.message });
  }
}
