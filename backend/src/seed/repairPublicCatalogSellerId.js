require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const { Product } = require("../models/Product");

const arracks = require("./arracks.import.json");
const beers = require("./beers.import.json");
const rums = require("./rums.import.json");
const whiskeys = require("./whiskeys.import.json");
const wines = require("./wines.import.json");
const foods = require("./foods.import.json");
const beverages = require("./beverages.import.json");

async function repairPublicCatalogSellerId() {
  await connectDB();

  const seedNames = [...arracks, ...beers, ...rums, ...whiskeys, ...wines, ...foods, ...beverages]
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean);

  const result = await Product.updateMany(
    {
      name: { $in: seedNames },
      sellerId: { $ne: null },
    },
    {
      $set: { sellerId: null },
    }
  );

  const modified = Number(result?.modifiedCount || 0);
  const matched = Number(result?.matchedCount || 0);

  console.log(`Public catalog repair complete. Matched: ${matched}, Updated: ${modified}`);
  await mongoose.disconnect();
}

repairPublicCatalogSellerId().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
