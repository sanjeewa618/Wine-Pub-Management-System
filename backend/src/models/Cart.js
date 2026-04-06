const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
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

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);

module.exports = { Cart };
