const { getRabbitChannel } = require("../config/rabbitmq");

async function publishToQueue(queueName, payload, options = {}) {
  if (!queueName) {
    throw new Error("Queue name is required");
  }

  const channel = getRabbitChannel();

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
    console.warn(`RabbitMQ write buffer full while publishing to ${queueName}`);
  }

  // When ConfirmChannel is available, wait for publisher confirmation from broker
  if (typeof channel.waitForConfirms === "function") {
    await channel.waitForConfirms();
  }

  console.log(`Message published to queue: ${queueName}`);

  return published;
}

module.exports = {
  publishToQueue,
};
