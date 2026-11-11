const mongoose = require("mongoose");
const { SellerProduct } = require("../models/SellerProduct");
const { Notification } = require("../models/Notification");
const { ProcessedNotification } = require("../models/ProcessedNotification");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  // Ensure collections exist
  try {
    await SellerProduct.createCollection();
  } catch (error) {
    if (!String(error?.codeName || "").includes("NamespaceExists")) {
      throw error;
    }
  }

  try {
    await Notification.createCollection();
  } catch (error) {
    if (!String(error?.codeName || "").includes("NamespaceExists")) {
      throw error;
    }
  }

  try {
    await ProcessedNotification.createCollection();
  } catch (error) {
    if (!String(error?.codeName || "").includes("NamespaceExists")) {
      throw error;
    }
  }

  // Synchronize database-level indexes
  await Promise.all([
    SellerProduct.syncIndexes(),
    Notification.syncIndexes(),
    ProcessedNotification.syncIndexes(),
  ]);

  console.log("MongoDB connected and unique indexes synchronized");
}

module.exports = { connectDB };
