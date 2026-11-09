const amqp = require("amqplib");

let connection = null;
let channel = null;

async function connectRabbitMQ() {
  try {
    if (connection && channel) {
      return channel;
    }

    const rabbitMQUrl = process.env.RABBITMQ_URL;

    if (!rabbitMQUrl) {
      throw new Error("RABBITMQ_URL is not configured");
    }

    connection = await amqp.connect(rabbitMQUrl);

    channel = await connection.createChannel();

    connection.on("error", (error) => {
      console.error("RabbitMQ connection error:", error.message);
    });

    connection.on("close", () => {
      console.log("RabbitMQ connection closed.");
      connection = null;
      channel = null;
    });

    console.log("RabbitMQ connected successfully!");

    return channel;
  } catch (error) {
    connection = null;
    channel = null;

    console.error("RabbitMQ connection failed:", error.message);
    throw error;
  }
}

function getRabbitChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  return channel;
}

async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }

    if (connection) {
      await connection.close();
      connection = null;
    }

    console.log("RabbitMQ connection closed successfully.");
  } catch (error) {
    console.error("Error closing RabbitMQ:", error.message);
  }
}

module.exports = {
  connectRabbitMQ,
  getRabbitChannel,
  closeRabbitMQ,
};

