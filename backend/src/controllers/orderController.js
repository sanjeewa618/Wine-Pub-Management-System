const { Order } = require("../models/Order");
const { Cart } = require("../models/Cart");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

const createOrder = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.items.length === 0) throw new ApiError(400, "Cart is empty");

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const deliveryCharge = req.body.orderType === "delivery" ? 500 : 0;
  const total = subtotal + tax + deliveryCharge;

  const order = await Order.create({
    userId: req.user._id,
    items: cart.items,
    orderType: req.body.orderType || "pickup",
    deliveryAddress: req.body.deliveryAddress || {},
    paymentMethod: req.body.paymentMethod || "card",
    subtotal,
    tax,
    deliveryCharge,
    total,
    trackingNumber: `TRK-${Date.now()}`,
  });

  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
});

const listOrders = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { userId: req.user._id };
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ success: true, order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ success: true, order });
});

const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  res.json({
    success: true,
    trackingNumber: order.trackingNumber,
    status: order.status,
    timeline: ["pending", "confirmed", "preparing", "ready", "delivered"],
  });
});

module.exports = { createOrder, listOrders, getOrder, updateOrderStatus, trackOrder };
