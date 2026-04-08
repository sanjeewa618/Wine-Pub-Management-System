const { Order } = require("../models/Order");
const { Cart } = require("../models/Cart");
const { Product } = require("../models/Product");
const { SellerProduct } = require("../models/SellerProduct");
const { Notification } = require("../models/Notification");
const { notifySellersForOrder } = require("../utils/sellerOrderAlerts");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

function normalizeOrderItem(item, sourceProduct) {
  return {
    productId: sourceProduct._id,
    sellerId: sourceProduct.sellerId || null,
    productType: sourceProduct.productType,
    name: sourceProduct.name,
    image: sourceProduct.image || item?.image || "",
    quantity: Number(item?.quantity || 0),
    selectedSize: item?.selectedSize || "",
    price: Number(item?.price ?? sourceProduct.price ?? 0),
    brand: sourceProduct.brand || "",
    rating: Number(sourceProduct.rating || 0),
  };
}

async function resolveDirectOrderItems(items = []) {
  const normalizedItems = Array.isArray(items) ? items.filter((item) => Number(item?.quantity || 0) > 0) : [];
  if (normalizedItems.length === 0) {
    throw new ApiError(400, "Order items are required");
  }

  const productIds = normalizedItems.map((item) => String(item?.productId || item?.id || "")).filter(Boolean);
  const [catalogProducts, sellerProducts] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).select("_id sellerId name productType image price brand rating"),
    SellerProduct.find({ _id: { $in: productIds } }).select("_id sellerId name productType image price brand rating"),
  ]);

  const byId = new Map();
  [...catalogProducts, ...sellerProducts].forEach((product) => {
    byId.set(String(product._id), product);
  });

  const resolvedItems = [];
  const sellerIds = new Set();

  for (const item of normalizedItems) {
    const productId = String(item?.productId || item?.id || "");
    const product = byId.get(productId);
    if (!product) {
      throw new ApiError(404, `Product not found for item ${productId}`);
    }

    if (!String(product.sellerId || "")) {
      throw new ApiError(400, `Seller not found for item ${product.name || productId}`);
    }

    sellerIds.add(String(product.sellerId));
    resolvedItems.push(normalizeOrderItem(item, product));
  }

  if (sellerIds.size > 1) {
    throw new ApiError(400, "Please create one seller request at a time");
  }

  return {
    items: resolvedItems,
    sellerIds: Array.from(sellerIds),
  };
}

async function createAdminRequestOrder(req) {
  const { items } = await resolveDirectOrderItems(req.body.items || []);
  const orderType = String(req.body.orderType || "pickup");
  const paymentMethod = String(req.body.paymentMethod || "other");
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const deliveryCharge = orderType === "delivery" ? 500 : 0;
  const total = subtotal + tax + deliveryCharge;

  const order = await Order.create({
    userId: req.user._id,
    items,
    orderType,
    deliveryAddress: req.body.deliveryAddress || {},
    paymentMethod,
    paymentStatus: "unpaid",
    subtotal,
    tax,
    deliveryCharge,
    total,
    trackingNumber: `TRK-${Date.now()}`,
  });

  return order;
}

const createOrder = asyncHandler(async (req, res) => {
  if (String(req.user?.role || "") === "admin" && Array.isArray(req.body.items) && req.body.items.length > 0) {
    const order = await createAdminRequestOrder(req);

    const paymentMethod = String(order.paymentMethod || "").toLowerCase();
    if (paymentMethod === "cash" || paymentMethod === "cod") {
      await notifySellersForOrder({
        order,
        actor: req.user,
        mode: "cod",
      });
    }

    res.status(201).json({ success: true, order });
    return;
  }

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
    .populate({ path: "items.productId", select: "sellerId name productType brand rating" })
    .sort({ createdAt: -1 });

  if (role === "seller") {
    const sellerId = String(req.user._id);

    const sellerOrders = orders
      .map((order) => {
        const sellerItems = (order.items || []).filter((item) => {
          const itemSellerId = String(item?.sellerId || item?.productId?.sellerId || "");
          return itemSellerId === sellerId;
        });

        if (sellerItems.length === 0) {
          return null;
        }

        const sellerTotal = sellerItems.reduce(
          (sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0),
          0
        );

        const sellerRating = sellerItems.length
          ? sellerItems.reduce((sum, item) => sum + Number(item?.productId?.rating || 0), 0) / sellerItems.length
          : 0;

        return {
          ...order.toObject(),
          items: sellerItems,
          sellerTotal,
          sellerRating: Number(sellerRating.toFixed(1)),
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

const confirmOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate({ path: "items.productId", select: "sellerId" });
  if (!order) throw new ApiError(404, "Order not found");

  const role = String(req.user?.role || "").toLowerCase();
  if (role === "seller") {
    const ownsOrder = (order.items || []).some(
      (item) => String(item?.sellerId || item?.productId?.sellerId || "") === String(req.user._id)
    );
    if (!ownsOrder) {
      throw new ApiError(403, "This order is not assigned to you");
    }
  }

  order.status = "confirmed";
  await order.save();

  if (role === "seller") {
    try {
      await Notification.updateMany(
        { type: "seller_order_alert", userId: req.user._id, "metadata.orderId": String(order._id) },
        {
          $set: {
            isRead: true,
            "metadata.orderStatus": "confirmed",
          },
        }
      );
    } catch (error) {
      // Do not block seller confirmation because of notification sync issues.
      // eslint-disable-next-line no-console
      console.error("Failed to sync seller notification status:", error?.message || error);
    }
  }

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

module.exports = { createOrder, listOrders, getOrder, updateOrderStatus, confirmOrder, trackOrder };
