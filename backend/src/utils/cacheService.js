const { getRedisClient, isRedisReady } = require("../config/redis");

async function getCache(key) {
  if (!isRedisReady()) return null;

  try {
    const client = getRedisClient();
    const data = await client.get(key);

    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Redis cache read error:", error.message);
    return null;
  }
}

async function setCache(key, value, expiration = 300) {
  if (!isRedisReady()) return;

  try {
    const client = getRedisClient();

    await client.set(key, JSON.stringify(value), {
      EX: expiration,
    });
  } catch (error) {
    console.error("Redis cache write error:", error.message);
  }
}

async function deleteCache(key) {
  if (!isRedisReady()) return;

  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error("Redis cache delete error:", error.message);
  }
}

async function deleteCacheByPattern(pattern) {
  if (!isRedisReady()) return;

  try {
    const client = getRedisClient();

    for await (const key of client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      await client.del(key);
    }
  } catch (error) {
    console.error("Redis pattern deletion error:", error.message);
  }
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
};