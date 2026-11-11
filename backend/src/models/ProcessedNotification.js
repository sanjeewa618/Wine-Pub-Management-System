const mongoose = require("mongoose");

const processedNotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["paid", "cod"],
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    errorReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-expire processed notification records after 30 days to manage database growth
processedNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const ProcessedNotification = mongoose.model(
  "ProcessedNotification",
  processedNotificationSchema
);

module.exports = { ProcessedNotification };

