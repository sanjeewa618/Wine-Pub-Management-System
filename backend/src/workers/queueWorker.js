const {
  connectRabbitMQ,
  getRabbitChannel,
} = require("../config/rabbitmq");

const QUEUE_NAME = "winepub_test_queue";

async function startWorker() {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();

    const channel = getRabbitChannel();

    // Make sure the queue exists
    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
    });

    // Process one message at a time
    await channel.prefetch(1);

    console.log(`Worker is waiting for messages in: ${QUEUE_NAME}`);

    // Start consuming messages
    await channel.consume(QUEUE_NAME, async (message) => {
      if (message === null) {
        return;
      }

      try {
        const messageData = JSON.parse(
          message.content.toString()
        );

        console.log("\nNew message received!");
        console.log("Message data:", messageData);

        // Acknowledge successful processing
        channel.ack(message);

        console.log("Message processed successfully!");
      } catch (error) {
        console.error("Message processing failed:", error.message);

        // Reject the message without requeuing
        channel.nack(message, false, false);
      }
    });
  } catch (error) {
    console.error("Worker failed to start:", error.message);
    process.exit(1);
  }
}

startWorker();

