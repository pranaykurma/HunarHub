import { Router } from "express";
import {
  listPublicProducts,
  listMyProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", listPublicProducts);
router.get("/mine", requireAuth, requireRole("entrepreneur"), listMyProducts);
router.post("/", requireAuth, requireRole("entrepreneur"), createProduct);
router.patch("/:id", requireAuth, requireRole("entrepreneur"), updateProduct);
router.delete("/:id", requireAuth, requireRole("entrepreneur"), deleteProduct);

export default router;
