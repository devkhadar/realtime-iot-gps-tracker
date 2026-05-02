import * as turf from "@turf/turf";
import logger from "../utils/logger";
import { Geofence } from "../types";

/**
 * High-performance in-memory geofence processor.
 */
export class GeofenceEngine {
  private geofences: Geofence[] = [];
  private deviceStates: Map<string, { fence: Geofence | null; lastUpdate: number }> = new Map();

  /**
   * Load geofences into memory from any data source.
   */
  loadGeofences(geofences: Geofence[]): void {
    this.geofences = geofences;
    logger.info(`GeofenceEngine loaded ${geofences.length} geofences`);
  }

  /**
   * Check if a GPS point is inside any geofence.
   */
  checkPoint(lat: number, lng: number): Geofence | null {
    const point = turf.point([lng, lat]);
    for (const fence of this.geofences) {
      try {
        if (!fence.latlngs || fence.latlngs.length < 3) continue;
        
        // Turf requires [longitude, latitude] and the polygon must be closed (first point == last point)
        const coords = fence.latlngs.map((p) => [p.longitude, p.latitude]);
        if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
          coords.push(coords[0]);
        }

        const polygon = turf.polygon([coords]);
        if (turf.booleanPointInPolygon(point, polygon)) {
          return fence;
        }
      } catch (err: any) {
        logger.warn(`Geofence check error for "${fence.name}": ${err.message}`);
      }
    }
    return null;
  }

  /**
   * Process a device location update and detect geofence enter/exit events.
   */
  processDeviceLocation(deviceId: string, lat: number, lng: number) {
    const currentFence = this.checkPoint(lat, lng);
    const previousState = this.deviceStates.get(deviceId) || { fence: null };

    let entered: Geofence | null = null;
    let exited: Geofence | null = null;

    if (currentFence && (!previousState.fence || previousState.fence.name !== currentFence.name)) {
      entered = currentFence;
      logger.info(`Device ${deviceId} ENTERED geofence: ${currentFence.name}`);
    }

    if (previousState.fence && (!currentFence || previousState.fence.name !== currentFence.name)) {
      exited = previousState.fence;
      logger.info(`Device ${deviceId} EXITED geofence: ${previousState.fence.name}`);
    }

    this.deviceStates.set(deviceId, {
      fence: currentFence,
      lastUpdate: Date.now(),
    });

    return { entered, exited, current: currentFence };
  }

  /**
   * Get all loaded geofences.
   */
  getGeofences(): Geofence[] {
    return this.geofences;
  }

  /**
   * Add or update a geofence at runtime.
   */
  upsertGeofence(geofence: Geofence): void {
    const idx = this.geofences.findIndex((g) => g.name === geofence.name);
    if (idx !== -1) {
      this.geofences[idx] = geofence;
    } else {
      this.geofences.push(geofence);
    }
    logger.info(`GeofenceEngine upserted geofence: ${geofence.name}`);
  }

  /**
   * Remove a geofence at runtime.
   */
  removeGeofence(geofenceName: string): void {
    const initialLength = this.geofences.length;
    this.geofences = this.geofences.filter((g) => g.name !== geofenceName);
    if (this.geofences.length < initialLength) {
      logger.info(`GeofenceEngine removed geofence: ${geofenceName}`);
    }
  }
}

// Singleton
export const geofenceEngine = new GeofenceEngine();
