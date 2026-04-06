const { User } = require("../models/User");
const { Product } = require("../models/Product");
const { Reservation } = require("../models/Reservation");
const { Order } = require("../models/Order");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");

const analytics = asyncHandler(async (req, res) => {
  const [users, products, reservations, orders] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Reservation.countDocuments(),
    Order.countDocuments(),
  ]);

  const revenueAgg = await Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$total" } } }]);

  res.json({
    success: true,
    analytics: {
      users,
      products,
      reservations,
      orders,
      revenue: revenueAgg[0]?.revenue || 0,
    },
  });
});

const activityLog = asyncHandler(async (req, res) => {
  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
  const recentReservations = await Reservation.find().sort({ createdAt: -1 }).limit(5);
  res.json({ success: true, activity: { recentOrders, recentReservations } });
});

const queues = asyncHandler(async (req, res) => {
  const [pendingReservations, pendingOrders, pendingSellers, pendingSellerRequests] = await Promise.all([
    Reservation.find({ status: "pending" }).sort({ createdAt: -1 }),
    Order.find({ status: "pending" }).sort({ createdAt: -1 }),
    User.find({ role: "seller", status: "pending" }).select("-password"),
    Notification.find({ type: "seller_registration_requested", targetRole: "admin", isRead: false })
      .sort({ createdAt: -1 })
      .populate("userId", "name email role status"),
  ]);

  res.json({
    success: true,
    queues: { pendingReservations, pendingOrders, pendingSellers, pendingSellerRequests },
  });
});

module.exports = { analytics, activityLog, queues };
