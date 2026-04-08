const { Notification } = require("../models/Notification");
const { Order } = require("../models/Order");
const { asyncHandler } = require("../utils/asyncHandler");

async function syncMissingSellerCodAlerts(sellerId) {
  const orders = await Order.find({
    paymentMethod: { $in: ["cash", "cod"] },
    "items.sellerId": sellerId,
  })
    .populate({ path: "userId", select: "name email role" })
    .sort({ createdAt: -1 })
    .limit(100);

  const adminOrders = orders.filter((order) => String(order?.userId?.role || "").toLowerCase() === "admin");

  await Promise.all(
    adminOrders.map(async (order) => {
      const sellerItems = (order.items || []).filter(
        (item) => String(item?.sellerId || "") === String(sellerId)
      );

      if (sellerItems.length === 0) {
        return;
      }

      const formattedItems = sellerItems.map((item) => ({
        productId: String(item?.productId || ""),
        name: item?.name || "Item",
        quantity: Number(item?.quantity || 0),
        price: Number(item?.price || 0),
        brand: item?.brand || "",
        rating: Number(item?.rating || 0),
        selectedSize: item?.selectedSize || "",
      }));

      await Notification.findOneAndUpdate(
        {
          type: "seller_order_alert",
          targetRole: "seller",
          userId: sellerId,
          "metadata.orderId": String(order._id),
        },
        {
          $setOnInsert: {
            type: "seller_order_alert",
            title: `New COD order from admin (${order.userId?.email || "admin"})`,
            message: `Cash on delivery order · ${formattedItems.length} item(s) awaiting confirmation`,
            targetRole: "seller",
            userId: sellerId,
            isRead: false,
            metadata: {
              orderId: String(order._id),
              trackingNumber: order.trackingNumber,
              paymentMethod: order.paymentMethod || "cash",
              paymentStatus: order.paymentStatus || "unpaid",
              orderStatus: order.status || "pending",
              adminName: order.userId?.name || "Admin",
              adminEmail: order.userId?.email || "",
              orderType: order.orderType,
              items: formattedItems,
              total: order.total,
              subtotal: order.subtotal,
              tax: order.tax,
              deliveryCharge: order.deliveryCharge,
              paymentReference: null,
              receiptId: null,
            },
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    })
  );
}

const listSellerOrderAlerts = asyncHandler(async (req, res) => {
  await syncMissingSellerCodAlerts(req.user._id);

  const alerts = await Notification.find({
    type: "seller_order_alert",
    targetRole: "seller",
    userId: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(100);

  const orderIds = alerts
    .map((alert) => String(alert?.metadata?.orderId || ""))
    .filter(Boolean);

  if (orderIds.length > 0) {
    const orders = await Order.find({ _id: { $in: orderIds } }).select("_id status");
    const orderStatusById = new Map(orders.map((order) => [String(order._id), String(order.status || "pending")]));

    alerts.forEach((alert) => {
      const orderId = String(alert?.metadata?.orderId || "");
      const latestStatus = orderStatusById.get(orderId);
      if (!latestStatus) {
        return;
      }

      if (!alert.metadata || typeof alert.metadata !== "object") {
        alert.metadata = {};
      }
      alert.metadata.orderStatus = latestStatus;
    });
  }

  res.json({ success: true, alerts });
});

module.exports = { listSellerOrderAlerts };