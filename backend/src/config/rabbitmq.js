const amqp = require("amqplib");
const EventEmitter = require("events");
const { setupQueueTopology } = require("./queueTopology");

const rabbitEmitter = new EventEmitter();
// Increase listener limit in case multiple consumers/components listen for reconnect
rabbitEmitter.setMaxListeners(20);

let connection = null;
let channel = null;
let isConnecting = false;
let isExplicitClose = false;
let hasEverConnected = false;
let reconnectTimer = null;

function getRabbitMQUrl() {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error("RABBITMQ_URL is not configured in environment");
  }
  return url;
}

/**
 * Schedule an automatic reconnection attempt with backoff
 */
function scheduleReconnect(delayMs = 2000) {
  if (isExplicitClose) {
    return;
  }
  if (reconnectTimer) {
    return;
  }

  console.warn(`[RABBITMQ RECOVERY] Broker connection unavailable. Next reconnection attempt in ${delayMs / 1000}s...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      console.log("[RABBITMQ RECOVERY] Attempting reconnection to RabbitMQ...");
      await connectRabbitMQ();
      console.log("[RABBITMQ RECOVERY] Successfully reconnected to RabbitMQ!");
    } catch (err) {
      console.error(`[RABBITMQ RECOVERY] Reconnect failed: ${err.message}`);
      const nextDelay = Math.min(Math.round(delayMs * 1.5), 10000);
      scheduleReconnect(nextDelay);
    }
  }, delayMs);
}

/**
 * Connect to RabbitMQ with automatic recovery, topology assertion, and ConfirmChannel
 */
async function connectRabbitMQ() {
  if (isExplicitClose) {
    isExplicitClose = false;
  }

  if (connection && channel) {
    return channel;
  }

  if (isConnecting) {
    return new Promise((resolve, reject) => {
      rabbitEmitter.once("connected", resolve);
      rabbitEmitter.once("reconnected", resolve);
      rabbitEmitter.once("connect_error", reject);
    });
  }

  isConnecting = true;
  const rabbitMQUrl = getRabbitMQUrl();

  try {
    console.log("[RABBITMQ] Connecting to broker...");
    connection = await amqp.connect(rabbitMQUrl);

    // Channel creation with publisher confirms
    channel = await connection.createConfirmChannel();

    // Attach connection lifecycle event handlers
    connection.on("error", (error) => {
      console.error("[RABBITMQ ERROR] Connection level error:", error.message);
      rabbitEmitter.emit("error", error);
    });

    connection.on("close", () => {
      console.warn("[RABBITMQ WARN] Connection closed.");
      connection = null;
      channel = null;
      rabbitEmitter.emit("disconnected");
      if (!isExplicitClose) {
        scheduleReconnect(2000);
      }
    });

    // Attach channel lifecycle event handlers
    channel.on("error", (error) => {
      console.error("[RABBITMQ ERROR] Channel level error:", error.message);
    });

    channel.on("close", async () => {
      console.warn("[RABBITMQ WARN] Channel closed.");
      channel = null;

      // If connection is still alive, recreate channel immediately
      if (connection && !isExplicitClose) {
        try {
          console.log("[RABBITMQ RECOVERY] Connection alive, recreating ConfirmChannel...");
          channel = await connection.createConfirmChannel();
          await setupQueueTopology(channel);
          await channel.prefetch(1);
          console.log("[RABBITMQ RECOVERY] Channel and topology recreated successfully.");
          rabbitEmitter.emit("reconnected", channel);
        } catch (chErr) {
          console.error("[RABBITMQ RECOVERY] Failed to recreate channel:", chErr.message);
          scheduleReconnect(2000);
        }
      }
    });

    // Assert complete queue and exchange topology
    await setupQueueTopology(channel);

    // Default prefetch for fair dispatch
    await channel.prefetch(1);

    isConnecting = false;

    if (hasEverConnected) {
      console.log("[RABBITMQ] Reconnection flow complete with ConfirmChannel!");
      rabbitEmitter.emit("reconnected", channel);
    } else {
      hasEverConnected = true;
      console.log("[RABBITMQ] Initial connection established with ConfirmChannel!");
      rabbitEmitter.emit("connected", channel);
    }

    return channel;
  } catch (error) {
    isConnecting = false;
    connection = null;
    channel = null;
    rabbitEmitter.emit("connect_error", error);

    console.error("[RABBITMQ ERROR] Initial connection failed:", error.message);
    if (!isExplicitClose) {
      scheduleReconnect(2000);
    }
    throw error;
  }
}

function getRabbitChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized or currently reconnecting");
  }
  return channel;
}

function getRabbitConnection() {
  return connection;
}

function isRabbitConnected() {
  return Boolean(connection && channel);
}

/**
 * Register a listener to execute when RabbitMQ reconnects (e.g. recreating consumers)
 */
function onRabbitReconnect(callback) {
  rabbitEmitter.on("reconnected", callback);
}

/**
 * Cleanly and explicitly close RabbitMQ connection and channel
 */
async function closeRabbitMQ() {
  isExplicitClose = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (channel) {
      await channel.close().catch(() => {});
      channel = null;
    }

    if (connection) {
      await connection.close().catch(() => {});
      connection = null;
    }

    rabbitEmitter.emit("closed");
    console.log("[RABBITMQ] Connection and channel closed successfully.");
  } catch (error) {
    console.error("[RABBITMQ ERROR] Error while closing connection:", error.message);
  }
}

module.exports = {
  connectRabbitMQ,
  getRabbitChannel,
  getRabbitConnection,
  isRabbitConnected,
  onRabbitReconnect,
  closeRabbitMQ,
  rabbitEmitter,
};
