const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, trim: true, default: null, index: true },
    type: {
      type: String,
      enum: ["seller_registration_requested", "seller_registration_approved", "seller_order_alert"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    targetRole: { type: String, enum: ["admin", "seller"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Database-level unique constraint to strictly prevent duplicate seller order notifications
notificationSchema.index(
  { type: 1, userId: 1, "metadata.orderId": 1 },
  {
    unique: true,
    name: "unique_seller_order_alert",
    partialFilterExpression: {
      type: "seller_order_alert",
      userId: { $exists: true },
      "metadata.orderId": { $exists: true },
    },
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification };
