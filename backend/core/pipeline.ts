import logger from "../utils/logger";
import { mqttIngestion } from "./mqtt-ingestion";
import { wsPushLayer } from "./ws-push-layer";
import { deviceRegistry } from "./device-registry";
import { geofenceEngine } from "./geofence-engine";
import { dbPersistence } from "../services/dbPersistenceService";
import prisma from "../db/prisma";
import { validateTelemetryPayload } from "../utils/validation";
import { activeMockGeofences } from "../utils/mockData";
import { Server } from "http";

/**
 * @class TelemetryPipeline
 * @description Orchestrates the full telemetry data flow.
 */
export class TelemetryPipeline {
  private startTime: number;
  private isRunning: boolean;

  constructor() {
    this.startTime = Date.now();
    this.isRunning = false;
  }

  /**
   * Initialize all pipeline components.
   */
  async initialize(httpServer: Server) {
    logger.info("=== Initializing IoT Telemetry Pipeline ===");

    // Warm up geofence cache
    try {
      if (process.env.USE_MOCK_DB !== "true") {
        const dbGeofences = await prisma.geofence.findMany({
          orderBy: { order: "asc" }
        });
        geofenceEngine.loadGeofences(dbGeofences as any);
      } else {
        logger.info("Loading mock geofences into engine (Mock DB Mode)");
        geofenceEngine.loadGeofences(activeMockGeofences as any);
      }
    } catch (err: any) {
      logger.warn("No geofence data loaded — running without geofencing (Database error)", { error: err.message });
    }

    // Boot WS server
    const io = wsPushLayer.initialize(httpServer);

    // Bind MQTT listeners
    mqttIngestion.onMessage = (deviceId: string, payload: any) => {
      this._processIncomingTelemetry(deviceId, payload);
    };
    
    if (process.env.USE_MOCK_MQTT !== "true") {
      await mqttIngestion.initialize();
    } else {
      logger.info("Skipping MQTT initialization (Mock MQTT Mode)");
    }

    this.isRunning = true;
    logger.info("=== IoT Telemetry Pipeline READY ===", {
      geofences: geofenceEngine.getGeofences().length,
    });

    return io;
  }

  /**
   * Process incoming telemetry from MQTT or HTTP ingestion.
   */
  private _processIncomingTelemetry(deviceId: string, payload: any) {
    const ingestTimestamp = Date.now();

    // Validation
    if (!validateTelemetryPayload(payload)) {
      logger.warn(`Invalid telemetry from device ${deviceId} — dropped`, { deviceId });
      return;
    }

    // 2. Enrich with server timestamp
    const enriched = {
      ...payload,
      deviceId,
      ingestTimestamp,
    };

    // 3. Geofence processing
    if (payload.latitude != null && payload.longitude != null) {
      const geoResult = geofenceEngine.processDeviceLocation(
        deviceId,
        payload.latitude,
        payload.longitude
      );

      if (geoResult.entered) {
        enriched.geofenceEvent = "ENTERED";
        enriched.geofenceName = geoResult.entered.name;
        wsPushLayer.pushGeofenceEvent(deviceId, {
          type: "ENTERED",
          geofence: geoResult.entered.name,
          latitude: payload.latitude,
          longitude: payload.longitude,
        });
      }

      if (geoResult.exited) {
        enriched.geofenceEvent = "EXITED";
        enriched.geofenceName = geoResult.exited.name;
        wsPushLayer.pushGeofenceEvent(deviceId, {
          type: "EXITED",
          geofence: geoResult.exited.name,
          latitude: payload.latitude,
          longitude: payload.longitude,
        });
      }

      enriched.currentGeofence = geoResult.current?.name || null;
    }

    // 4. Push to WebSocket clients
    wsPushLayer.pushToDevice(deviceId, enriched);

    // 5. Async Database Persistence
    dbPersistence.upsertVehicle({
      vehicleNumber: deviceId,
      vehicleName: payload.vehicleName || deviceId,
      status: 'online'
    }).then(() => {
      dbPersistence.queueTelemetry(deviceId, enriched);
    }).catch((err: any) => {
      logger.error(`Failed to enqueue DB operations for ${deviceId}: ${err.message}`);
    });

    const e2eLatency = Date.now() - ingestTimestamp;
    if (e2eLatency > 200) {
      logger.warn(`E2E latency exceeded 200ms: ${e2eLatency}ms`, { deviceId });
    }
  }

  /**
   * Ingest telemetry via HTTP.
   */
  ingestHTTP(deviceId: string, payload: any) {
    const accepted = deviceRegistry.heartbeat(deviceId, payload);
    if (!accepted) return false;

    this._processIncomingTelemetry(deviceId, payload);

    mqttIngestion.publish(deviceId, payload).catch(() => {});

    return true;
  }

  /**
   * Get comprehensive pipeline health and metrics.
   */
  getHealth() {
    return {
      status: this.isRunning ? "UP" : "DOWN",
      mode: (process.env.USE_MOCK_REDIS === "true" || process.env.USE_MOCK_DB === "true") ? "MOCK" : "PRODUCTION",
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      pipeline: {
        mqtt: mqttIngestion.getMetrics(),
        websocket: wsPushLayer.getMetrics(),
        devices: deviceRegistry.getMetrics(),
        geofences: {
          loaded: geofenceEngine.getGeofences().length,
        },
      },
    };
  }

  /**
   * Graceful shutdown of all pipeline components.
   */
  async shutdown() {
    logger.info("Shutting down telemetry pipeline...");
    this.isRunning = false;
    await mqttIngestion.shutdown();
    deviceRegistry.shutdown();
    await dbPersistence.shutdown();
    logger.info("Telemetry pipeline shutdown complete");
  }
}

export const pipeline = new TelemetryPipeline();
