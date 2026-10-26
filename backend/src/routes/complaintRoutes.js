import { Router } from "express";
import { createComplaint, listAdminComplaints, listMyComplaints, updateComplaint } from "../controllers/complaintController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.post("/", requireAuth, requireRole("customer"), createComplaint);
router.get("/mine", requireAuth, requireRole("customer"), listMyComplaints);
router.get("/admin", requireAuth, requireRole("admin"), listAdminComplaints);
router.patch("/:id/status", requireAuth, requireRole("admin"), updateComplaint);
router.patch("/:id", requireAuth, requireRole("admin"), updateComplaint);
export default router;
