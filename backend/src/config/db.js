const mongoose = require("mongoose");
const { SellerProduct } = require("../models/SellerProduct");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  // Ensure the dedicated seller products collection exists even when it has no documents yet.
  try {
    await SellerProduct.createCollection();
  } catch (error) {
    // NamespaceExists is safe to ignore when collection is already present.
    if (!String(error?.codeName || "").includes("NamespaceExists")) {
      throw error;
    }
  }

  await SellerProduct.syncIndexes();
  console.log("MongoDB connected");
}

module.exports = { connectDB };
