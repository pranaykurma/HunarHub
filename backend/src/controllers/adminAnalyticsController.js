import mongoose from "mongoose";

const MONTH_COUNT = 7;

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getAdminAnalytics(req, res) {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ message: "Database connection is not ready" });

    const users = db.collection("users");
    const entrepreneurs = db.collection("entrepreneurs");
    const orders = db.collection("orders");
    const serviceRequests = db.collection("servicerequests");
    const reviews = db.collection("reviews");

    const now = new Date();
    const chartStart = monthStart(now);
    chartStart.setMonth(chartStart.getMonth() - (MONTH_COUNT - 1));

    const [userCount, activeEntrepreneurs, orderSummary, requestSummary, reviewSummary, monthlyRows] = await Promise.all([
      users.countDocuments(),
      entrepreneurs.countDocuments({ verificationStatus: "approved", verified: true }),
      orders.aggregate([
        { $match: { status: "delivered" } },
        { $group: { _id: null, totalSales: { $sum: "$total" }, deliveredOrders: { $sum: 1 } } }
      ]).toArray(),
      serviceRequests.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } } } }
      ]).toArray(),
      reviews.aggregate([
        { $match: { rating: { $gte: 1, $lte: 5 } } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }
      ]).toArray(),
      orders.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: chartStart, $lte: now } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, sales: { $sum: "$total" }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]).toArray()
    ]);

    const totalSales = Number(orderSummary[0]?.totalSales || 0);
    const deliveredOrders = Number(orderSummary[0]?.deliveredOrders || 0);
    const requestTotal = Number(requestSummary[0]?.total || 0);
    const completedRequests = Number(requestSummary[0]?.completed || 0);
    const reviewCount = Number(reviewSummary[0]?.count || 0);
    const customerSatisfaction = reviewCount ? Number(reviewSummary[0].average) : null;
    const serviceConversion = requestTotal ? (completedRequests / requestTotal) * 100 : null;

    const monthly = Array.from({ length: MONTH_COUNT }, (_, index) => {
      const date = new Date(chartStart);
      date.setMonth(chartStart.getMonth() + index);
      const row = monthlyRows.find(x => x._id.year === date.getFullYear() && x._id.month === date.getMonth() + 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        sales: Number(row?.sales || 0),
        count: Number(row?.count || 0)
      };
    });

    res.json({
      analytics: {
        userCount,
        activeEntrepreneurs,
        totalSales,
        deliveredOrders,
        averageOrderValue: deliveredOrders ? totalSales / deliveredOrders : 0,
        serviceRequests: requestTotal,
        completedRequests,
        serviceConversion,
        reviewCount,
        customerSatisfaction,
        monthly
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load admin analytics", error: error.message });
  }
}
