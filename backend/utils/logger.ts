import winston from "winston";

/**
 * Centralized structured logger for the IoT telemetry pipeline.
 * Uses Winston with JSON formatting for production and colorized output for development.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "iot-gps-pipeline" },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
                return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
              })
            ),
    }),
  ],
});

export default logger;
