const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { connectRabbitMQ, closeRabbitMQ } = require("./config/rabbitmq");
const { QUEUES } = require("./config/queueTopology");
const { publishToQueue } = require("./utils/queuePublisher");
const { Order } = require("./models/Order");
const { User } = require("./models/User");
const { ProcessedNotification } = require("./models/ProcessedNotification");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runNoMessageLossTest() {
  console.log("================================================================");
  console.log("TEST 9: No Message Loss Verification (Batch of 5 Messages)");
  console.log("================================================================\n");

  await connectDB();
  await connectRabbitMQ();

  const admin = await User.findOne({ role: "admin" });
  const order = await Order.findOne();
  const orderId = String(order._id);
  const actorId = String(admin._id);

  const batchSize = 5;
  const batchId = Date.now();
  const notificationIds = [];

  console.log(`Publishing ${batchSize} test messages to '${QUEUES.MAIN}'...`);
  console.log("Message #1 is configured with '__simulateCrash: true' to trigger worker crash mid-batch.");

  for (let i = 1; i <= batchSize; i++) {
    const notifId = `notif_batch_${batchId}_${i}`;
    notificationIds.push(notifId);

    const payload = {
      notificationId: notifId,
      orderId,
      actorId,
      paymentId: null,
      mode: "cod",
      batchIndex: i,
      // Message 1 triggers a simulated worker crash on its first attempt
      __simulateCrash: i === 1,
    };

    await publishToQueue(QUEUES.MAIN, payload, {
      headers: { "x-notification-id": notifId },
    });
    console.log(` - Published msg #${i}: ${notifId} ${i === 1 ? "[TRIGGER CRASH]" : ""}`);
  }

  console.log("\nAll 5 messages published. Waiting for worker crash, Docker restart, and redelivery processing...");

  const maxWait = 35000;
  const start = Date.now();
  let allCompleted = false;

  while (Date.now() - start < maxWait) {
    await sleep(2500);
    const completedRecords = await ProcessedNotification.find({
      notificationId: { $in: notificationIds },
      status: "completed",
    });

    console.log(`Progress: ${completedRecords.length}/${batchSize} messages completed (elapsed: ${Math.round((Date.now() - start) / 1000)}s)...`);

    if (completedRecords.length === batchSize) {
      allCompleted = true;
      break;
    }
  }

  const finalRecords = await ProcessedNotification.find({
    notificationId: { $in: notificationIds },
  });

  console.log("\n----------------------------------------------------------------");
  console.log("Batch Results Breakdown:");
  console.log("----------------------------------------------------------------");
  finalRecords.forEach((r) => {
    console.log(`- ${r.notificationId}: Status = ${r.status}, RetryCount = ${r.retryCount}, ProcessedAt = ${r.processedAt}`);
  });

  if (!allCompleted) {
    throw new Error(`TEST 9 FAILED: Only ${finalRecords.filter((r) => r.status === "completed").length}/${batchSize} messages completed.`);
  }

  console.log("\n================================================================");
  console.log("Message Recovery Test Summary:");
  console.log("Published:  5");
  console.log("Processed:  5");
  console.log("Lost:       0");
  console.log("Status:     100% VERIFIED SUCCESS! 🎉");
  console.log("================================================================\n");

  await closeRabbitMQ();
  await mongoose.connection.close();
  process.exit(0);
}

runNoMessageLossTest().catch(async (err) => {
  console.error("Test failed:", err.message);
  try {
    await closeRabbitMQ();
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});

