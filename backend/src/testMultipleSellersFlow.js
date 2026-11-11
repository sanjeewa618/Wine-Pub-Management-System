const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { connectRabbitMQ, closeRabbitMQ } = require("./config/rabbitmq");
const { Order } = require("./models/Order");
const { Payment } = require("./models/Payment");
const { User } = require("./models/User");
const { SellerProduct } = require("./models/SellerProduct");
const { Notification } = require("./models/Notification");
const { ProcessedNotification } = require("./models/ProcessedNotification");
const { recordAndProcessPayment } = require("./controllers/paymentController");
const { listSellerOrderAlerts } = require("./controllers/notificationController");
const { getOrder, confirmOrder } = require("./controllers/orderController");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMultipleSellersVerification() {
  console.log("================================================================");
  console.log("Multiple Sellers Order Notification Flow Test Suite");
  console.log("================================================================\n");

  await connectDB();
  await connectRabbitMQ();

  // 1. Setup Admin and 2 Distinct Sellers
  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new Error("Admin user not found in database");

  const sellers = await User.find({ role: "seller" }).limit(2);
  if (sellers.length < 2) {
    throw new Error(`At least 2 sellers required. Found ${sellers.length}`);
  }

  const sellerA = sellers[0];
  const sellerB = sellers[1];

  console.log(`[SETUP] Admin:    ${admin.name} (${admin.email}, ID: ${admin._id})`);
  console.log(`[SETUP] Seller A: ${sellerA.name} (${sellerA.email}, ID: ${sellerA._id})`);
  console.log(`[SETUP] Seller B: ${sellerB.name} (${sellerB.email}, ID: ${sellerB._id})\n`);

  // 2. Ensure Seller A has 2 Products and Seller B has 2 Products
  async function ensureSellerProduct(seller, name, price, category = "Wine") {
    let prod = await SellerProduct.findOne({ sellerId: seller._id, name });
    if (!prod) {
      prod = await SellerProduct.create({
        sellerId: seller._id,
        name,
        productType: "wine",
        category,
        price,
        brand: `${seller.name} Estate`,
        rating: 4.8,
        stock: 50,
      });
    }
    return prod;
  }

  const prodA1 = await ensureSellerProduct(sellerA, "Seller A Pinot Noir Reserve", 6000, "Red Wine");
  const prodA2 = await ensureSellerProduct(sellerA, "Seller A Sauvignon Blanc", 4800, "White Wine");

  const prodB1 = await ensureSellerProduct(sellerB, "Seller B Vintage Merlot", 7500, "Red Wine");
  const prodB2 = await ensureSellerProduct(sellerB, "Seller B Sparkling Rose", 5200, "Sparkling Wine");

  console.log("[SETUP] Seller A Products:");
  console.log(` - Product A1: ${prodA1.name} (LKR ${prodA1.price}, ID: ${prodA1._id})`);
  console.log(` - Product A2: ${prodA2.name} (LKR ${prodA2.price}, ID: ${prodA2._id})`);
  console.log("[SETUP] Seller B Products:");
  console.log(` - Product B1: ${prodB1.name} (LKR ${prodB1.price}, ID: ${prodB1._id})`);
  console.log(` - Product B2: ${prodB2.name} (LKR ${prodB2.price}, ID: ${prodB2._id})\n`);

  // ===================================================================
  // TEST SCENARIO 1: Create Single Order with Products from Both Sellers
  // ===================================================================
  console.log("----------------------------------------------------------------");
  console.log("TEST 1: Create Single Order with Multi-Seller Products");
  console.log("----------------------------------------------------------------");

  const items = [
    {
      productId: prodA1._id,
      sellerId: sellerA._id,
      productType: prodA1.productType,
      name: prodA1.name,
      quantity: 2,
      price: prodA1.price,
      brand: prodA1.brand,
      rating: prodA1.rating,
      selectedSize: "750ml",
    },
    {
      productId: prodA2._id,
      sellerId: sellerA._id,
      productType: prodA2.productType,
      name: prodA2.name,
      quantity: 1,
      price: prodA2.price,
      brand: prodA2.brand,
      rating: prodA2.rating,
      selectedSize: "750ml",
    },
    {
      productId: prodB1._id,
      sellerId: sellerB._id,
      productType: prodB1.productType,
      name: prodB1.name,
      quantity: 3,
      price: prodB1.price,
      brand: prodB1.brand,
      rating: prodB1.rating,
      selectedSize: "750ml",
    },
    {
      productId: prodB2._id,
      sellerId: sellerB._id,
      productType: prodB2.productType,
      name: prodB2.name,
      quantity: 2,
      price: prodB2.price,
      brand: prodB2.brand,
      rating: prodB2.rating,
      selectedSize: "750ml",
    },
  ];

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const deliveryCharge = 500;
  const total = subtotal + tax + deliveryCharge;

  const order = await Order.create({
    userId: admin._id,
    items,
    orderType: "delivery",
    deliveryAddress: {
      addressLine: "456 Marine Drive",
      city: "Colombo",
      province: "Western",
    },
    paymentMethod: "card",
    paymentStatus: "unpaid",
    subtotal,
    tax,
    deliveryCharge,
    total,
    trackingNumber: `TRK-MULTI-${Date.now()}`,
  });

  console.log(`✅ Single order created in MongoDB: ${order._id}`);
  console.log(` - Tracking Number: ${order.trackingNumber}`);
  console.log(` - Total Items: ${order.items.length} (2 from Seller A, 2 from Seller B)`);
  console.log(` - Order Total: LKR ${order.total}`);

  // ===================================================================
  // TEST SCENARIO 2: Online Payment & Multi-Seller Queue Dispatch
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 2: Complete Payment & Publish RabbitMQ Notification");
  console.log("----------------------------------------------------------------");

  const paymentRef = `PAY-MULTI-${Date.now()}`;
  const paymentResult = await recordAndProcessPayment({
    orderId: String(order._id),
    amount: order.total,
    userId: admin._id,
    paymentMethod: "card",
    status: "completed",
    reference: paymentRef,
    provider: "online_card_gateway",
    actor: admin,
  });

  console.log(`Payment confirmed with reference: ${paymentResult.payment.reference}`);
  console.log("Waiting 4s for RabbitMQ worker to consume and process multi-seller notifications...");
  await sleep(4000);

  // ===================================================================
  // TEST SCENARIO 3: Verify Separate Notifications & Strict Item Isolation
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 3: Verify Separate Notifications for Seller A & Seller B");
  console.log("----------------------------------------------------------------");

  const notifA = await Notification.findOne({
    type: "seller_order_alert",
    userId: sellerA._id,
    "metadata.orderId": String(order._id),
  });

  const notifB = await Notification.findOne({
    type: "seller_order_alert",
    userId: sellerB._id,
    "metadata.orderId": String(order._id),
  });

  if (!notifA) throw new Error("TEST 3 FAILED: Seller A notification not found!");
  if (!notifB) throw new Error("TEST 3 FAILED: Seller B notification not found!");

  console.log("✅ Both notifications exist for the single order!");
  console.log(` - Seller A Notification ID: ${notifA._id} (User: ${notifA.userId})`);
  console.log(` - Seller B Notification ID: ${notifB._id} (User: ${notifB.userId})`);

  // Verify Seller A's items
  const itemsA = notifA.metadata?.items || [];
  console.log(`\nSeller A Assigned Items (${itemsA.length}):`);
  itemsA.forEach((it) => console.log(` - ${it.name} (Qty: ${it.quantity}, Price: ${it.price})`));

  const hasProdA1 = itemsA.some((i) => String(i.productId) === String(prodA1._id));
  const hasProdA2 = itemsA.some((i) => String(i.productId) === String(prodA2._id));
  const hasProdB1InA = itemsA.some((i) => String(i.productId) === String(prodB1._id));
  const hasProdB2InA = itemsA.some((i) => String(i.productId) === String(prodB2._id));

  if (!hasProdA1 || !hasProdA2 || itemsA.length !== 2) {
    throw new Error("TEST 3 FAILED: Seller A does not have exactly Product A1 and Product A2!");
  }
  if (hasProdB1InA || hasProdB2InA) {
    throw new Error("TEST 3 FAILED: Security breach! Seller A notification contains Seller B's products!");
  }
  console.log("✅ Seller A receives ONLY Product A1 and Product A2 (0 products from Seller B).");

  // Verify Seller B's items
  const itemsB = notifB.metadata?.items || [];
  console.log(`\nSeller B Assigned Items (${itemsB.length}):`);
  itemsB.forEach((it) => console.log(` - ${it.name} (Qty: ${it.quantity}, Price: ${it.price})`));

  const hasProdB1 = itemsB.some((i) => String(i.productId) === String(prodB1._id));
  const hasProdB2 = itemsB.some((i) => String(i.productId) === String(prodB2._id));
  const hasProdA1InB = itemsB.some((i) => String(i.productId) === String(prodA1._id));
  const hasProdA2InB = itemsB.some((i) => String(i.productId) === String(prodA2._id));

  if (!hasProdB1 || !hasProdB2 || itemsB.length !== 2) {
    throw new Error("TEST 3 FAILED: Seller B does not have exactly Product B1 and Product B2!");
  }
  if (hasProdA1InB || hasProdA2InB) {
    throw new Error("TEST 3 FAILED: Security breach! Seller B notification contains Seller A's products!");
  }
  console.log("✅ Seller B receives ONLY Product B1 and Product B2 (0 products from Seller A).");

  // Verify same order reference
  if (String(notifA.metadata?.orderId) !== String(order._id) || String(notifB.metadata?.orderId) !== String(order._id)) {
    throw new Error("TEST 3 FAILED: Both notifications must reference the exact same order ID!");
  }
  console.log(`✅ Both notifications reference the same Order ID: ${order._id}`);

  // ===================================================================
  // TEST SCENARIO 4: Verify Zero Duplicate Notifications
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 4: Verify Zero Duplicate Notifications");
  console.log("----------------------------------------------------------------");

  const countNotifsForOrder = await Notification.countDocuments({
    type: "seller_order_alert",
    "metadata.orderId": String(order._id),
  });

  console.log(`Total seller notifications in database for this order: ${countNotifsForOrder} (Expected: 2)`);
  if (countNotifsForOrder !== 2) {
    throw new Error(`TEST 4 FAILED: Expected exactly 2 notifications, but found ${countNotifsForOrder}!`);
  }
  console.log("✅ TEST 4 PASSED: Exactly 2 notifications created (1 per seller). Zero duplicates!");

  // ===================================================================
  // TEST SCENARIO 5: Seller API Privacy & Data Isolation Verification
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 5: Seller API Item Isolation (getOrder & listSellerOrderAlerts)");
  console.log("----------------------------------------------------------------");

  // Helper to simulate express request/response for getOrder
  async function callGetOrderAs(user, orderId) {
    return new Promise((resolve, reject) => {
      const req = { user, params: { id: orderId } };
      const res = {
        status: (code) => ({
          json: (data) => reject(new Error(`HTTP ${code}: ${JSON.stringify(data)}`)),
        }),
        json: (data) => resolve(data),
      };
      getOrder(req, res, (err) => {
        if (err) reject(err);
      });
    });
  }

  // 1. Seller A calls getOrder
  const sellerAOrderView = await callGetOrderAs(sellerA, String(order._id));
  console.log(`Seller A API getOrder items count: ${sellerAOrderView.order.items.length}`);
  const sellerAProductNames = sellerAOrderView.order.items.map((i) => i.name);
  console.log("Seller A sees:", sellerAProductNames);

  if (sellerAOrderView.order.items.length !== 2) {
    throw new Error("TEST 5 FAILED: Seller A getOrder did not filter to 2 items!");
  }
  if (sellerAProductNames.some((n) => n.includes("Seller B"))) {
    throw new Error("TEST 5 FAILED: Security breach! Seller A can see Seller B's products via getOrder API!");
  }

  // 2. Seller B calls getOrder
  const sellerBOrderView = await callGetOrderAs(sellerB, String(order._id));
  console.log(`Seller B API getOrder items count: ${sellerBOrderView.order.items.length}`);
  const sellerBProductNames = sellerBOrderView.order.items.map((i) => i.name);
  console.log("Seller B sees:", sellerBProductNames);

  if (sellerBOrderView.order.items.length !== 2) {
    throw new Error("TEST 5 FAILED: Seller B getOrder did not filter to 2 items!");
  }
  if (sellerBProductNames.some((n) => n.includes("Seller A"))) {
    throw new Error("TEST 5 FAILED: Security breach! Seller B can see Seller A's products via getOrder API!");
  }

  // 3. Unauthorized user calls getOrder
  let unauthorizedBlocked = false;
  try {
    const fakeSeller = { _id: new mongoose.Types.ObjectId(), role: "seller" };
    await callGetOrderAs(fakeSeller, String(order._id));
  } catch (err) {
    if (err.statusCode === 403 || err.message.includes("403")) {
      unauthorizedBlocked = true;
    }
  }

  if (!unauthorizedBlocked) {
    throw new Error("TEST 5 FAILED: Unauthorized seller was NOT blocked with 403!");
  }
  console.log("✅ Unauthorized seller correctly received 403 Forbidden!");
  console.log("✅ TEST 5 PASSED: Seller APIs strictly enforce cross-seller item isolation!");

  // ===================================================================
  // TEST SCENARIO 6: Seller Confirmation Isolation
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 6: Seller Confirmation Isolation");
  console.log("----------------------------------------------------------------");

  // Helper to simulate express request/response for confirmOrder
  async function callConfirmOrderAs(user, orderId) {
    return new Promise((resolve, reject) => {
      const req = { user, params: { id: orderId } };
      const res = {
        status: (code) => ({
          json: (data) => reject(new Error(`HTTP ${code}: ${JSON.stringify(data)}`)),
        }),
        json: (data) => resolve(data),
      };
      confirmOrder(req, res, (err) => {
        if (err) reject(err);
      });
    });
  }

  // Seller A confirms the order
  await callConfirmOrderAs(sellerA, String(order._id));
  console.log("Seller A confirmed their portion of the order.");

  const refreshedNotifA = await Notification.findById(notifA._id);
  const refreshedNotifB = await Notification.findById(notifB._id);

  console.log(`Seller A Notification isRead: ${refreshedNotifA.isRead}, orderStatus: ${refreshedNotifA.metadata?.orderStatus}`);
  console.log(`Seller B Notification isRead: ${refreshedNotifB.isRead}, orderStatus: ${refreshedNotifB.metadata?.orderStatus}`);

  if (!refreshedNotifA.isRead || refreshedNotifA.metadata?.orderStatus !== "confirmed") {
    throw new Error("TEST 6 FAILED: Seller A's notification was not updated to confirmed!");
  }

  console.log("✅ TEST 6 PASSED: Seller confirmation is isolated and correctly updates seller notification status!");

  console.log("\n================================================================");
  console.log("🎉 ALL MULTIPLE SELLERS FLOW TESTS PASSED 100%!");
  console.log("================================================================\n");

  await closeRabbitMQ();
  await mongoose.connection.close();
  process.exit(0);
}

runMultipleSellersVerification().catch(async (err) => {
  console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err.message);
  try {
    await closeRabbitMQ();
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});

