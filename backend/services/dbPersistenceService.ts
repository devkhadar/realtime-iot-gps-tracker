import prisma from '../db/prisma';
import logger from '../utils/logger';

const useMock = process.env.USE_MOCK_DB === "true";

/**
 * Handles asynchronous, non-blocking database operations.
 * Supports a mock mode to bypass actual database calls during local testing.
 */
export class DbPersistenceService {
  private telemetryBuffer: any[] = [];
  private batchSize: number;
  private flushIntervalMs: number;
  private _flushTimer: NodeJS.Timeout | null;

  constructor() {
    this.batchSize = parseInt(process.env.DB_BATCH_SIZE || "50") || 50;
    this.flushIntervalMs = parseInt(process.env.DB_FLUSH_INTERVAL_MS || "5000") || 5000;
    
    this._flushTimer = setInterval(() => this.flushTelemetryBatch(), this.flushIntervalMs);
  }

  queueTelemetry(vehicleId: string, telemetryData: any): void {
    if (useMock) return;

    this.telemetryBuffer.push({
      vehicleId,
      latitude: telemetryData.latitude,
      longitude: telemetryData.longitude,
      speed: telemetryData.speed || 0,
      heading: telemetryData.heading || null,
      timestamp: new Date(telemetryData.timestamp || Date.now()),
      currentGeofence: telemetryData.currentGeofence || null,
      previousGeofence: telemetryData.previousGeofence || null,
      event: telemetryData.geofenceEvent || null
    });

    if (this.telemetryBuffer.length >= this.batchSize) {
      this.flushTelemetryBatch().catch(err => {
        logger.error('Failed to flush telemetry batch', { error: err.message });
      });
    }
  }

  async flushTelemetryBatch(): Promise<void> {
    if (useMock || this.telemetryBuffer.length === 0) return;

    const batchToInsert = [...this.telemetryBuffer];
    this.telemetryBuffer = [];

    try {
      const startTime = Date.now();
      const result = await prisma.telemetry.createMany({
        data: batchToInsert,
        skipDuplicates: true
      });
      const latency = Date.now() - startTime;
      
      logger.debug(`Flushed ${result.count} telemetry records to DB`, { latencyMs: latency });
    } catch (error: any) {
      logger.error('Database bulk insert error', { error: error.message, stack: error.stack });
    }
  }

  async upsertVehicle(vehicleData: any): Promise<any> {
    if (useMock) {
      return { ...vehicleData, id: 'mock-id', createdAt: new Date(), updatedAt: new Date() };
    }

    try {
      return await prisma.vehicle.upsert({
        where: { vehicleNumber: vehicleData.vehicleNumber },
        update: {
          vehicleName: vehicleData.vehicleName,
          status: vehicleData.status || 'online',
          updatedAt: new Date()
        },
        create: {
          vehicleNumber: vehicleData.vehicleNumber,
          vehicleName: vehicleData.vehicleName,
          status: vehicleData.status || 'online',
        }
      });
    } catch (error: any) {
      logger.error(`Error upserting vehicle ${vehicleData.vehicleNumber}: ${error.message}`);
    }
  }

  async shutdown(): Promise<void> {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
    if (!useMock) {
      await this.flushTelemetryBatch();
      await prisma.$disconnect();
    }
    logger.info('Database persistence service shut down');
  }
}

export const dbPersistence = new DbPersistenceService();
