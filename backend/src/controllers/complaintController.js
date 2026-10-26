import Complaint from "../models/Complaint.js";

export async function createComplaint(req, res) {
  try {
    const description = String(req.body.description || "").trim();
    if (!description) return res.status(400).json({ message: "Complaint description is required" });
    const complaint = await Complaint.create({
      userId: req.user.id,
      targetType: String(req.body.targetType || "Marketplace complaint"),
      title: String(req.body.title || req.body.reason || "Customer complaint").trim(),
      reason: String(req.body.reason || req.body.title || "Customer complaint").trim(),
      description
    });
    res.status(201).json({ complaint });
  } catch (error) {
    res.status(500).json({ message: "Could not create complaint", error: error.message });
  }
}


export async function listMyComplaints(req, res) {
  try {
    const complaints = await Complaint.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ message: "Could not load your complaints", error: error.message });
  }
}

export async function listAdminComplaints(req, res) {
  try {
    const complaints = await Complaint.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ message: "Could not load complaints", error: error.message });
  }
}

export async function updateComplaint(req, res) {
  try {
    const status = String(req.body.status || "");
    if (status !== "Resolved") return res.status(400).json({ message: "Only resolution is supported" });
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: "Resolved", resolution: String(req.body.resolution || "Resolved by HunarHub admin"), resolvedAt: new Date() },
      { new: true }
    ).populate("userId", "name email");
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    res.json({ complaint });
  } catch (error) {
    res.status(500).json({ message: "Could not resolve complaint", error: error.message });
  }
}
