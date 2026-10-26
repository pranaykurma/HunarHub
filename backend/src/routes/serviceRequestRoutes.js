import { Router } from "express";
import {
  createServiceRequest,
  listCustomerRequests,
  listEntrepreneurRequests,
  updateServiceRequestStatus
} from "../controllers/serviceRequestController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/", requireRole("customer"), createServiceRequest);
router.get("/mine", requireRole("customer"), listCustomerRequests);
router.get("/entrepreneur", requireRole("entrepreneur"), listEntrepreneurRequests);
router.patch("/:id/status", requireRole("entrepreneur"), updateServiceRequestStatus);

export default router;
