import { Router } from "express";
import { getEntrepreneurEarnings } from "../controllers/earningsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/entrepreneur", requireAuth, requireRole("entrepreneur"), getEntrepreneurEarnings);

export default router;
