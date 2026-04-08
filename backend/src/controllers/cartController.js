const { Cart } = require("../models/Cart");
const { Product } = require("../models/Product");
const { SellerProduct } = require("../models/SellerProduct");
const { Order } = require("../models/Order");
const { notifySellersForOrder } = require("../utils/sellerOrderAlerts");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

function toDeliveryAddress(rawAddress) {
  if (!rawAddress) {
    return { addressLine: "", city: "", province: "", notes: "" };
  }

  if (typeof rawAddress === "string") {
    return { addressLine: rawAddress, city: "", province: "", notes: "" };
  }

  return {
    addressLine: rawAddress.addressLine || "",
    city: rawAddress.city || "",
    province: rawAddress.province || "",
    notes: rawAddress.notes || "",
  };
}

async function getOrCreateCart(userId) {
  const cart = await Cart.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, items: [] } },
    { upsert: true, new: true }
  ).populate("items.productId");
  return cart;
}

function getProductIdValue(item) {
  return item?.productId?._id?.toString?.() || item?.productId?.toString?.() || "";
}

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  res.json({ success: true, cart });
});

const clearCart = asyncHandler(async (req, res) => {
  await Cart.updateOne(
    { userId: req.user._id },
    { $set: { items: [] }, $setOnInsert: { userId: req.user._id } },
    { upsert: true }
  );

  const refreshed = await Cart.findOne({ userId: req.user._id }).populate("items.productId");
  res.json({ success: true, cart: refreshed });
});

const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, selectedSize = "" } = req.body;
  const product = (await Product.findById(productId)) || (await SellerProduct.findById(productId));

  if (!product) throw new ApiError(404, "Product not found");

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find(
    (item) => getProductIdValue(item) === productId && item.selectedSize === selectedSize
  );

  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    cart.items.push({
      productId: product._id,
      productType: product.productType,
      name: product.name,
      image: product.image,
      quantity: Number(quantity),
      selectedSize,
      price: product.price,
    });
  }

  await cart.save();
  const refreshed = await Cart.findOne({ userId: req.user._id }).populate("items.productId");
  res.status(201).json({ success: true, cart: refreshed });
});

const updateItem = asyncHandler(async (req, res) => {
  const { quantity, selectedSize = "" } = req.body;
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  const item = cart.items.find(
    (entry) => getProductIdValue(entry) === req.params.productId && (selectedSize ? entry.selectedSize === selectedSize : true)
  );
  if (!item) throw new ApiError(404, "Item not found in cart");

  item.quantity = Number(quantity);
  await cart.save();
  const refreshed = await Cart.findOne({ userId: req.user._id }).populate("items.productId");
  res.json({ success: true, cart: refreshed });
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  const selectedSize = req.query.selectedSize ? String(req.query.selectedSize) : "";
  cart.items = cart.items.filter(
    (entry) => getProductIdValue(entry) !== req.params.productId || (selectedSize && entry.selectedSize !== selectedSize)
  );
  await cart.save();
  const refreshed = await Cart.findOne({ userId: req.user._id }).populate("items.productId");
  res.json({ success: true, cart: refreshed });
});

const checkout = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  const orderType = req.body.orderType || "pickup";
  const deliveryAddress = toDeliveryAddress(req.body.deliveryAddress);

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const deliveryCharge = orderType === "delivery" ? 500 : 0;
  const total = subtotal + tax + deliveryCharge;

  const cartProductIds = cart.items.map((item) => String(item?.productId || "")).filter(Boolean);
  const [catalogProducts, sellerProducts] = await Promise.all([
    Product.find({ _id: { $in: cartProductIds } }).select("_id sellerId brand rating"),
    SellerProduct.find({ _id: { $in: cartProductIds } }).select("_id sellerId brand rating"),
  ]);
  const productById = new Map([...catalogProducts, ...sellerProducts].map((product) => [String(product._id), product]));

  const enrichedItems = cart.items.map((item) => {
    const product = productById.get(String(item?.productId || ""));
    return {
      ...item.toObject(),
      sellerId: product?.sellerId || null,
      brand: product?.brand || "",
      rating: Number(product?.rating || 0),
    };
  });

  const order = await Order.create({
    userId: req.user._id,
    items: enrichedItems,
    orderType,
    pickupDetails: {
      tableNumber: req.body.pickupTableNumber || "",
    },
    deliveryAddress,
    paymentMethod: req.body.paymentMethod || "card",
    paymentStatus: "unpaid",
    subtotal,
    tax,
    deliveryCharge,
    total,
    trackingNumber: `TRK-${Date.now()}`,
  });

  const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";
  const paymentMethod = String(order.paymentMethod || "").toLowerCase();
  const isCodOrder = paymentMethod === "cash" || paymentMethod === "cod";

  if (isAdmin && isCodOrder) {
    await notifySellersForOrder({
      order,
      actor: req.user,
      mode: "cod",
    });
  }

  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
});

module.exports = { getCart, clearCart, addItem, updateItem, removeItem, checkout };
