const { getRabbitChannel, isRabbitConnected } = require("../config/rabbitmq");

async function obtainChannelWithRetry(maxWaitMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      return getRabbitChannel();
    } catch (err) {
      // Wait 400ms for connection recovery loop
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  // Final attempt or throw
  return getRabbitChannel();
}

async function publishToQueue(queueName, payload, options = {}) {
  if (!queueName) {
    throw new Error("Queue name is required");
  }

  const channel = await obtainChannelWithRetry();

  // If the message is already structured (e.g., retry or DLQ routing), preserve structure;
  // otherwise wrap payload with timestamp.
  const message =
    payload && typeof payload === "object" && payload.queuedAt && payload.payload !== undefined
      ? payload
      : {
          payload,
          queuedAt: new Date().toISOString(),
          metadata: options.metadata || {},
        };

  const messageBuffer = Buffer.from(JSON.stringify(message));

  const publishOptions = {
    persistent: true,
    contentType: "application/json",
    headers: options.headers || {},
    ...(options.publishOptions || {}),
  };

  const published = channel.sendToQueue(queueName, messageBuffer, publishOptions);

  if (!published) {
    console.warn(`[PUBLISHER WARN] RabbitMQ write buffer full while publishing to ${queueName}`);
  }

  // When ConfirmChannel is available, wait for publisher confirmation from broker
  if (typeof channel.waitForConfirms === "function") {
    await channel.waitForConfirms();
  }

  console.log(`[PUBLISHER SUCCESS] Message published and confirmed to queue: ${queueName}`);

  return published;
}

module.exports = {
  publishToQueue,
};
