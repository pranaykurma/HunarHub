import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import entrepreneurRoutes from "./routes/entrepreneurRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import serviceRequestRoutes from "./routes/serviceRequestRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import earningsRoutes from "./routes/earningsRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
  
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ message: "HunarHub API is running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/entrepreneurs", entrepreneurRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/reviews", reviewRoutes);
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`HunarHub API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

start();
