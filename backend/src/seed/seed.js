require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const { User } = require("../models/User");
const { Product } = require("../models/Product");
const { Reservation } = require("../models/Reservation");
const { Order } = require("../models/Order");

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

  await Product.insertMany([
    {
      name: "Coco Pure Arrack",
      productType: "wine",
      category: "Arrack",
      subCategory: "100% Coconut Arrack",
      brand: "Ceylon Spirit",
      country: "Sri Lanka",
      originType: "Local",
      price: 2350,
      sizes: ["50 ml", "750 ml"],
      stock: 20,
      rating: 4.5,
      description: "Smooth coconut arrack with classic Sri Lankan profile.",
      alcoholPercentage: "33%",
      image: "https://images.unsplash.com/photo-1596392301391-e3f8ef32f6c9?auto=format&fit=crop&q=80&w=1000",
      sellerId: seller._id,
    },
    {
      name: "Truffle Fries",
      productType: "bite",
      category: "Quick Bites",
      subCategory: "Fries",
      brand: "Kitchen",
      country: "Sri Lanka",
      originType: "Local",
      price: 1450,
      sizes: ["1 serving"],
      stock: 40,
      rating: 4.8,
      description: "Crispy truffle fries made for wine pairing.",
      image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=1000",
      spiceLevel: "Mild",
      vegType: "Veg",
      pairWith: "Wine",
    },
  ]);

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
