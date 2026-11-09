const { connectDB } = require("./config/db");
const { connectRedis } = require("./config/redis");
const { connectRabbitMQ } = require("./config/rabbitmq");
const { app } = require("./app");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  // Connect to Redis
  await connectRedis();

  // Connect to RabbitMQ
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
