const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");

const listSellerOrderAlerts = asyncHandler(async (req, res) => {
  const alerts = await Notification.find({
    type: "seller_order_alert",
    targetRole: "seller",
    userId: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ success: true, alerts });
});

module.exports = { listSellerOrderAlerts };