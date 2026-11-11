const crypto = require("crypto");
const { Payment } = require("../models/Payment");
const { Order } = require("../models/Order");
const { User } = require("../models/User");
const {
  enqueueSellerOrderNotification,
} = require("../utils/sellerOrderQueue");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

/**
 * Core payment verification and recording engine.
 * Handles:
 * - Duplicate payment prevention (idempotent callbacks)
 * - Status validation (completed, pending, failed)
 * - Amount verification against order total
 * - Order paymentStatus synchronization
 * - Conditional RabbitMQ seller order notification (only on completed payment)
 */
async function recordAndProcessPayment({
  orderId,
  amount,
  userId = null,
  paymentMethod = "card",
  status = "completed",
  reference = null,
  provider = "manual",
  cardBrand = "",
  cardNumber = "",
  cardLast4 = "",
  orderType = "",
  tableNumber = "",
  deliveryAddress = "",
  actor = null,
}) {
  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // 1. Idempotency Check A: By transaction reference if provided
  if (reference) {
    const existingPayment = await Payment.findOne({ reference });
    if (existingPayment) {
      console.log(`[PAYMENT IDEMPOTENT] Duplicate payment reference received: ${reference}`);
      return {
        payment: existingPayment,
        order,
        isDuplicate: true,
      };
    }
  }

  // 2. Idempotency Check B: If order is already paid, prevent duplicate completed payments
  if (order.paymentStatus === "paid" && status === "completed") {
    const existingCompleted = await Payment.findOne({ orderId: order._id, status: "completed" });
    if (existingCompleted) {
      console.log(`[PAYMENT IDEMPOTENT] Order ${order._id} is already paid. Returning existing payment record.`);
      return {
        payment: existingCompleted,
        order,
        isDuplicate: true,
      };
    }
  }

  // Normalize cardLast4
  const finalLast4 = cardLast4 || String(cardNumber || "").replace(/\D/g, "").slice(-4);
  const finalReference = reference || `PAY-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const effectiveUserId = userId || actor?._id || order.userId;

  // 3. Amount Verification for completed payments
  const parsedAmount = Number(amount ?? order.total);
  if (status === "completed") {
    if (Math.abs(parsedAmount - Number(order.total)) > 0.01) {
      throw new ApiError(400, `Payment amount (${parsedAmount}) does not match order total (${order.total})`);
    }
  }

  // 4. Create Payment Document
  const payment = await Payment.create({
    orderId: order._id,
    userId: effectiveUserId,
    amount: parsedAmount,
    currency: "LKR",
    paymentMethod,
    status, // "completed" | "pending" | "failed"
    reference: finalReference,
    provider,
    cardBrand,
    cardLast4: finalLast4,
    receiptMeta: {
      orderType: orderType || order.orderType || "",
      tableNumber: tableNumber || order.pickupDetails?.tableNumber || "",
      deliveryAddress: deliveryAddress || order.deliveryAddress?.addressLine || "",
    },
  });

  // 5. Update Order payment status conditionally
  if (status === "completed") {
    order.paymentMethod = paymentMethod;
    order.paymentStatus = "paid";
    if (orderType === "pickup" && tableNumber) {
      if (!order.pickupDetails) order.pickupDetails = {};
      order.pickupDetails.tableNumber = tableNumber;
    }
    await order.save();
    console.log(`[PAYMENT SUCCESS] Order ${order._id} marked as 'paid' with reference: ${payment.reference}`);

    // 6. Enqueue RabbitMQ Seller Order Notification ONLY for completed payments by admin
    const actorUser = actor || (await User.findById(effectiveUserId).select("name email role"));
    if (String(actorUser?.role || "").toLowerCase() === "admin") {
      console.log(`[PAYMENT QUEUE] Publishing seller order notification for paid order ${order._id}...`);
      await enqueueSellerOrderNotification({
        order,
        payment,
        actor: actorUser,
        mode: "paid",
      });
    } else {
      console.log(`[PAYMENT QUEUE] Actor role is '${actorUser?.role || "customer"}'. Seller order notifications reserved for admin requests.`);
    }
  } else if (status === "failed") {
    // Keep order as unpaid
    order.paymentStatus = "unpaid";
    await order.save();
    console.warn(`[PAYMENT FAILED] Payment for order ${order._id} failed. Order paymentStatus remains 'unpaid'. No notification published.`);
  } else if (status === "pending") {
    // Keep order as unpaid
    order.paymentStatus = "unpaid";
    await order.save();
    console.log(`[PAYMENT PENDING] Payment for order ${order._id} is pending gateway confirmation. Order paymentStatus remains 'unpaid'. No notification published.`);
  }

  return { payment, order, isDuplicate: false };
}

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
    status = "completed",
    reference = null,
    provider = "direct_card",
  } = req.body;

  const result = await recordAndProcessPayment({
    orderId,
    amount,
    userId: req.user._id,
    paymentMethod,
    status,
    reference,
    provider,
    cardBrand,
    cardNumber,
    orderType,
    tableNumber,
    deliveryAddress,
    actor: req.user,
  });

  const statusCode = result.isDuplicate ? 200 : (status === "completed" ? 201 : 200);
  res.status(statusCode).json({
    success: status === "completed",
    payment: result.payment,
    isDuplicate: result.isDuplicate,
  });
});

const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const {
    orderId,
    amount,
    status = "completed",
    reference = null,
    transactionId = null,
    paymentMethod = "card",
    provider = "payment_gateway_webhook",
    cardBrand = "",
    cardLast4 = "",
  } = req.body;

  if (!orderId) {
    throw new ApiError(400, "Webhook payload missing orderId");
  }

  const effectiveRef = reference || transactionId || null;

  const result = await recordAndProcessPayment({
    orderId,
    amount,
    paymentMethod,
    status,
    reference: effectiveRef,
    provider,
    cardBrand,
    cardLast4,
  });

  res.status(200).json({
    success: true,
    message: result.isDuplicate ? "Duplicate webhook acknowledged" : `Payment status '${status}' recorded`,
    payment: result.payment,
    isDuplicate: result.isDuplicate,
  });
});

const verifyPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  const latestPayment = await Payment.findOne({ orderId }).sort({ createdAt: -1 });

  res.json({
    success: true,
    orderId: order._id,
    orderPaymentStatus: order.paymentStatus,
    payment: latestPayment || null,
  });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");
  res.json({ success: true, payment });
});

const listPayments = asyncHandler(async (req, res) => {
  const role = String(req.user?.role || "").toLowerCase();
  const filter = role === "admin" ? {} : { userId: req.user._id };

  const payments = await Payment.find(filter)
    .populate({ path: "userId", select: "name email role" })
    .populate({ path: "orderId", select: "trackingNumber orderType status total createdAt" })
    .sort({ createdAt: -1 });

  res.json({ success: true, payments });
});

module.exports = {
  recordAndProcessPayment,
  processPayment,
  handlePaymentWebhook,
  verifyPaymentStatus,
  getPayment,
  listPayments,
};
