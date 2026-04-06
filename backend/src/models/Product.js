const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    productType: { type: String, enum: ["wine", "arrack", "whiskey", "whisky", "rum", "beer", "bite", "food", "beverage"], required: true },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, default: "" },
    brand: { type: String, default: "" },
    country: { type: String, default: "" },
    originType: { type: String, enum: ["Local", "Imported"], default: "Local" },
    price: { type: Number, required: true, min: 0 },
    sizes: [{ type: String }],
    sizePricing: [
      {
        size: { type: String, trim: true },
        price: { type: Number, min: 0 },
      },
    ],
    stock: { type: Number, default: 0 },
    rating: { type: Number, default: 4 },
    description: { type: String, default: "" },
    alcoholPercentage: { type: String, default: "" },
    image: { type: String, default: "" },
    spiceLevel: { type: String, default: "" },
    vegType: { type: String, default: "" },
    pairWith: { type: String, default: "" },
    popularInPub: { type: Boolean, default: false },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = { Product };
