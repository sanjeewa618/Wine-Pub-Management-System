const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "LKR" },
    paymentMethod: { type: String, enum: ["card", "cash", "other"], default: "card" },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    reference: { type: String, required: true, unique: true },
    provider: { type: String, default: "manual" },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { Payment };
