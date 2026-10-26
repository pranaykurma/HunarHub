import { Router } from "express";
import { listUsers, updateUserStatus } from "../controllers/adminUsersController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.get("/", requireAuth, requireRole("admin"), listUsers);
router.patch("/:id/status", requireAuth, requireRole("admin"), updateUserStatus);
export default router;
