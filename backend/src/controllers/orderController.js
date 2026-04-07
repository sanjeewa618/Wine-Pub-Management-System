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
  const role = String(req.user?.role || "").toLowerCase();
  const filter = role === "admin" || role === "seller" ? {} : { userId: req.user._id };
  const orders = await Order.find(filter)
    .populate({ path: "userId", select: "name email role" })
    .populate({ path: "items.productId", select: "sellerId name productType" })
    .sort({ createdAt: -1 });

  if (role === "seller") {
    const sellerId = String(req.user._id);

    const sellerOrders = orders
      .map((order) => {
        const sellerItems = (order.items || []).filter((item) => {
          const itemSellerId = String(item?.productId?.sellerId || "");
          return itemSellerId === sellerId;
        });

        if (sellerItems.length === 0) {
          return null;
        }

        const sellerTotal = sellerItems.reduce(
          (sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0),
          0
        );

        return {
          ...order.toObject(),
          items: sellerItems,
          sellerTotal,
        };
      })
      .filter(Boolean);

    res.json({ success: true, orders: sellerOrders });
    return;
  }

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
