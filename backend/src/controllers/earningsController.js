import Order from "../models/Order.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Entrepreneur from "../models/Entrepreneur.js";

const MONTH_COUNT = 7;

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function amountForRequest(request) {
  // Existing requests created before agreedPrice was added fall back to the
  // linked service's current price. New requests use their saved price snapshot.
  const snapshot = request.agreedPrice;
  const amount = snapshot !== null && snapshot !== undefined
    ? Number(snapshot)
    : Number(request.serviceId?.price);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export async function getEntrepreneurEarnings(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id }).select("_id");
    if (!entrepreneur) {
      return res.status(404).json({ message: "Entrepreneur profile not found" });
    }

    const entrepreneurId = entrepreneur._id;
    const now = new Date();
    const currentMonthStart = monthStart(now);
    const chartStart = new Date(currentMonthStart);
    chartStart.setMonth(chartStart.getMonth() - (MONTH_COUNT - 1));

    const deliveredMatch = { entrepreneurId, status: "delivered" };
    const [orderSummary, currentMonthOrders, monthlyOrderRows, pending, completedRequests] = await Promise.all([
      Order.aggregate([
        { $match: deliveredMatch },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...deliveredMatch, createdAt: { $gte: currentMonthStart, $lte: now } } },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...deliveredMatch, createdAt: { $gte: chartStart, $lte: now } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$total" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      Order.aggregate([
        { $match: { entrepreneurId, status: { $in: ["pending", "processing", "shipped"] } } },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
      ]),
      ServiceRequest.find({
        entrepreneurId,
        status: "completed",
        $or: [
          { completedAt: { $gte: chartStart, $lte: now } },
          { completedAt: null, updatedAt: { $gte: chartStart, $lte: now } },
          { completedAt: { $exists: false }, updatedAt: { $gte: chartStart, $lte: now } }
        ]
      }).populate("serviceId", "price")
    ]);

    // Include all historical completed service requests in lifetime totals.
    const allCompletedRequests = await ServiceRequest.find({
      entrepreneurId,
      status: "completed"
    }).populate("serviceId", "price");

    const totalServiceEarnings = allCompletedRequests.reduce((sum, request) => sum + amountForRequest(request), 0);
    const completedServiceCount = allCompletedRequests.length;
    const orderEarnings = Number(orderSummary[0]?.total || 0);
    const completedOrderCount = Number(orderSummary[0]?.count || 0);
    const totalEarnings = orderEarnings + totalServiceEarnings;
    const completedTransactionCount = completedOrderCount + completedServiceCount;

    const thisMonthServiceRequests = allCompletedRequests.filter((request) => {
      const date = request.completedAt || request.updatedAt || request.createdAt;
      return date && date >= currentMonthStart && date <= now;
    });
    const thisMonthServiceEarnings = thisMonthServiceRequests.reduce(
      (sum, request) => sum + amountForRequest(request), 0
    );
    const thisMonthOrderEarnings = Number(currentMonthOrders[0]?.total || 0);
    const thisMonthOrderCount = Number(currentMonthOrders[0]?.count || 0);
    const thisMonth = thisMonthOrderEarnings + thisMonthServiceEarnings;
    const thisMonthCount = thisMonthOrderCount + thisMonthServiceRequests.length;

    const pendingOrderValue = Number(pending[0]?.total || 0);
    const pendingOrderCount = Number(pending[0]?.count || 0);
    const averageOrderValue = completedTransactionCount ? totalEarnings / completedTransactionCount : 0;

    const monthly = Array.from({ length: MONTH_COUNT }, (_, index) => {
      const date = new Date(chartStart);
      date.setMonth(chartStart.getMonth() + index);
      const key = monthKey(date);
      const orderRow = monthlyOrderRows.find(
        (item) => item._id.year === date.getFullYear() && item._id.month === date.getMonth() + 1
      );
      const serviceMonthRequests = completedRequests.filter((request) => {
        const completionDate = request.completedAt || request.updatedAt || request.createdAt;
        return completionDate && monthKey(new Date(completionDate)) === key;
      });
      const serviceTotal = serviceMonthRequests.reduce((sum, request) => sum + amountForRequest(request), 0);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        total: Number(orderRow?.total || 0) + serviceTotal,
        count: Number(orderRow?.count || 0) + serviceMonthRequests.length,
        productOrderCount: Number(orderRow?.count || 0),
        completedServiceCount: serviceMonthRequests.length
      };
    });

    const previousMonth = monthly[MONTH_COUNT - 2]?.total || 0;
    const currentChartMonth = monthly[MONTH_COUNT - 1]?.total || 0;
    const growthPercent = previousMonth > 0
      ? ((currentChartMonth - previousMonth) / previousMonth) * 100
      : null;

    return res.json({
      earnings: {
        totalEarnings,
        productEarnings: orderEarnings,
        serviceEarnings: totalServiceEarnings,
        thisMonth,
        thisMonthCount,
        completedOrderCount,
        completedServiceCount,
        completedTransactionCount,
        averageOrderValue,
        pendingOrderValue,
        pendingOrderCount,
        growthPercent,
        monthly
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not load earnings", error: error.message });
  }
}
