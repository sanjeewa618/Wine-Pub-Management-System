const QUEUES = {
  MAIN: "seller_order_notifications",
  RETRY: "seller_order_notifications_retry",
  DLQ: "seller_order_notifications_dlq",
  TEST: "winepub_test_queue",
};

const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 10000;

function getRetryDelayMs() {
  const parsed = parseInt(process.env.RABBITMQ_RETRY_DELAY_MS, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETRY_DELAY_MS;
}

async function setupQueueTopology(channel) {
  const retryDelayMs = getRetryDelayMs();

  // 1. Existing Test Queue
  await channel.assertQueue(QUEUES.TEST, {
    durable: true,
  });

  // 2. Main Seller Order Notifications Queue
  await channel.assertQueue(QUEUES.MAIN, {
    durable: true,
  });

  // 3. Retry Queue with TTL and Dead Letter Exchange pointing back to Main Queue
  await channel.assertQueue(QUEUES.RETRY, {
    durable: true,
    arguments: {
      "x-message-ttl": retryDelayMs,
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": QUEUES.MAIN,
    },
  });

  // 4. Dead Letter Queue for permanently failed messages
  await channel.assertQueue(QUEUES.DLQ, {
    durable: true,
  });

  console.log("RabbitMQ topology initialized successfully:", {
    mainQueue: QUEUES.MAIN,
    retryQueue: QUEUES.RETRY,
    dlq: QUEUES.DLQ,
    retryDelayMs,
    maxRetries: MAX_RETRIES,
  });
}

module.exports = {
  QUEUES,
  MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  getRetryDelayMs,
  setupQueueTopology,
};

