require("dotenv").config();

const { connectRabbitMQ, closeRabbitMQ } = require("./config/rabbitmq");
const { publishToQueue } = require("./utils/queuePublisher");

async function testRabbitMQ() {
  try {
    await connectRabbitMQ();

    await publishToQueue("winepub_test_queue", {
      message: "Hello from Wine Pub Management System!",
      purpose: "RabbitMQ integration test",
      timestamp: new Date().toISOString(),
    });

    console.log("RabbitMQ test message published successfully!");
  } catch (error) {
    console.error("RabbitMQ test failed:", error.message);
    process.exitCode = 1;
  } finally {
    await closeRabbitMQ();
  }
}

testRabbitMQ();

