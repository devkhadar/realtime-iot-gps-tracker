import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import logger from "../utils/logger";

export const requireApiKey = (req: Request, res: any, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.EXTERNAL_FLEET_API_KEY;

  if (!expectedKey) {
    logger.warn("EXTERNAL_FLEET_API_KEY is not configured on the server.");
    return res.status(500).json({ message: "Server configuration error", statusCode: 500 });
  }

  if (!apiKey || typeof apiKey !== "string") {
    return res.status(403).json({ message: "Forbidden: API Key is missing or invalid format", statusCode: 403 });
  }

  try {
    // Convert to buffers for timingSafeEqual to prevent timing attacks
    const keyBuffer = Buffer.from(apiKey, "utf-8");
    const expectedBuffer = Buffer.from(expectedKey, "utf-8");

    // Buffers must be the same length to use timingSafeEqual
    if (keyBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
      return res.status(403).json({ message: "Forbidden: Invalid API Key", statusCode: 403 });
    }

    next();
  } catch (error) {
    logger.error("API Key validation error:", error);
    return res.status(403).json({ message: "Forbidden: Invalid API Key", statusCode: 403 });
  }
};
