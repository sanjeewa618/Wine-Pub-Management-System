const { Cart } = require("../models/Cart");
const { Product } = require("../models/Product");
const { Order } = require("../models/Order");
const { User } = require("../models/User");
const { Notification } = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");
const { sendEmail } = require("../utils/emailService");

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

  const orderType = req.body.orderType || "pickup";
  const deliveryAddress = toDeliveryAddress(req.body.deliveryAddress);

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const deliveryCharge = orderType === "delivery" ? 500 : 0;
  const total = subtotal + tax + deliveryCharge;

  const order = await Order.create({
    userId: req.user._id,
    items: cart.items,
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

  // If an admin places an order that includes seller products, notify each relevant seller.
  if (String(req.user?.role || "") === "admin") {
    const productIds = cart.items
      .map((item) => String(item?.productId || ""))
      .filter(Boolean);

    if (productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds } }).select("_id name sellerId");
      const productsById = new Map(products.map((product) => [String(product._id), product]));
      const sellerItemsMap = new Map();

      cart.items.forEach((item) => {
        const product = productsById.get(String(item?.productId || ""));
        const sellerId = String(product?.sellerId || "");
        if (!sellerId) {
          return;
        }

        if (!sellerItemsMap.has(sellerId)) {
          sellerItemsMap.set(sellerId, []);
        }

        sellerItemsMap.get(sellerId).push({
          productId: String(item?.productId || ""),
          name: product?.name || item?.name || "Item",
          quantity: Number(item?.quantity || 0),
          price: Number(item?.price || 0),
        });
      });

      const sellerIds = Array.from(sellerItemsMap.keys());

      if (sellerIds.length > 0) {
        const sellers = await User.find({ _id: { $in: sellerIds }, role: "seller" }).select("name email");
        const sellerById = new Map(sellers.map((seller) => [String(seller._id), seller]));

        await Promise.all(
          sellerIds.map(async (sellerId) => {
            const seller = sellerById.get(sellerId);
            const itemList = sellerItemsMap.get(sellerId) || [];

            await Notification.create({
              type: "seller_order_alert",
              title: `New order from admin (${req.user?.email || "admin"})`,
              message: `Payment: ${req.body.paymentMethod || "card"} · ${itemList.length} item(s) assigned to you`,
              targetRole: "seller",
              userId: sellerId,
              metadata: {
                orderId: String(order._id),
                trackingNumber: order.trackingNumber,
                paymentMethod: req.body.paymentMethod || "card",
                adminName: req.user?.name || "Admin",
                adminEmail: req.user?.email || "",
                orderType,
                items: itemList,
              },
            });

            if (seller?.email) {
              const listText = itemList
                .map((entry) => `- ${entry.name} x${entry.quantity} (LKR ${entry.price.toFixed(2)})`)
                .join("\n");

              const adminEmail = String(req.user?.email || "").trim().toLowerCase();

              await sendEmail({
                to: seller.email,
                from: adminEmail || undefined,
                replyTo: adminEmail || undefined,
                subject: `New Seller Order Alert - ${order.trackingNumber}`,
                text:
                  `Hello ${seller.name || "Seller"},\n\n` +
                  `A new order has been assigned to you by admin ${req.user?.name || "Admin"} (${adminEmail || "N/A"}).\n` +
                  `Payment Method: ${req.body.paymentMethod || "card"}\n` +
                  `Order Type: ${orderType}\n` +
                  `Tracking Number: ${order.trackingNumber}\n\n` +
                  `Assigned Items:\n${listText}\n\n` +
                  `Please check your seller dashboard orders page for full details.`,
              });
            }
          })
        );
      }
    }
  }

  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
});

module.exports = { getCart, addItem, updateItem, removeItem, checkout };
