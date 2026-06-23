// lib/redis/index.ts
// Redis client singleton for BullMQ and caching.
//
// We use ioredis as the Redis client — BullMQ requires it specifically
// (it doesn't work with other Redis clients like node-redis).
//
// Why singleton: same reason as our Prisma singleton — Next.js hot
// reloading would create a new connection on every file save without
// this pattern, quickly exhausting Upstash's connection limit.
//
// Note: we create a function that returns connection OPTIONS rather
// than a single shared client instance, because BullMQ internally
// creates multiple Redis connections (one for the queue, one for
// the worker, one for events) and needs to manage them separately.
// Sharing one client across all of them causes connection conflicts.

import Redis from "ioredis";

// Connection options — BullMQ uses these to create its own connections
export function getRedisOptions() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  return {
    // maxRetriesPerRequest must be null for BullMQ workers
    // This tells ioredis to keep retrying indefinitely rather than
    // giving up after a fixed number of attempts — important for
    // long-running workers that should survive temporary Redis blips
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

// Separate client instance for non-BullMQ usage
// (caching, rate limiting, pub/sub — things we'll add later)
declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

function createRedisClient(): Redis {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Explicitly enable TLS for Upstash (rediss:// protocol)
    tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
  });

  client.on("error", (error) => {
    console.error("Redis client error:", error);
  });

  client.on("connect", () => {
    console.log("Redis client connected");
  });

  return client;
}

const redis = globalThis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.redis = redis;
}

export default redis;