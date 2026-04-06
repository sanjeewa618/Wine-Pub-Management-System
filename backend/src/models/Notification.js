const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["seller_registration_requested", "seller_registration_approved"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    targetRole: { type: String, enum: ["admin", "seller"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification };