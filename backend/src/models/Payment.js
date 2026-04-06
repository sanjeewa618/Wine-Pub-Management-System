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
    cardBrand: { type: String, default: "" },
    cardLast4: { type: String, default: "" },
    receiptMeta: {
      orderType: { type: String, default: "" },
      tableNumber: { type: String, default: "" },
      deliveryAddress: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { Payment };
