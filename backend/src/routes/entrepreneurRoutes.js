import { Router } from "express";
import {
  createProfile,
  updateProfile,
  myProfile,
  updateAvailability,
  listVerificationRequests,
  updateVerification,
  listPublicEntrepreneurs
} from "../controllers/entrepreneurController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/public", listPublicEntrepreneurs);
router.get("/admin/verification", requireAuth, requireRole("admin"), listVerificationRequests);
router.patch("/admin/verification/:id", requireAuth, requireRole("admin"), updateVerification);

router.use(requireAuth, requireRole("entrepreneur"));
router.post("/profile", createProfile);
router.get("/profile", myProfile);
router.patch("/profile", updateProfile);
router.patch("/availability", updateAvailability);

export default router;
