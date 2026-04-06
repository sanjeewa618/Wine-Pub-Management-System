const crypto = require("crypto");
const { Payment } = require("../models/Payment");
const { Order } = require("../models/Order");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

const processPayment = asyncHandler(async (req, res) => {
  const {
    orderId,
    amount,
    paymentMethod = "card",
    cardBrand = "",
    cardNumber = "",
    orderType = "",
    tableNumber = "",
    deliveryAddress = "",
  } = req.body;

  if (!orderId || !amount) throw new ApiError(400, "orderId and amount are required");

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  const cardLast4 = String(cardNumber || "").replace(/\D/g, "").slice(-4);

  const payment = await Payment.create({
    orderId,
    userId: req.user._id,
    amount,
    paymentMethod,
    status: "completed",
    reference: `PAY-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    cardBrand,
    cardLast4,
    receiptMeta: {
      orderType,
      tableNumber,
      deliveryAddress,
    },
  });

  order.paymentMethod = paymentMethod;
  order.paymentStatus = "paid";
  if (orderType === "pickup" && tableNumber) {
    order.pickupDetails.tableNumber = tableNumber;
  }
  await order.save();

  res.status(201).json({ success: true, payment });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");
  res.json({ success: true, payment });
});

module.exports = { processPayment, getPayment };
