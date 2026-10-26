import { Router } from "express";
import {
  listPublicServices,
  listMyServices,
  createService,
  updateService,
  deleteService
} from "../controllers/serviceController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", listPublicServices);

router.use(requireAuth, requireRole("entrepreneur"));
router.get("/mine", listMyServices);
router.post("/", createService);
router.patch("/:id", updateService);
router.delete("/:id", deleteService);

export default router;
