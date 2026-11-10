const {
  connectRabbitMQ,
  getRabbitChannel,
} = require("../config/rabbitmq");

const { connectDB } = require("../config/db");
const { Order } = require("../models/Order");
const { Payment } = require("../models/Payment");
const { User } = require("../models/User");

const {
  notifySellersForOrder,
} = require("../utils/sellerOrderAlerts");

const TEST_QUEUE = "winepub_test_queue";
const SELLER_ORDER_QUEUE = "seller_order_notifications";

async function processTestMessage(channel, message) {
  try {
    const messageData = JSON.parse(message.content.toString());

    console.log("\nTest message received!");
    console.log("Message data:", messageData);

    channel.ack(message);
    console.log("Test message processed successfully!");
  } catch (error) {
    console.error("Test message processing failed:", error.message);
    channel.nack(message, false, false);
  }
}

async function processSellerOrderMessage(channel, message) {
  try {
    const job = JSON.parse(message.content.toString());

    console.log("\nSeller order notification job received!");
    console.log("Job data:", job);

    if (!job.orderId || !job.actorId || !["paid", "cod"].includes(job.mode)) {
      throw new Error("Invalid seller notification job data");
    }

    const order = await Order.findById(job.orderId);

    if (!order) {
      throw new Error(`Order not found: ${job.orderId}`);
    }

    const actor = await User.findById(job.actorId).select("name email");

    if (!actor) {
      throw new Error(`Admin not found: ${job.actorId}`);
    }

    let payment = null;

    if (job.paymentId) {
      payment = await Payment.findById(job.paymentId);

      if (!payment) {
        throw new Error(`Payment not found: ${job.paymentId}`);
      }
    }

    await notifySellersForOrder({
      order,
      actor,
      payment,
      mode: job.mode,
    });

    // Acknowledge only after notification processing completes.
    channel.ack(message);

    console.log(
      `Seller notification processed successfully for order: ${job.orderId}`
    );
  } catch (error) {
    console.error(
      "Seller notification processing failed:",
      error.message
    );

    // Reject the failed message without requeuing.
    channel.nack(message, false, false);
  }
}

async function startWorker() {
  try {
    // Connect to MongoDB first.
    await connectDB();

    // Connect to RabbitMQ.
    await connectRabbitMQ();

    const channel = getRabbitChannel();

    // Ensure both durable queues exist.
    await channel.assertQueue(TEST_QUEUE, {
      durable: true,
    });

    await channel.assertQueue(SELLER_ORDER_QUEUE, {
      durable: true,
    });

    // Process one message at a time.
    await channel.prefetch(1);

    console.log(`Worker is waiting for messages in: ${TEST_QUEUE}`);
    console.log(`Worker is waiting for messages in: ${SELLER_ORDER_QUEUE}`);

    // Existing RabbitMQ test consumer.
    await channel.consume(TEST_QUEUE, async (message) => {
      if (message) {
        await processTestMessage(channel, message);
      }
    });

    // Seller order notification consumer.
    await channel.consume(SELLER_ORDER_QUEUE, async (message) => {
      if (message) {
        await processSellerOrderMessage(channel, message);
      }
    });
  } catch (error) {
    console.error("Worker failed to start:", error.message);
    process.exit(1);
  }
}

startWorker();
