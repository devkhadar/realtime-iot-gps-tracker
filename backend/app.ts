import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import routes from "./routes";
import errorHandler from "./middleware/errorHandler";
import responseFormatter from "./middleware/responseFormatter";
import swaggerSpecs from "./config/swagger";
import logger from "./utils/logger";
import { pipeline } from "./core/pipeline";

const app = express();

// ===== Middleware Stack =====
app.use(responseFormatter);
app.use(express.json({ 
  limit: "1mb",
  verify: (req: Request, res: Response, buf: Buffer) => {
    // Attach raw body buffer for HMAC signature verification
    (req as any).rawBody = buf;
  }
}));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin!)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ===== API Routes =====
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Pipeline health check
 *     tags: [System]
 */
app.get("/health", (req: Request, res: Response) => {
  res.json(pipeline.getHealth());
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Pipeline metrics
 *     tags: [System]
 */
app.get("/metrics", (req: Request, res: Response) => {
  const health = pipeline.getHealth();
  res.json(health.pipeline);
});

app.get("/ping", (req: Request, res: Response) => res.send("Pong!"));

app.use(routes);

// ===== Error Handling =====
app.use(errorHandler);

// ===== Global Error Boundaries =====
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection", { reason: reason?.message || reason });
});

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
});

export default app;
