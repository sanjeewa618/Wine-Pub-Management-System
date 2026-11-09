const { getRabbitChannel } = require("../config/rabbitmq");

async function publishToQueue(queueName, payload) {
  if (!queueName) {
    throw new Error("Queue name is required");
  }

  const channel = getRabbitChannel();

  // Create the queue if it does not already exist.
  await channel.assertQueue(queueName, {
    durable: true,
  });

  const message = {
    payload,
    queuedAt: new Date().toISOString(),
  };

  const messageBuffer = Buffer.from(JSON.stringify(message));

  // Publish a persistent message.
  const published = channel.sendToQueue(
    queueName,
    messageBuffer,
    {
      persistent: true,
      contentType: "application/json",
    }
  );

  if (!published) {
    console.warn("RabbitMQ write buffer is full.");
  }

  console.log(`Message published to queue: ${queueName}`);

  return published;
}

module.exports = {
  publishToQueue,
};

