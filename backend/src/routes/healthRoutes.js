import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "HunarHub API",
    message: "Backend is running"
  });
});

export default router;
