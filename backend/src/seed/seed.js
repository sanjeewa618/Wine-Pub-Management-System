require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const { User } = require("../models/User");
const { Product } = require("../models/Product");
const { Reservation } = require("../models/Reservation");
const { Order } = require("../models/Order");
const arracks = require("./arracks.import.json");
const beers = require("./beers.import.json");
const rums = require("./rums.import.json");
const whiskeys = require("./whiskeys.import.json");
const wines = require("./wines.import.json");
const foods = require("./foods.import.json");
const beverages = require("./beverages.import.json");

function normalizeProduct(product, sellerId) {
  const normalizedSizes = Array.isArray(product.sizes)
    ? product.sizes.map((size) => (typeof size === "string" ? size : size?.size || String(size || ""))).filter(Boolean)
    : [];

  const normalizedSizePricing = Array.isArray(product.sizes)
    ? product.sizes
        .filter((size) => typeof size === "object" && size?.size)
        .map((size) => ({
          size: String(size.size),
          price: Number(size.price ?? product.price ?? 0),
        }))
    : [];

  return {
    ...product,
    sizes: normalizedSizes,
    sizePricing: normalizedSizePricing,
    image:
      product.image ||
      "https://images.unsplash.com/photo-1514361892635-eae31a3d0f1d?auto=format&fit=crop&q=80&w=1000",
    sellerId: product.sellerId || sellerId,
    isActive: product.isActive !== false,
  };
}

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany(),
    Product.deleteMany(),
    Reservation.deleteMany(),
    Order.deleteMany(),
  ]);

  const admin = await User.create({ name: "Admin User", email: "admin@vinoverse.com", password: "Admin123!", role: "admin" });
  const seller = await User.create({ name: "Seller One", email: "seller@vinoverse.com", password: "Seller123!", role: "seller", status: "pending" });
  const customer = await User.create({ name: "Customer One", email: "customer@vinoverse.com", password: "Customer123!", role: "customer" });

  const productSeedData = [...arracks, ...beers, ...rums, ...whiskeys, ...wines, ...foods, ...beverages].map((product) => normalizeProduct(product, seller._id));
  await Product.insertMany(productSeedData);

  await Reservation.create({
    userId: customer._id,
    customerName: "Customer One",
    email: "customer@vinoverse.com",
    phone: "+94 77 123 4567",
    date: "2026-04-10",
    time: "19:30",
    guestCount: 4,
    specialRequests: "Window table",
    status: "pending",
    bookingReference: "RSV-DEMO1",
  });

  await Order.create({
    userId: customer._id,
    items: [],
    orderType: "pickup",
    paymentMethod: "card",
    subtotal: 0,
    tax: 0,
    deliveryCharge: 0,
    total: 0,
    status: "pending",
    trackingNumber: "TRK-DEMO1",
  });

  console.log("Seed completed");
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
