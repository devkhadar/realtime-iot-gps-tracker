import { createClient } from "redis";
import logger from "../utils/logger";
import { mockRedisClient } from "./mock-redis";

const useMock = process.env.USE_MOCK_REDIS === "true";

export const redisClient: any = useMock 
  ? mockRedisClient 
  : createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

if (!useMock) {
  redisClient.on("error", (err: any) => logger.error("Redis Client Error", err));
}

let isConnected = false;

export async function connectRedis() {
  if (!isConnected) {
    try {
      await redisClient.connect();
      isConnected = true;
      if (!useMock) logger.info("Redis connected successfully");
    } catch (err) {
      logger.error("Failed to connect to Redis:", err);
    }
  }
}

export async function disconnectRedis() {
  if (isConnected) {
    await redisClient.quit();
    isConnected = false;
    if (!useMock) logger.info("Redis disconnected");
  }
}
