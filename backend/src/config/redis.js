const { createClient } = require("redis");

let redisClient = null;
let isRedisConnected = false;

async function connectRedis() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  redisClient.on("connect", () => {
    console.log("Connecting to Redis...");
  });

  redisClient.on("reconnecting", () => {
    isRedisConnected = false;
    console.log("Reconnecting to Redis...");
  });

  redisClient.on("ready", () => {
    isRedisConnected = true;
    console.log("Redis connected successfully");
  });

  redisClient.on("end", () => {
    isRedisConnected = false;
    console.log("Redis connection closed");
  });

  try {
    await redisClient.connect();
  } catch (error) {
    isRedisConnected = false;
    console.error("Redis connection failed:", error.message);
  }

  return redisClient;
}

function getRedisClient() {
  return redisClient;
}

function isRedisReady() {
  return Boolean(redisClient && redisClient.isReady && isRedisConnected);
}

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisReady,
};
