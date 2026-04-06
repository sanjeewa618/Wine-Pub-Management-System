const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productType: { type: String, enum: ["wine", "arrack", "whiskey", "whisky", "rum", "beer", "bite", "food", "beverage"], required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    selectedSize: { type: String, default: "" },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    orderType: { type: String, enum: ["pickup", "delivery"], default: "pickup" },
    pickupDetails: {
      tableNumber: { type: String, default: "" },
    },
    deliveryAddress: {
      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
    paymentMethod: { type: String, enum: ["card", "cash", "other"], default: "card" },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"], default: "pending" },
    trackingNumber: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = { Order };
