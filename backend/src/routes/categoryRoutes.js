import { Router } from "express";
import { listCategories, createCategory, updateCategory } from "../controllers/categoryController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.get("/", listCategories);
router.post("/", requireAuth, requireRole("admin"), createCategory);
router.patch("/:id", requireAuth, requireRole("admin"), updateCategory);
export default router;
