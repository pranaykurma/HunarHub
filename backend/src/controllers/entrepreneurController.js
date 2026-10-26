import Entrepreneur from "../models/Entrepreneur.js";

export async function createProfile(req, res) {
  try {
    const { businessName, skill, location, experience, description, profileImage } = req.body;

    if (!businessName || !skill || !location) {
      return res.status(400).json({ message: "Business name, skill and location are required" });
    }

    const existing = await Entrepreneur.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(409).json({ message: "Entrepreneur profile already exists" });
    }

    const profile = await Entrepreneur.create({
      userId: req.user.id,
      businessName,
      skill,
      location,
      experience,
      description,
      profileImage: profileImage || "",
      verificationStatus: "pending",
      verified: false
    });

    res.status(201).json({ profile });
  } catch (error) {
    res.status(500).json({ message: "Could not create profile", error: error.message });
  }
}


export async function updateProfile(req, res) {
  try {
    const { businessName, skill, location, experience, description, profileImage } = req.body;
    if (!businessName || !skill || !location) {
      return res.status(400).json({ message: "Business name, skill and location are required" });
    }

    const profile = await Entrepreneur.findOneAndUpdate(
      { userId: req.user.id },
      {
        businessName,
        skill,
        location,
        experience: Number(experience) || 0,
        description: description || "",
        profileImage: profileImage || ""
      },
      { new: true, runValidators: true }
    );

    if (!profile) return res.status(404).json({ message: "Entrepreneur profile not found" });
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: "Could not update profile", error: error.message });
  }
}

export async function myProfile(req, res) {
  const profile = await Entrepreneur.findOne({ userId: req.user.id });
  res.json({ profile });
}

export async function updateAvailability(req, res) {
  const profile = await Entrepreneur.findOneAndUpdate(
    { userId: req.user.id },
    { available: Boolean(req.body.available) },
    { new: true }
  );

  if (!profile) return res.status(404).json({ message: "Entrepreneur profile not found" });
  res.json({ profile });
}


export async function listVerificationRequests(req, res) {
  try {
    const profiles = await Entrepreneur.find()
      .populate("userId", "name email city phone createdAt")
      .sort({ createdAt: -1 });

    res.json({ profiles });
  } catch (error) {
    res.status(500).json({ message: "Could not load verification requests", error: error.message });
  }
}

export async function updateVerification(req, res) {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const profile = await Entrepreneur.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: status,
        verified: status === "approved"
      },
      { new: true }
    ).populate("userId", "name email city phone");

    if (!profile) {
      return res.status(404).json({ message: "Entrepreneur profile not found" });
    }

    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: "Could not update verification", error: error.message });
  }
}


export async function listPublicEntrepreneurs(req, res) {
  try {
    const profiles = await Entrepreneur.find({ verificationStatus: "approved", verified: true })
      .populate("userId", "name email city")
      .sort({ createdAt: -1 });

    const entrepreneurs = profiles.map((p) => ({
      _id: p._id,
      id: String(p._id),
      name: p.businessName,
      skill: p.skill,
      location: p.location,
      experience: p.experience ? `${p.experience} years` : "Experience not specified",
      bio: p.description || "Local entrepreneur on HunarHub.",
      image: p.profileImage || "",
      verified: p.verified,
      available: p.available,
      rating: 0,
      reviews: 0,
      price: 0,
      tags: [p.skill],
      services: []
    }));

    res.json({ entrepreneurs });
  } catch (error) {
    res.status(500).json({ message: "Could not load public entrepreneurs", error: error.message });
  }
}
