const crypto = require("crypto");
const { Payment } = require("../models/Payment");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

const processPayment = asyncHandler(async (req, res) => {
  const { orderId, amount, paymentMethod = "card" } = req.body;

  if (!orderId || !amount) throw new ApiError(400, "orderId and amount are required");

  const payment = await Payment.create({
    orderId,
    userId: req.user._id,
    amount,
    paymentMethod,
    status: "completed",
    reference: `PAY-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
  });

  res.status(201).json({ success: true, payment });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");
  res.json({ success: true, payment });
});

module.exports = { processPayment, getPayment };
