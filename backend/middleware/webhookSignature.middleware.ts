import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import logger from "../utils/logger";

export const verifyWebhookSignature = (req: Request, res: any, next: NextFunction) => {
  // Local sim bypass
  if (process.env.USE_MOCK_DB === "true" || process.env.USE_MOCK_MQTT === "true") {
    return next();
  }

  const signature = req.headers["x-signature"];
  const secret = process.env.WEBHOOK_SECRET || process.env.EXTERNAL_FLEET_API_KEY;

  if (!secret) {
    logger.warn("Webhook secret is not configured on the server.");
    return res.status(500).json({ message: "Server configuration error", statusCode: 500 });
  }

  if (!signature || typeof signature !== "string") {
    return res.status(401).json({ message: "Unauthorized: Missing or invalid X-Signature header", statusCode: 401 });
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    logger.warn("Raw body is missing. Ensure express.json() is configured with verify().");
    return res.status(500).json({ message: "Server configuration error", statusCode: 500 });
  }

  try {
    // Compute HMAC
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(rawBody).digest("hex");

    // Timing-safe comparison to prevent side-channel attacks
    const signatureBuffer = Buffer.from(signature, "utf-8");
    const digestBuffer = Buffer.from(digest, "utf-8");

    // Prevent length extension attacks
    if (signatureBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(signatureBuffer, digestBuffer)) {
      logger.warn("Webhook signature mismatch.");
      return res.status(401).json({ message: "Unauthorized: Invalid Signature", statusCode: 401 });
    }

    next();
  } catch (error) {
    logger.error("Webhook signature verification error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid Signature", statusCode: 401 });
  }
};
