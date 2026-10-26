import ServiceRequest from "../models/ServiceRequest.js";
import Service from "../models/Service.js";
import Entrepreneur from "../models/Entrepreneur.js";

export async function createServiceRequest(req, res) {
  try {
    const { serviceId, requestedDate, message } = req.body;
    if (!serviceId || !requestedDate) {
      return res.status(400).json({ message: "Service and requested date are required" });
    }

    const date = new Date(requestedDate);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: "Invalid requested date" });
    }
    if (date < new Date()) {
      return res.status(400).json({ message: "Requested date must be in the future" });
    }

    const service = await Service.findOne({ _id: serviceId, isActive: true }).populate("entrepreneurId");
    if (!service || !service.entrepreneurId) {
      return res.status(404).json({ message: "Service is no longer available" });
    }

    const entrepreneur = service.entrepreneurId;
    if (!entrepreneur.verified || !entrepreneur.available) {
      return res.status(409).json({ message: "This entrepreneur is not currently accepting requests" });
    }

    const servicePrice = Number(service.price);
    if (!Number.isFinite(servicePrice) || servicePrice < 0) {
      return res.status(409).json({ message: "This service has an invalid price and cannot be requested" });
    }

    const request = await ServiceRequest.create({
      customerId: req.user.id,
      entrepreneurId: entrepreneur._id,
      serviceId: service._id,
      agreedPrice: servicePrice,
      requestedDate: date,
      message: message?.trim() || ""
    });

    const populated = await ServiceRequest.findById(request._id)
      .populate("customerId", "name email")
      .populate("serviceId", "name price category")
      .populate("entrepreneurId", "businessName location");

    res.status(201).json({ request: populated });
  } catch (error) {
    res.status(500).json({ message: "Could not create service request", error: error.message });
  }
}

export async function listCustomerRequests(req, res) {
  try {
    const requests = await ServiceRequest.find({ customerId: req.user.id })
      .populate("serviceId", "name price category")
      .populate("entrepreneurId", "businessName location")
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Could not load your service requests", error: error.message });
  }
}

export async function listEntrepreneurRequests(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const requests = await ServiceRequest.find({ entrepreneurId: entrepreneur._id })
      .populate("customerId", "name email phone city")
      .populate("serviceId", "name price category")
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Could not load service requests", error: error.message });
  }
}

export async function updateServiceRequestStatus(req, res) {
  try {
    const { status } = req.body;
    if (!["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid request status" });
    }

    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const request = await ServiceRequest.findOne({ _id: req.params.id, entrepreneurId: entrepreneur._id });
    if (!request) return res.status(404).json({ message: "Service request not found" });

    if (request.status === "rejected" || request.status === "cancelled") {
      return res.status(409).json({ message: "This request can no longer be changed" });
    }
    if (request.status === "completed") {
      return res.status(409).json({ message: "This request is already completed" });
    }
    if (status === "completed" && request.status !== "accepted") {
      return res.status(409).json({ message: "Only accepted requests can be completed" });
    }

    request.status = status;
    if (status === "completed") request.completedAt = new Date();
    await request.save();

    const populated = await ServiceRequest.findById(request._id)
      .populate("customerId", "name email phone city")
      .populate("serviceId", "name price category")
      .populate("entrepreneurId", "businessName location");

    res.json({ request: populated });
  } catch (error) {
    res.status(500).json({ message: "Could not update service request", error: error.message });
  }
}
