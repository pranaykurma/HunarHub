import { Router } from "express";
import { listEntrepreneurReviews, listMyEligibleReviews, createReview } from "../controllers/reviewController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
const router=Router();
router.get("/entrepreneur/:id",listEntrepreneurReviews);
router.get("/mine/eligible",requireAuth,requireRole("customer"),listMyEligibleReviews);
router.post("/",requireAuth,requireRole("customer"),createReview);
export default router;
