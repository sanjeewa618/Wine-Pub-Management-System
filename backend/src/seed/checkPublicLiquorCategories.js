require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const { Product } = require("../models/Product");

async function checkPublicLiquorCategories() {
  await connectDB();

  const rows = await Product.aggregate([
    {
      $match: {
        sellerId: null,
        isActive: { $ne: false },
        productType: { $in: ["wine", "arrack", "whiskey", "whisky", "rum", "vodka", "beer"] },
      },
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log("Public liquor categories:");
  rows.forEach((row) => {
    console.log(`- ${row._id}: ${row.count}`);
  });

  await mongoose.disconnect();
}

checkPublicLiquorCategories().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
