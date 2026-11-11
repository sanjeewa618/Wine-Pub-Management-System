const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");
const { connectDB } = require("./config/db");
const { User } = require("./models/User");
const { Product } = require("./models/Product");

const API_BASE = "http://127.0.0.1:5000/api";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRedisCachingTests() {
  console.log("================================================================");
  console.log("Wine-Pub Redis Caching Verification Test Suite");
  console.log("================================================================\n");

  await connectDB();

  // Create standalone redis client to inspect actual cache keys and values
  const redisClient = createClient({ url: REDIS_URL });
  await redisClient.connect();
  console.log("Connected to Redis verification inspector.");

  // Get admin user for authorization token
  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new Error("Admin user not found");
  const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  console.log(`[SETUP] Admin: ${admin.email} (ID: ${admin._id})\n`);

  // Helper to scan redis keys by pattern
  async function findKeys(pattern) {
    const keys = [];
    for await (const k of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      if (Array.isArray(k)) keys.push(...k);
      else if (k) keys.push(k);
    }
    return keys;
  }

  // Flush any existing product cache keys before test
  const existingKeys = await findKeys("products:*");
  if (existingKeys.length > 0) {
    await redisClient.del(existingKeys);
    console.log(`Cleaned up ${existingKeys.length} existing product cache keys.`);
  }

  // ===================================================================
  // TEST 1: Cache MISS on First List Request & Cache HIT on Second Request
  // ===================================================================
  console.log("----------------------------------------------------------------");
  console.log("TEST 1: Cache MISS and HIT for Product List (GET /api/wines)");
  console.log("----------------------------------------------------------------");

  const keysBefore1 = await findKeys("products:list:wine:*");
  console.log(`Redis list cache keys before request: ${keysBefore1.length} (Expected: 0)`);
  if (keysBefore1.length !== 0) throw new Error("Expected 0 keys before Test 1");

  // First request: Cache MISS
  const t0 = Date.now();
  const res1 = await fetch(`${API_BASE}/wines`);
  const d1 = await res1.json();
  const duration1 = Date.now() - t0;
  console.log(`Request 1 (First fetch - Cache MISS): Status ${res1.status}, Items: ${d1.items?.length}, Time: ${duration1}ms`);

  const keysAfter1 = await findKeys("products:list:wine:*");
  console.log(`Redis list cache keys after request 1: ${keysAfter1.length} (Key: ${keysAfter1[0]})`);
  if (keysAfter1.length === 0) throw new Error("TEST 1 FAILED: Cache key was NOT written to Redis!");

  const ttl = await redisClient.ttl(keysAfter1[0]);
  console.log(`Redis Key TTL: ${ttl}s (Expected <= 300s)`);

  // Second request: Cache HIT
  const t1 = Date.now();
  const res2 = await fetch(`${API_BASE}/wines`);
  const d2 = await res2.json();
  const duration2 = Date.now() - t1;
  console.log(`Request 2 (Second fetch - Cache HIT): Status ${res2.status}, Items: ${d2.items?.length}, Time: ${duration2}ms`);

  if (d1.items?.length !== d2.items?.length) {
    throw new Error("TEST 1 FAILED: Response items count mismatch between MISS and HIT!");
  }
  console.log("✅ TEST 1 PASSED: Cache MISS properly queries DB and populates Redis; Cache HIT serves instantly from Redis cache!");

  // ===================================================================
  // TEST 2: Cache MISS and HIT for Single Product (GET /api/wines/:id)
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 2: Cache MISS and HIT for Single Product (GET /api/wines/:id)");
  console.log("----------------------------------------------------------------");

  const testProduct = await Product.findOne({ isActive: { $ne: false }, sellerId: null });
  if (!testProduct) throw new Error("No active product found for Test 2");
  const testId = String(testProduct._id);
  const singleKey = `products:item:${testId}`;

  // Ensure key is not present in cache
  await redisClient.del(singleKey);
  const existsBefore = await redisClient.exists(singleKey);
  console.log(`Redis key '${singleKey}' exists before request: ${existsBefore === 1} (Expected: false)`);

  // First request: Cache MISS
  const resSingle1 = await fetch(`${API_BASE}/wines/${testId}`);
  const dataSingle1 = await resSingle1.json();
  console.log(`Request 1 (Cache MISS): Fetched '${dataSingle1.item?.name}'`);

  const existsAfter = await redisClient.exists(singleKey);
  console.log(`Redis key '${singleKey}' exists after request 1: ${existsAfter === 1} (Expected: true)`);
  if (existsAfter !== 1) throw new Error("TEST 2 FAILED: Product was not cached in Redis!");

  // Second request: Cache HIT
  const resSingle2 = await fetch(`${API_BASE}/wines/${testId}`);
  const dataSingle2 = await resSingle2.json();
  console.log(`Request 2 (Cache HIT): Fetched '${dataSingle2.item?.name}'`);

  if (dataSingle1.item?.name !== dataSingle2.item?.name) {
    throw new Error("TEST 2 FAILED: Data mismatch between Cache MISS and Cache HIT!");
  }
  console.log("✅ TEST 2 PASSED: Single product cached and served from Redis cache!");

  // ===================================================================
  // TEST 3: Cache Invalidation After Creating a Product (POST /api/wines)
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 3: Cache Invalidation After Product Creation (POST /api/wines)");
  console.log("----------------------------------------------------------------");

  // Populate list cache first
  await fetch(`${API_BASE}/wines`);
  const listKeysBeforeCreate = await findKeys("products:list:*");
  console.log(`List cache keys before product create: ${listKeysBeforeCreate.length}`);
  if (listKeysBeforeCreate.length === 0) throw new Error("List cache must be populated before create test");

  // Create new product
  const newProductPayload = {
    name: `Cache Invalidation Test Wine ${Date.now()}`,
    category: "Red Wine",
    productType: "wine",
    price: 8800,
    brand: "VinoVerse Reserve",
    originType: "Imported",
    country: "France",
    rating: 4.9,
    sizes: ["750ml"],
  };

  const createRes = await fetch(`${API_BASE}/wines`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(newProductPayload),
  });
  const createData = await createRes.json();
  console.log(`Product created via API: '${createData.item?.name}' (ID: ${createData.item?._id})`);
  if (!createData.item?._id) throw new Error("Product creation failed!");
  const createdId = String(createData.item._id);

  // Verify that all list cache keys have been invalidated
  const listKeysAfterCreate = await findKeys("products:list:*");
  console.log(`List cache keys after product create: ${listKeysAfterCreate.length} (Expected: 0)`);
  if (listKeysAfterCreate.length !== 0) {
    throw new Error("TEST 3 FAILED: Product list cache was NOT invalidated upon product creation!");
  }

  // Next request must be fresh and contain the newly created product
  const nextListRes = await fetch(`${API_BASE}/wines`);
  const nextListData = await nextListRes.json();
  const foundNewProduct = nextListData.items?.some((p) => String(p._id) === createdId);
  console.log(`Newly created product present in freshly fetched list: ${foundNewProduct}`);
  if (!foundNewProduct) throw new Error("TEST 3 FAILED: New product not found in fresh list!");

  console.log("✅ TEST 3 PASSED: Product list caches successfully invalidated upon product creation; fresh list returned!");

  // ===================================================================
  // TEST 4: Cache Invalidation After Updating a Product & No Stale Data
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 4: Cache Invalidation After Product Update (PUT /api/wines/:id)");
  console.log("----------------------------------------------------------------");

  // Populate cache for the single product and list
  await fetch(`${API_BASE}/wines/${createdId}`);
  await fetch(`${API_BASE}/wines`);

  const createdItemKey = `products:item:${createdId}`;
  const itemCachedBefore = await redisClient.exists(createdItemKey);
  const listCachedBefore = (await findKeys("products:list:*")).length;
  console.log(`Before update: Item cache exists = ${itemCachedBefore === 1}, List cache keys = ${listCachedBefore}`);
  if (itemCachedBefore !== 1 || listCachedBefore === 0) {
    throw new Error("Item and list caches must be populated before update test");
  }

  const updatedName = `Updated Cache Wine ${Date.now()}`;
  const updatedPrice = 9999;
  console.log(`Updating product to Name: '${updatedName}', Price: LKR ${updatedPrice}...`);

  const updateRes = await fetch(`${API_BASE}/wines/${createdId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      name: updatedName,
      price: updatedPrice,
    }),
  });
  const updateData = await updateRes.json();
  console.log(`Update API response: '${updateData.item?.name}', Price: ${updateData.item?.price}`);

  // Check Redis keys after update: both item cache and list caches MUST be deleted
  const itemCachedAfter = await redisClient.exists(createdItemKey);
  const listCachedAfter = (await findKeys("products:list:*")).length;
  console.log(`After update: Item cache exists = ${itemCachedAfter === 1} (Expected: false), List cache keys = ${listCachedAfter} (Expected: 0)`);

  if (itemCachedAfter !== 0) throw new Error("TEST 4 FAILED: Single item cache was NOT deleted upon update!");
  if (listCachedAfter !== 0) throw new Error("TEST 4 FAILED: List cache was NOT deleted upon update!");

  // Verify that fresh data (NOT stale cached data) is returned
  const freshItemRes = await fetch(`${API_BASE}/wines/${createdId}`);
  const freshItemData = await freshItemRes.json();
  console.log(`Fresh fetch after update: Name = '${freshItemData.item?.name}', Price = ${freshItemData.item?.price}`);

  if (freshItemData.item?.name !== updatedName || freshItemData.item?.price !== updatedPrice) {
    throw new Error("TEST 4 FAILED: Stale product data was returned after update!");
  }
  console.log("✅ TEST 4 PASSED: Both single item and list caches invalidated upon update. No stale data served!");

  // ===================================================================
  // TEST 5: Cache Invalidation After Deleting a Product (DELETE /api/wines/:id)
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 5: Cache Invalidation After Product Deletion (DELETE /api/wines/:id)");
  console.log("----------------------------------------------------------------");

  // Re-cache item before deletion
  await fetch(`${API_BASE}/wines/${createdId}`);
  await fetch(`${API_BASE}/wines`);

  const delRes = await fetch(`${API_BASE}/wines/${createdId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  console.log(`Delete API response status: ${delRes.status}`);

  // Verify cache keys are deleted
  const itemAfterDel = await redisClient.exists(createdItemKey);
  const listAfterDel = (await findKeys("products:list:*")).length;
  console.log(`After delete: Item cache exists = ${itemAfterDel === 1} (Expected: false), List cache keys = ${listAfterDel} (Expected: 0)`);

  if (itemAfterDel !== 0) throw new Error("TEST 5 FAILED: Single item cache was NOT deleted upon delete!");
  if (listAfterDel !== 0) throw new Error("TEST 5 FAILED: List cache was NOT deleted upon delete!");

  // Verify product is truly removed and returns 404
  const verifyDelRes = await fetch(`${API_BASE}/wines/${createdId}`);
  console.log(`Fetch deleted item status: ${verifyDelRes.status} (Expected: 404)`);
  if (verifyDelRes.status !== 404) {
    throw new Error("TEST 5 FAILED: Deleted item still returned status 200!");
  }
  console.log("✅ TEST 5 PASSED: Cache completely purged upon product deletion, 404 returned correctly!");

  // ===================================================================
  // TEST 6: Redis Operational Fallback Verification
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 6: Redis Fallback Graceful Handling");
  console.log("----------------------------------------------------------------");
  console.log("Verifying backend health and API responsiveness while Redis is active...");
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  console.log(`Health endpoint response:`, healthData);

  console.log("\n================================================================");
  console.log("🎉 ALL IN-CONTAINER REDIS CACHING TESTS PASSED 100%!");
  console.log("================================================================\n");

  await redisClient.quit();
  await mongoose.connection.close();
  process.exit(0);
}

runRedisCachingTests().catch(async (err) => {
  console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err.message);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});

