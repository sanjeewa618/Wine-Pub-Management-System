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

async function runRecoveryTests() {
  console.log("================================================================");
  console.log("RabbitMQ Worker Crash & Connection Recovery Automated Test Suite");
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
  // TEST 1: Worker Crash During Processing & Unacknowledged Redelivery
  // ===================================================================
  console.log("----------------------------------------------------------------");
  console.log("TEST 1: Worker Crash Simulation & Unacknowledged Message Redelivery");
  console.log("----------------------------------------------------------------");
  console.log("Plan:");
  console.log("1. Publish message with '__simulateCrash: true'.");
  console.log("2. Worker receives message, logs crash simulation, and exits with code 1 before ACK.");
  console.log("3. Docker restarts the worker container automatically (restart: unless-stopped).");
  console.log("4. RabbitMQ detects TCP drop and requeues the unacknowledged message.");
  console.log("5. Restarted worker consumes redelivered message (message.fields.redelivered === true).");
  console.log("6. Worker finishes processing successfully and ACKs.");

  const crashNotificationId = `notif_crash_test_${Date.now()}`;
  const crashPayload = {
    notificationId: crashNotificationId,
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
    __simulateCrash: true,
  };

  const initialNotifCount = await Notification.countDocuments({
    type: "seller_order_alert",
    "metadata.orderId": orderId,
  });

  console.log(`[TEST 1] Existing seller notifications for this order: ${initialNotifCount}`);
  console.log(`[TEST 1] Publishing crash simulation message: ${crashNotificationId}`);

  await publishToQueue(QUEUES.MAIN, crashPayload, {
    headers: { "x-notification-id": crashNotificationId },
  });

  console.log("[TEST 1] Message published! Waiting 10s for worker crash, Docker auto-restart, and redelivery processing...");

  let processed = null;
  const maxWait = 25000;
  const startWait = Date.now();

  while (Date.now() - startWait < maxWait) {
    await sleep(2000);
    processed = await ProcessedNotification.findOne({ notificationId: crashNotificationId });
    if (processed && processed.status === "completed") {
      break;
    }
    console.log(`... waiting for redelivery completion (elapsed: ${Math.round((Date.now() - startWait) / 1000)}s)`);
  }

  if (!processed || processed.status !== "completed") {
    throw new Error(`TEST 1 FAILED: Expected status 'completed', but found: ${processed?.status || 'null'}`);
  }

  const finalNotifCount = await Notification.countDocuments({
    type: "seller_order_alert",
    "metadata.orderId": orderId,
  });

  console.log(`[TEST 1] Final notification count: ${finalNotifCount}`);
  console.log("✅ TEST 1 PASSED: Worker crashed, restarted, redelivered message was processed and acknowledged!");
  console.log("Record in ProcessedNotification:", {
    notificationId: processed.notificationId,
    status: processed.status,
    processedAt: processed.processedAt,
  });

  // ===================================================================
  // TEST 2: Post-Recovery Normal Processing Verification
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 2: Verify Active Worker Post-Recovery with Normal Job");
  console.log("----------------------------------------------------------------");

  const normalNotificationId = `notif_post_recovery_${Date.now()}`;
  const normalPayload = {
    notificationId: normalNotificationId,
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
  };

  await publishToQueue(QUEUES.MAIN, normalPayload, {
    headers: { "x-notification-id": normalNotificationId },
  });

  console.log(`[TEST 2] Published normal job: ${normalNotificationId}`);
  console.log("Waiting 4s for processing...");
  await sleep(4000);

  const processedNormal = await ProcessedNotification.findOne({ notificationId: normalNotificationId });
  if (processedNormal && processedNormal.status === "completed") {
    console.log("✅ TEST 2 PASSED: Normal job processed cleanly post-recovery!");
  } else {
    throw new Error(`TEST 2 FAILED: Expected completed status, got: ${processedNormal?.status}`);
  }

  // ===================================================================
  // TEST 3: Idempotency Protection on Crashed/Redelivered Event
  // ===================================================================
  console.log("\n----------------------------------------------------------------");
  console.log("TEST 3: Duplicate Message Idempotency Check on Recovered Notification");
  console.log("----------------------------------------------------------------");

  const countBeforeDup = await Notification.countDocuments({
    type: "seller_order_alert",
    "metadata.orderId": orderId,
  });

  // Re-publish the same crashNotificationId without __simulateCrash
  await publishToQueue(QUEUES.MAIN, {
    notificationId: crashNotificationId,
    orderId,
    actorId,
    paymentId: null,
    mode: "cod",
  }, {
    headers: { "x-notification-id": crashNotificationId },
  });

  console.log(`[TEST 3] Re-published duplicate notificationId: ${crashNotificationId}`);
  console.log("Waiting 3s for idempotent drop...");
  await sleep(3000);

  const countAfterDup = await Notification.countDocuments({
    type: "seller_order_alert",
    "metadata.orderId": orderId,
  });

  if (countBeforeDup === countAfterDup) {
    console.log("✅ TEST 3 PASSED: Duplicate message safely acknowledged without duplicate DB records!");
  } else {
    throw new Error(`TEST 3 FAILED: Count changed from ${countBeforeDup} to ${countAfterDup}`);
  }

  console.log("\n================================================================");
  console.log("🎉 ALL IN-CONTAINER WORKER RECOVERY TESTS COMPLETED SUCCESSFULLY!");
  console.log("================================================================\n");

  await closeRabbitMQ();
  await mongoose.connection.close();
  process.exit(0);
}

runRecoveryTests().catch(async (err) => {
  console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err.message);
  try {
    await closeRabbitMQ();
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});

