import { Router } from "express";
import {
  createOrders,
  listMyOrders,
  listEntrepreneurOrders,
  listAllOrders,
  updateOrderStatus
} from "../controllers/orderController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const requireOrderStaff = (req, res, next) => {
  if (!["entrepreneur", "admin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

router.post("/", requireAuth, requireRole("customer"), createOrders);
router.get("/mine", requireAuth, requireRole("customer"), listMyOrders);
router.get("/entrepreneur", requireAuth, requireRole("entrepreneur"), listEntrepreneurOrders);
router.get("/admin", requireAuth, requireRole("admin"), listAllOrders);
router.patch("/:id/status", requireAuth, requireOrderStaff, updateOrderStatus);

export default router;
