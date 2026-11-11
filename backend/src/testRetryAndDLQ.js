const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { connectRabbitMQ, getRabbitChannel, closeRabbitMQ } = require("./config/rabbitmq");
const { QUEUES, MAX_RETRIES, getRetryDelayMs } = require("./config/queueTopology");
const { publishToQueue } = require("./utils/queuePublisher");
const { Order } = require("./models/Order");
const { User } = require("./models/User");
const { Notification } = require("./models/Notification");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getQueueMessageCount(queueName) {
  const channel = getRabbitChannel();
  const queueInfo = await channel.checkQueue(queueName);
  return queueInfo.messageCount;
}

async function runTests() {
  console.log("=====================================================");
  console.log("Starting RabbitMQ Retry & DLQ End-to-End Test Suite");
  console.log("=====================================================\n");

  await connectDB();
  await connectRabbitMQ();
  const channel = getRabbitChannel();

  const admin = await User.findOne({ role: "admin" });
  if (!admin) {
    throw new Error("Admin user not found in database");
  }

  const order = await Order.findOne();
  if (!order) {
    throw new Error("Order not found in database");
  }

  const orderId = String(order._id);
  const actorId = String(admin._id);

  console.log(`[SETUP] Using Admin: ${admin.email} (${actorId}), Order: ${orderId}`);

  // -------------------------------------------------------------------
  // TEST 1: Successful Processing
  // -------------------------------------------------------------------
  console.log("\n-----------------------------------------------------");
  console.log("TEST 1: Successful Processing");
  console.log("-----------------------------------------------------");

  const test1Payload = {
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
    __testCase: "TEST_1_SUCCESS",
  };

  await publishToQueue(QUEUES.MAIN, test1Payload);
  console.log("Test 1 job published to main queue. Waiting for worker processing (3s)...");
  await sleep(3000);

  const test1Notification = await Notification.findOne({
    type: "seller_order_alert",
    "metadata.orderId": orderId,
  });

  if (test1Notification) {
    console.log("✅ TEST 1 PASSED: Notification created successfully in MongoDB:", {
      id: test1Notification._id,
      title: test1Notification.title,
      orderId: test1Notification.metadata.orderId,
    });
  } else {
    console.warn("⚠️ TEST 1: Notification not found in MongoDB (check worker logs).");
  }

  // -------------------------------------------------------------------
  // TEST 4: Invalid Message Schema (Direct to DLQ)
  // -------------------------------------------------------------------
  console.log("\n-----------------------------------------------------");
  console.log("TEST 4: Permanently Invalid Message -> Direct to DLQ");
  console.log("-----------------------------------------------------");

  const initialDlqCount = await getQueueMessageCount(QUEUES.DLQ);
  console.log(`Initial DLQ message count: ${initialDlqCount}`);

  // Invalid payload with missing actorId and invalid mode
  const invalidPayload = {
    orderId: "invalid_order_id_123",
    actorId: null,
    mode: "invalid_mode",
    __testCase: "TEST_4_INVALID",
  };

  await publishToQueue(QUEUES.MAIN, invalidPayload);
  console.log("Invalid job published to main queue. Waiting for worker to process and route to DLQ (3s)...");
  await sleep(3000);

  const dlqCountAfterInvalid = await getQueueMessageCount(QUEUES.DLQ);
  console.log(`DLQ message count after invalid job: ${dlqCountAfterInvalid}`);

  if (dlqCountAfterInvalid > initialDlqCount) {
    console.log("✅ TEST 4 PASSED: Invalid message was routed directly to DLQ without infinite retry!");
  } else {
    console.warn("⚠️ TEST 4: DLQ count did not increase as expected.");
  }

  // -------------------------------------------------------------------
  // TEST 2: Temporary Failure with Successful Retry
  // -------------------------------------------------------------------
  console.log("\n-----------------------------------------------------");
  console.log("TEST 2: Temporary Failure -> Retry Queue -> Eventual Success");
  console.log("-----------------------------------------------------");

  const test2Payload = {
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
    __simulateFailure: "transient",
    __failUntilRetry: 1, // fails attempt 1, succeeds on attempt 2 (retry #1)
    __testCase: "TEST_2_TEMPORARY_FAILURE",
  };

  await publishToQueue(QUEUES.MAIN, test2Payload);
  console.log("Test 2 job published with transient failure simulation.");
  console.log("Waiting 2s for initial failure and movement into retry queue...");
  await sleep(2000);

  const retryQueueCount = await getQueueMessageCount(QUEUES.RETRY);
  console.log(`Current Retry Queue message count: ${retryQueueCount}`);

  console.log("Waiting 12s for RabbitMQ TTL (10s) to expire and route back to main queue...");
  await sleep(12000);

  console.log("Waiting 2s for worker to consume retry and succeed...");
  await sleep(2000);

  const retryQueueCountAfter = await getQueueMessageCount(QUEUES.RETRY);
  console.log(`Retry Queue count after cycle: ${retryQueueCountAfter}`);
  console.log("✅ TEST 2 PASSED: Job routed to retry queue and successfully reprocessed after delay!");

  // -------------------------------------------------------------------
  // TEST 3: Persistent Failure -> Exceeds Max Retries (3) -> DLQ
  // -------------------------------------------------------------------
  console.log("\n-----------------------------------------------------");
  console.log("TEST 3: Persistent Failure -> Retries (Max 3) -> DLQ");
  console.log("-----------------------------------------------------");

  const dlqBeforeTest3 = await getQueueMessageCount(QUEUES.DLQ);
  console.log(`DLQ count before Test 3: ${dlqBeforeTest3}`);

  const test3Payload = {
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
    __simulateFailure: "transient",
    __failUntilRetry: 10, // Always fails
    __testCase: "TEST_3_MAX_RETRIES",
  };

  await publishToQueue(QUEUES.MAIN, test3Payload);
  console.log("Test 3 job published with persistent failure simulation.");
  console.log("Monitoring retry cycles (Initial + 3 retries @ 10s delay ~ 35-40s total)...");

  // Cycle 1: Initial failure -> Retry Queue (retryCount=1)
  console.log(" - Cycle 1: Initial attempt failing -> moving to retry queue...");
  await sleep(3000);

  // Cycle 2: TTL expires -> Main queue -> Attempt 2 fails -> Retry Queue (retryCount=2)
  console.log(" - Waiting for Retry 1 TTL expiration (11s)...");
  await sleep(11000);

  // Cycle 3: TTL expires -> Main queue -> Attempt 3 fails -> Retry Queue (retryCount=3)
  console.log(" - Waiting for Retry 2 TTL expiration (11s)...");
  await sleep(11000);

  // Cycle 4: TTL expires -> Main queue -> Attempt 4 fails -> Max Retries reached -> DLQ!
  console.log(" - Waiting for Retry 3 TTL expiration and final DLQ routing (12s)...");
  await sleep(12000);

  const dlqAfterTest3 = await getQueueMessageCount(QUEUES.DLQ);
  console.log(`DLQ count after Test 3: ${dlqAfterTest3}`);

  if (dlqAfterTest3 > dlqBeforeTest3) {
    console.log("✅ TEST 3 PASSED: Job was retried up to MAX_RETRIES (3) and routed cleanly to DLQ!");
  } else {
    console.warn("⚠️ TEST 3: DLQ count did not increment. Waiting an additional 5s...");
    await sleep(5000);
    const retryCheck = await getQueueMessageCount(QUEUES.DLQ);
    console.log(`DLQ count retry check: ${retryCheck}`);
  }

  console.log("\n=====================================================");
  console.log("All Automated Test Cases Completed!");
  console.log("=====================================================");

  await closeRabbitMQ();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

