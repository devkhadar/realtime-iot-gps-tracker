import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const ipWhitelist = (req: Request, res: any, next: NextFunction) => {
  const allowedIpsString = process.env.ALLOWED_WEBHOOK_IPS;

  // If no IPs are configured, bypass the check (fail-open or you can make it fail-closed based on preference)
  // For open-source resilience, we fail-open if the env variable isn't set, but log a warning.
  if (!allowedIpsString) {
    return next();
  }

  const allowedIps = allowedIpsString.split(",").map((ip) => ip.trim());
  const clientIp = req.ip || req.socket.remoteAddress;

  // Handles IPv4 mapped IPv6 addresses (e.g. ::ffff:192.168.1.1)
  const normalizedClientIp = clientIp?.replace(/^.*:/, "");

  if (!normalizedClientIp || !allowedIps.includes(normalizedClientIp)) {
    logger.warn(`Unauthorized IP address attempted webhook access: ${clientIp}`);
    return res.status(403).json({ message: "Forbidden: IP not whitelisted", statusCode: 403 });
  }

  next();
};
