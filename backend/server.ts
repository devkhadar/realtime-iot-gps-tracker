import "dotenv/config";
import http from "http";
import app from "./app";
import { pipeline } from "./core/pipeline";
import logger from "./utils/logger";
import { connectRedis, disconnectRedis } from "./db/redis";
import { loadSettingsFromDb } from "./routes/fleet-api/settings";
/**
 * Server entry point for the IoT Telemetry Pipeline.
 */
async function startServer() {
  // Validate production infrastructure configuration if not running in MOCK mode
  const isMockMode = process.env.USE_MOCK_DB === "true" || process.env.USE_MOCK_REDIS === "true" || process.env.USE_MOCK_MQTT === "true";
  
  if (!isMockMode) {
    const requiredEnvVars = ["DATABASE_URL", "REDIS_URL", "MQTT_BROKER_URL"];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      logger.error("╔══════════════════════════════════════════════════════════════╗");
      logger.error("║ FATAL ERROR: Missing Required Infrastructure Configuration   ║");
      logger.error("╠══════════════════════════════════════════════════════════════╣");
      logger.error(`║ Missing: ${missingVars.join(', ').padEnd(51)}║`);
      logger.error("║                                                              ║");
      logger.error("║ Please configure your .env file OR start the app using:      ║");
      logger.error("║ > npm run dev:mock                                           ║");
      logger.error("╚══════════════════════════════════════════════════════════════╝");
      process.exit(1);
    }
  }

  const PORT = process.env.APP_PORT || process.env.PORT || 5000;

  // Create HTTP server
  const server = http.createServer(app);

  // Connect to Redis Cache
  await connectRedis();

  // Load system settings (duty config) from DB into memory
  await loadSettingsFromDb();

  // Initialize the full telemetry pipeline
  const io = await pipeline.initialize(server);

  // Attach io to app for route access
  app.set("io", io);
  app.set("pipeline", pipeline);

  // Start listening
  server.listen(PORT, () => {
    logger.info(`
╔══════════════════════════════════════════════════════════════╗
║          IoT GPS Telemetry Pipeline — RUNNING               ║
║──────────────────────────────────────────────────────────────║
║  HTTP API:       http://localhost:${PORT}                       ║
║  WebSocket:      ws://localhost:${PORT}                         ║
║  Health Check:   http://localhost:${PORT}/health                ║
║  Swagger Docs:   http://localhost:${PORT}/swagger               ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Graceful shutdown...`);
    await pipeline.shutdown();
    await disconnectRedis();
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err: Error) => {
  logger.error("Fatal: Failed to start server", { error: err.message, stack: err.stack });
  process.exit(1);
});
