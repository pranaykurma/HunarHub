import Service from "../models/Service.js";
import Entrepreneur from "../models/Entrepreneur.js";

export async function listPublicServices(req, res) {
  try {
    const services = await Service.find({ isActive: true })
      .populate({
        path: "entrepreneurId",
        match: { verified: true, available: true },
        populate: { path: "userId", select: "name city" }
      })
      .sort({ createdAt: -1 });

    res.json({ services: services.filter((service) => service.entrepreneurId) });
  } catch (error) {
    res.status(500).json({ message: "Could not load services", error: error.message });
  }
}

export async function listMyServices(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const services = await Service.find({ entrepreneurId: entrepreneur._id }).sort({ createdAt: -1 });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ message: "Could not load your services", error: error.message });
  }
}

export async function createService(req, res) {
  try {
    const { name, description, price, category } = req.body;
    if (!name || price === undefined || price === "") {
      return res.status(400).json({ message: "Service name and price are required" });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: "Price must be a valid non-negative number" });
    }

    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Create your business profile first" });

    const service = await Service.create({
      entrepreneurId: entrepreneur._id,
      name: name.trim(),
      description: description?.trim() || "",
      price: numericPrice,
      category: category?.trim() || entrepreneur.skill,
      isActive: true
    });

    await Entrepreneur.findByIdAndUpdate(entrepreneur._id, { $addToSet: { services: service._id } });
    res.status(201).json({ service });
  } catch (error) {
    res.status(500).json({ message: "Could not create service", error: error.message });
  }
}

export async function updateService(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const service = await Service.findOne({ _id: req.params.id, entrepreneurId: entrepreneur._id });
    if (!service) return res.status(404).json({ message: "Service not found" });

    const { name, description, price, category, isActive } = req.body;
    if (name !== undefined) service.name = String(name).trim();
    if (description !== undefined) service.description = String(description).trim();
    if (category !== undefined) service.category = String(category).trim();
    if (price !== undefined) {
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) return res.status(400).json({ message: "Price must be a valid non-negative number" });
      service.price = numericPrice;
    }
    if (isActive !== undefined) service.isActive = Boolean(isActive);

    await service.save();
    res.json({ service });
  } catch (error) {
    res.status(500).json({ message: "Could not update service", error: error.message });
  }
}

export async function deleteService(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const service = await Service.findOneAndDelete({ _id: req.params.id, entrepreneurId: entrepreneur._id });
    if (!service) return res.status(404).json({ message: "Service not found" });

    await Entrepreneur.findByIdAndUpdate(entrepreneur._id, { $pull: { services: service._id } });
    res.json({ message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete service", error: error.message });
  }
}
