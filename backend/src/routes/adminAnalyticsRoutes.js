import { Router } from "express";
import { getAdminAnalytics } from "../controllers/adminAnalyticsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.get("/", requireAuth, requireRole("admin"), getAdminAnalytics);
export default router;
