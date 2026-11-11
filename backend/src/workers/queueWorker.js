const mongoose = require("mongoose");
const {
  connectRabbitMQ,
  getRabbitChannel,
  closeRabbitMQ,
  onRabbitReconnect,
} = require("../config/rabbitmq");
const {
  QUEUES,
  MAX_RETRIES,
  getRetryDelayMs,
} = require("../config/queueTopology");
const { publishToQueue } = require("../utils/queuePublisher");
const { connectDB } = require("../config/db");
const { Order } = require("../models/Order");
const { Payment } = require("../models/Payment");
const { User } = require("../models/User");
const { ProcessedNotification } = require("../models/ProcessedNotification");
const {
  notifySellersForOrder,
} = require("../utils/sellerOrderAlerts");

// Consumer tags for dynamic cancellation on shutdown/reconnection
let testConsumerTag = null;
let mainConsumerTag = null;

// Lifecycle tracking
let isShuttingDown = false;
let inFlightCount = 0;
let currentInFlightMessage = null;

async function processTestMessage(channel, message) {
  try {
    const messageData = JSON.parse(message.content.toString());

    console.log("\n[TEST QUEUE] Message received!");
    console.log("Message data:", messageData);

    channel.ack(message);
    console.log("[TEST QUEUE] Message processed successfully!");
  } catch (error) {
    console.error("[TEST QUEUE] Message processing failed:", error.message);
    channel.nack(message, false, false);
  }
}

/**
 * Route a permanently failed message or max-retried message to DLQ
 */
async function routeToDLQ(channel, message, { job, retryCount, error, errorType }) {
  try {
    const originalContent = message.content.toString();
    let originalData = null;
    try {
      originalData = JSON.parse(originalContent);
    } catch {
      originalData = { raw: originalContent };
    }

    const notificationId = job?.notificationId || originalData?.payload?.notificationId || null;

    const dlqPayload = {
      payload: job || originalData?.payload || originalData,
      queuedAt: originalData?.queuedAt || new Date().toISOString(),
      dlqMetadata: {
        notificationId,
        orderId: job?.orderId || null,
        actorId: job?.actorId || null,
        mode: job?.mode || null,
        retryCount: retryCount || 0,
        maxRetries: MAX_RETRIES,
        failureReason: error.message,
        errorType,
        failedAt: new Date().toISOString(),
      },
    };

    await publishToQueue(QUEUES.DLQ, dlqPayload, {
      headers: {
        "x-original-queue": QUEUES.MAIN,
        "x-notification-id": notificationId || "",
        "x-retry-count": retryCount || 0,
        "x-failure-reason": error.message,
        "x-error-type": errorType,
      },
    });

    if (notificationId) {
      await ProcessedNotification.updateOne(
        { notificationId },
        {
          $set: {
            status: "failed",
            errorReason: error.message,
            retryCount: retryCount || 0,
          },
        },
        { upsert: true }
      ).catch(() => {});
    }

    // Acknowledge from main queue so it's not redelivered there
    channel.ack(message);

    console.warn(`[DLQ ROUTED] Order ${job?.orderId || "unknown"} (notificationId: ${notificationId || "N/A"}) routed to DLQ (${QUEUES.DLQ}). Reason: ${error.message} [Type: ${errorType}]`);
  } catch (dlqErr) {
    console.error("[DLQ CRITICAL] Failed to route message to DLQ:", dlqErr.message);
    // As safety fallback, reject without requeue to avoid infinite loop
    channel.nack(message, false, false);
  }
}

/**
 * Route a transiently failed message to the Retry Queue with TTL & DLX
 */
async function routeToRetry(channel, message, { job, messageData, currentRetryCount, error }) {
  const nextRetryCount = currentRetryCount + 1;
  const retryDelayMs = getRetryDelayMs();
  const notificationId = job?.notificationId || messageData?.payload?.notificationId || null;

  try {
    const retryPayload = {
      payload: job,
      queuedAt: messageData.queuedAt || new Date().toISOString(),
      metadata: {
        ...(messageData.metadata || {}),
        notificationId,
        retryCount: nextRetryCount,
        lastError: error.message,
        retriedAt: new Date().toISOString(),
        retryDelayMs,
      },
    };

    await publishToQueue(QUEUES.RETRY, retryPayload, {
      headers: {
        "x-original-queue": QUEUES.MAIN,
        "x-notification-id": notificationId || "",
        "x-retry-count": nextRetryCount,
        "x-last-error": error.message,
      },
    });

    // Acknowledge from main queue since it is safely waiting in retry queue
    channel.ack(message);

    console.log(`[RETRY SCHEDULED] Order ${job.orderId} moved to retry queue (attempt ${nextRetryCount}/${MAX_RETRIES}, delay ${retryDelayMs / 1000}s). Reason: ${error.message}`);
  } catch (retryErr) {
    console.error("[RETRY CRITICAL] Failed to publish to retry queue:", retryErr.message);
    // If we failed to publish to retry queue, route to DLQ
    await routeToDLQ(channel, message, {
      job,
      retryCount: currentRetryCount,
      error: new Error(`Retry enqueue failed: ${retryErr.message} (Original error: ${error.message})`),
      errorType: "RETRY_DISPATCH_FAILURE",
    });
  }
}

async function processSellerOrderMessage(channel, message) {
  inFlightCount++;
  currentInFlightMessage = message;

  let messageData = null;
  let job = null;
  let retryCount = 0;
  let claimedInFlight = false;
  let notificationId = null;

  try {
    // 1. Safe JSON parsing
    try {
      messageData = JSON.parse(message.content.toString());
      job = messageData.payload || messageData;
      retryCount = Number(
        messageData?.metadata?.retryCount ??
        message.properties?.headers?.["x-retry-count"] ??
        0
      );
    } catch (parseError) {
      console.error("[WORKER ERROR] Malformed JSON received:", parseError.message);
      return routeToDLQ(channel, message, {
        job: null,
        retryCount: 0,
        error: new Error(`Malformed JSON: ${parseError.message}`),
        errorType: "MALFORMED_JSON",
      });
    }

    // 2. Validate payload schema (Permanent Error if invalid)
    if (!job || typeof job !== "object") {
      return routeToDLQ(channel, message, {
        job,
        retryCount,
        error: new Error("Job payload must be an object"),
        errorType: "INVALID_PAYLOAD_TYPE",
      });
    }

    if (!job.orderId || !job.actorId || !["paid", "cod"].includes(job.mode)) {
      return routeToDLQ(channel, message, {
        job,
        retryCount,
        error: new Error(`Invalid job schema: orderId=${job.orderId}, actorId=${job.actorId}, mode=${job.mode}`),
        errorType: "INVALID_JOB_SCHEMA",
      });
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(job.orderId) || !mongoose.Types.ObjectId.isValid(job.actorId)) {
      return routeToDLQ(channel, message, {
        job,
        retryCount,
        error: new Error(`Invalid ObjectId format: orderId=${job.orderId}, actorId=${job.actorId}`),
        errorType: "INVALID_OBJECT_ID",
      });
    }

    // Determine effective notificationId
    notificationId =
      job.notificationId ||
      message.properties?.headers?.["x-notification-id"] ||
      `notif_order_${job.orderId}_${job.mode}`;

    job.notificationId = notificationId;

    // Check if worker crash simulation is requested (only on first attempt, so redelivery can succeed)
    if (job.__simulateCrash && !message.fields?.redelivered) {
      console.warn(`\n💥 [WORKER CRASH SIMULATION] Sudden crash simulated for order ${job.orderId}! Process exiting with code 1 without acknowledging message.`);
      // Exit without acknowledging - RabbitMQ will detect TCP drop and requeue the message.
      process.exit(1);
    }

    // 3. Idempotency Gate (Atomic in-flight registration & duplicate check)
    try {
      await ProcessedNotification.create({
        notificationId,
        orderId: job.orderId,
        mode: job.mode,
        status: "processing",
        retryCount,
      });
      claimedInFlight = true;
    } catch (idempotencyErr) {
      if (idempotencyErr.code === 11000) {
        // Record already exists for this notificationId!
        const existing = await ProcessedNotification.findOne({ notificationId });
        if (existing && existing.status === "completed") {
          console.log(
            `[IDEMPOTENT ACK] Duplicate message detected for notificationId: ${notificationId} (orderId: ${job.orderId}). Already completed at ${existing.processedAt}. Safely acknowledging without repeating business operations.`
          );
          channel.ack(message);
          return;
        }
        if (existing && existing.status === "processing") {
          console.warn(
            `[CONCURRENT DUPLICATE] Notification ${notificationId} is currently being processed by another worker. Safely acknowledging/dropping redundant message.`
          );
          channel.ack(message);
          return;
        }
      }
      // Any transient database connection error will be caught below
      throw idempotencyErr;
    }

    // 4. Process the notification job
    try {
      const isRetry = retryCount > 0;
      const isRedelivered = Boolean(message.fields?.redelivered);
      console.log(`\n[SELLER NOTIFICATION] Processing order ${job.orderId} (Attempt ${retryCount + 1}/${MAX_RETRIES + 1}${isRetry ? ` - RETRY #${retryCount}` : " - INITIAL"}${isRedelivered ? " [REDELIVERED POST-CRASH]" : ""}, notificationId: ${notificationId})`);

      // Check for simulated failure injection for testing purposes
      if (job.__simulateFailure) {
        if (job.__simulateFailure === "transient" && retryCount < (job.__failUntilRetry || 1)) {
          throw new Error(`Simulated transient error for testing (attempt ${retryCount + 1})`);
        } else if (job.__simulateFailure === "permanent") {
          throw new Error("Simulated permanent unrecoverable failure");
        }
      }

      const order = await Order.findById(job.orderId);
      if (!order) {
        throw new Error(`Order not found in database: ${job.orderId}`);
      }

      const actor = await User.findById(job.actorId).select("name email");
      if (!actor) {
        throw new Error(`Admin actor not found in database: ${job.actorId}`);
      }

      let payment = null;
      if (job.paymentId) {
        if (!mongoose.Types.ObjectId.isValid(job.paymentId)) {
          throw new Error(`Invalid paymentId format: ${job.paymentId}`);
        }
        payment = await Payment.findById(job.paymentId);
        if (!payment) {
          throw new Error(`Payment not found in database: ${job.paymentId}`);
        }
      }

      // Execute seller alert (creates in-app notifications and sends email)
      await notifySellersForOrder({
        order,
        actor,
        payment,
        mode: job.mode,
        notificationId,
      });

      // Mark as completed in the idempotency registry
      await ProcessedNotification.updateOne(
        { notificationId },
        {
          $set: {
            status: "completed",
            retryCount,
            processedAt: new Date(),
            errorReason: null,
          },
        }
      );

      // Acknowledge upon full success
      channel.ack(message);

      console.log(`[SELLER NOTIFICATION SUCCESS] Order ${job.orderId} (notificationId: ${notificationId}) processed successfully!`);
    } catch (error) {
      console.error(`[SELLER NOTIFICATION FAILED] Order ${job.orderId} (notificationId: ${notificationId}) failed:`, error.message);

      // Release in-flight claim so retry attempts can proceed
      if (claimedInFlight) {
        try {
          await ProcessedNotification.deleteOne({ notificationId, status: "processing" });
        } catch (cleanupErr) {
          console.warn(`[IDEMPOTENCY CLEANUP] Failed to clear in-flight status for ${notificationId}:`, cleanupErr.message);
        }
      }

      // Check if we should retry or route to DLQ
      if (retryCount < MAX_RETRIES) {
        await routeToRetry(channel, message, {
          job,
          messageData,
          currentRetryCount: retryCount,
          error,
        });
      } else {
        console.warn(`[MAX RETRIES EXCEEDED] Order ${job.orderId} reached max retries (${MAX_RETRIES}). Routing to DLQ.`);
        await routeToDLQ(channel, message, {
          job,
          retryCount,
          error,
          errorType: "MAX_RETRIES_EXCEEDED",
        });
      }
    }
  } finally {
    inFlightCount--;
    if (currentInFlightMessage === message) {
      currentInFlightMessage = null;
    }
  }
}

/**
 * Attach consumers with prefetch(1) and retain consumer tags
 */
async function setupConsumers(channel) {
  if (isShuttingDown) {
    return;
  }

  // Fair dispatch: process 1 message at a time per worker instance
  await channel.prefetch(1);

  // Existing RabbitMQ test consumer
  const testConsumer = await channel.consume(QUEUES.TEST, async (message) => {
    if (message) {
      await processTestMessage(channel, message);
    }
  });
  testConsumerTag = testConsumer.consumerTag;

  // Main Seller order notification consumer
  const mainConsumer = await channel.consume(QUEUES.MAIN, async (message) => {
    if (message) {
      await processSellerOrderMessage(channel, message);
    }
  });
  mainConsumerTag = mainConsumer.consumerTag;

  console.log(`[WORKER READY] Consumers actively registered with prefetch(1):`);
  console.log(` - Test Queue Consumer Tag: ${testConsumerTag}`);
  console.log(` - Main Queue Consumer Tag: ${mainConsumerTag}`);
}

/**
 * Graceful shutdown handler for SIGTERM and SIGINT
 */
async function handleGracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`\n[WORKER LIFECYCLE] Received ${signal}. Starting graceful worker shutdown...`);

  // 1. Cancel consumers so RabbitMQ stops sending new messages to this worker
  try {
    const channel = getRabbitChannel();
    if (channel) {
      if (testConsumerTag) await channel.cancel(testConsumerTag).catch(() => {});
      if (mainConsumerTag) await channel.cancel(mainConsumerTag).catch(() => {});
      console.log("[WORKER LIFECYCLE] Consumers cancelled. No further messages will be dispatched.");
    }
  } catch (err) {
    console.warn("[WORKER LIFECYCLE] Warning while cancelling consumers:", err.message);
  }

  // 2. Wait up to 6 seconds for in-flight message processing to complete
  const startWait = Date.now();
  const maxWaitMs = 6000;
  while (inFlightCount > 0 && Date.now() - startWait < maxWaitMs) {
    console.log(`[WORKER LIFECYCLE] Waiting for ${inFlightCount} in-flight message to finish...`);
    await new Promise((r) => setTimeout(r, 400));
  }

  // 3. If still in-flight after timeout, requeue message safely
  if (inFlightCount > 0 && currentInFlightMessage) {
    try {
      const channel = getRabbitChannel();
      if (channel) {
        channel.nack(currentInFlightMessage, false, true);
        console.warn("[WORKER LIFECYCLE] In-flight message was requeued (requeue=true) for other consumers.");
      }
    } catch (nackErr) {
      console.error("[WORKER LIFECYCLE] Failed to nack in-flight message during shutdown:", nackErr.message);
    }
  }

  // 4. Close RabbitMQ connection safely
  await closeRabbitMQ();

  // 5. Close MongoDB connection cleanly
  await mongoose.connection.close().catch(() => {});
  console.log("[WORKER LIFECYCLE] MongoDB connection closed.");

  console.log("[WORKER LIFECYCLE] Graceful shutdown finished cleanly. Exiting process.");
  process.exit(0);
}

// Register process signal handlers
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

// Register automatic consumer recreation whenever RabbitMQ reconnects
onRabbitReconnect(async (newChannel) => {
  console.log("[WORKER RECOVERY] Reconnected to RabbitMQ. Re-establishing consumers...");
  try {
    await setupConsumers(newChannel);
    console.log("[WORKER RECOVERY] Consumers successfully recreated after connection recovery!");
  } catch (err) {
    console.error("[WORKER RECOVERY CRITICAL] Failed to re-establish consumers after reconnect:", err.message);
  }
});

async function startWorker() {
  try {
    console.log("[WORKER STARTUP] Initializing Wine-Pub background worker...");

    // Connect to MongoDB first
    await connectDB();

    // Connect to RabbitMQ (this also asserts topology and sets confirm channel)
    const channel = await connectRabbitMQ();

    // Attach consumers
    await setupConsumers(channel);

    console.log("[WORKER STARTUP] Background worker is fully operational and waiting for messages.");
  } catch (error) {
    console.error("[WORKER CRITICAL] Worker startup failed:", error.message);
    process.exit(1);
  }
}

startWorker();
