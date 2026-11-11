const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { connectRabbitMQ, getRabbitChannel, closeRabbitMQ } = require("./config/rabbitmq");
const { QUEUES } = require("./config/queueTopology");
const { publishToQueue } = require("./utils/queuePublisher");
const { Order } = require("./models/Order");
const { User } = require("./models/User");
const { Notification } = require("./models/Notification");
const { ProcessedNotification } = require("./models/ProcessedNotification");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runIdempotencyTests() {
  console.log("================================================================");
  console.log("Starting RabbitMQ Idempotency & Deduplication Test Suite");
  console.log("================================================================\n");

  await connectDB();
  await connectRabbitMQ();

  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new Error("Admin user not found");

  const order = await Order.findOne();
  if (!order) throw new Error("Order not found");

  const orderId = String(order._id);
  const actorId = String(admin._id);

  console.log(`[TEST SETUP] Using Admin: ${admin.email}, Order: ${orderId}\n`);

  // ===================================================================
  // TEST 1: Normal Message Processing
  // ===================================================================
  console.log("----------------------------------------------------------------");
  console.log("TEST 1: Normal Message Processing (New Notification Event)");
  console.log("----------------------------------------------------------------");

  const test1NotificationId = `notif_test1_${Date.now()}`;
  const test1Payload = {
    notificationId: test1NotificationId,
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
    __testCase: "TEST_1_NORMAL",
  };

  await publishToQueue(QUEUES.MAIN, test1Payload, {
    headers: { "x-notification-id": test1NotificationId },
  });
  console.log(`Published message with notificationId: ${test1NotificationId}`);
  console.log("Waiting 3s for worker to process...");
  await sleep(3000);

  const processed1 = await ProcessedNotification.findOne({ notificationId: test1NotificationId });
  if (processed1 && processed1.status === "completed") {
    console.log("✅ TEST 1 PASSED: ProcessedNotification registry updated to 'completed':", {
      notificationId: processed1.notificationId,
      status: processed1.status,
      processedAt: processed1.processedAt,
    });
  } else {
    throw new Error(`TEST 1 FAILED: ProcessedNotification status is ${processed1?.status}`);
  }

  // ===================================================================
  // TEST 2: Duplicate Message (Same notificationId re-delivered)
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 2: Duplicate Message Prevention (Duplicate notificationId)");
  console.log("----------------------------------------------------------------");

  const notifCountBefore = await Notification.countDocuments({
    type: "seller_order_alert",
    "metadata.orderId": orderId,
  });
  console.log(`Notification records in DB before duplicate message: ${notifCountBefore}`);

  // Publish the exact same payload again
  await publishToQueue(QUEUES.MAIN, test1Payload, {
    headers: { "x-notification-id": test1NotificationId },
  });
  console.log(`Re-published DUPLICATE message with identical notificationId: ${test1NotificationId}`);
  console.log("Waiting 3s for worker to detect and safely acknowledge without re-processing...");
  await sleep(3000);

  const notifCountAfter = await Notification.countDocuments({
    type: "seller_order_alert",
    "metadata.orderId": orderId,
  });
  console.log(`Notification records in DB after duplicate message: ${notifCountAfter}`);

  if (notifCountBefore === notifCountAfter) {
    console.log("✅ TEST 2 PASSED: Duplicate message safely acknowledged! Zero duplicate DB records created, no repeated business operations.");
  } else {
    throw new Error(`TEST 2 FAILED: Notification count increased from ${notifCountBefore} to ${notifCountAfter}!`);
  }

  // ===================================================================
  // TEST 3: Concurrent Duplicate Messages (Race Condition Safety)
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 3: Concurrent Duplicate Message Processing (Race Condition)");
  console.log("----------------------------------------------------------------");

  const test3NotificationId = `notif_concurrent_${Date.now()}`;
  const test3Payload = {
    notificationId: test3NotificationId,
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
    __testCase: "TEST_3_CONCURRENT",
  };

  console.log(`Firing 3 identical messages concurrently with notificationId: ${test3NotificationId}`);
  await Promise.all([
    publishToQueue(QUEUES.MAIN, test3Payload, { headers: { "x-notification-id": test3NotificationId } }),
    publishToQueue(QUEUES.MAIN, test3Payload, { headers: { "x-notification-id": test3NotificationId } }),
    publishToQueue(QUEUES.MAIN, test3Payload, { headers: { "x-notification-id": test3NotificationId } }),
  ]);

  console.log("Waiting 4s for worker to resolve concurrent messages...");
  await sleep(4000);

  const processed3 = await ProcessedNotification.find({ notificationId: test3NotificationId });
  console.log(`ProcessedNotification entries for ${test3NotificationId}: ${processed3.length} (Status: ${processed3[0]?.status})`);

  if (processed3.length === 1 && processed3[0].status === "completed") {
    console.log("✅ TEST 3 PASSED: Concurrent duplicate messages safely handled! Exactly 1 registry entry exists and is completed.");
  } else {
    throw new Error(`TEST 3 FAILED: Found ${processed3.length} processed entries or status != completed`);
  }

  // ===================================================================
  // TEST 4: Worker Retry Scenario (In-flight release on failure)
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 4: Worker Retry Scenario (In-flight released for valid retries)");
  console.log("----------------------------------------------------------------");

  const test4NotificationId = `notif_retry_${Date.now()}`;
  const test4Payload = {
    notificationId: test4NotificationId,
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
    __simulateFailure: "transient",
    __failUntilRetry: 1, // attempt 1 fails, attempt 2 (retry 1) succeeds
    __testCase: "TEST_4_RETRY",
  };

  await publishToQueue(QUEUES.MAIN, test4Payload, {
    headers: { "x-notification-id": test4NotificationId },
  });
  console.log(`Published message with simulated transient failure: ${test4NotificationId}`);
  console.log("Waiting 2s for attempt 1 to fail, release in-flight status, and move to retry queue...");
  await sleep(2000);

  const inFlightDuringRetry = await ProcessedNotification.findOne({ notificationId: test4NotificationId });
  console.log(`ProcessedNotification status during retry delay: ${inFlightDuringRetry ? inFlightDuringRetry.status : "NONE (properly cleared for retry)"}`);

  console.log("Waiting 12s for TTL (10s) expiration and worker retry execution...");
  await sleep(12000);

  const processed4AfterRetry = await ProcessedNotification.findOne({ notificationId: test4NotificationId });
  if (processed4AfterRetry && processed4AfterRetry.status === "completed") {
    console.log("✅ TEST 4 PASSED: Retry message was NOT blocked by idempotency gate and succeeded on retry:", {
      notificationId: processed4AfterRetry.notificationId,
      status: processed4AfterRetry.status,
      retryCount: processed4AfterRetry.retryCount,
    });
  } else {
    throw new Error(`TEST 4 FAILED: Retry record status is ${processed4AfterRetry?.status}`);
  }

  // ===================================================================
  // TEST 5: Database-Level Unique Constraint Enforcement
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 5: Database-Level Unique Constraint on Notification Collection");
  console.log("----------------------------------------------------------------");

  const seller = await User.findOne({ role: "seller" });
  const sellerId = seller ? seller._id : admin._id;
  const testOrderId = new mongoose.Types.ObjectId().toString();

  // Insert first record
  await Notification.create({
    type: "seller_order_alert",
    title: "Direct Constraint Test 1",
    message: "First insert",
    targetRole: "seller",
    userId: sellerId,
    metadata: { orderId: testOrderId },
  });
  console.log("First notification inserted directly into database.");

  // Attempt to insert duplicate record with identical (type, userId, metadata.orderId)
  let caughtDuplicate = false;
  try {
    await Notification.create({
      type: "seller_order_alert",
      title: "Direct Constraint Test 2 (Duplicate)",
      message: "Second insert (should fail)",
      targetRole: "seller",
      userId: sellerId,
      metadata: { orderId: testOrderId },
    });
  } catch (dbErr) {
    if (dbErr.code === 11000) {
      caughtDuplicate = true;
      console.log(`Caught expected MongoDB E11000 Duplicate Key Error: ${dbErr.message}`);
    } else {
      throw dbErr;
    }
  }

  // Clean up test constraint record
  await Notification.deleteMany({ "metadata.orderId": testOrderId });

  if (caughtDuplicate) {
    console.log("✅ TEST 5 PASSED: Database-level unique constraint strictly prevented duplicate record insertion!");
  } else {
    throw new Error("TEST 5 FAILED: Second record was inserted without triggering unique constraint!");
  }

  console.log("\n================================================================");
  console.log("All 5 Idempotency & Deduplication Tests PASSED Successfully! 🎉");
  console.log("================================================================");

  await closeRabbitMQ();
  process.exit(0);
}

runIdempotencyTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

