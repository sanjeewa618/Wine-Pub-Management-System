const { Cart } = require("../models/Cart");
const { Product } = require("../models/Product");
const { Order } = require("../models/Order");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

async function getOrCreateCart(userId) {
  const cart = await Cart.findOneAndUpdate(
    { userId },
    { userId, items: [] },
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

const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, selectedSize = "" } = req.body;
  const product = await Product.findById(productId);

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

module.exports = { getCart, addItem, updateItem, removeItem, checkout };
