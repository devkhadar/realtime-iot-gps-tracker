import * as turf from "@turf/turf";
import logger from "../utils/logger";
import { geofenceEngine } from "../core/geofence-engine";
import { mqttIngestion } from "../core/mqtt-ingestion";
import { redisClient } from "../db/redis";
import {
  findETA,
  findETAInMins,
  findETAWithBuffer,
  formatTimeToHHMM,
  getCurrentISTTime,
  getNextDepartureSlot,
} from "../utils/constant";
import { 
  Geofence, 
  MovementRecord, 
  VehicleGeofenceState, 
  TelemetryBatchItem 
} from "../types";

/**
 * Generates a geofence flag from its name
 */
function generateFlag(geofence: Geofence | null | undefined): string | null {
  return geofence && geofence.name
    ? geofence.name.trim().replaceAll(" ", "").split(/\s+/).join("-")
    : null;
}

const STATE_PREFIX = "vehicle_state:";
const MOVEMENT_PREFIX = "movement_flag:";

export class LiveTrackingService {
  /**
   * Clears state for all vehicles and emits empty arrays to websockets
   */
  async clearState(io: any): Promise<void> {
    try {
      const movementKeys = await redisClient.keys(`${MOVEMENT_PREFIX}*`);
      for (const key of movementKeys) {
        const flag = key.replace(MOVEMENT_PREFIX, "");
        io.emit(flag, []);
        await redisClient.del(key);
      }

      const stateKeys = await redisClient.keys(`${STATE_PREFIX}*`);
      if (stateKeys.length > 0) {
        await redisClient.del(stateKeys);
      }
      logger.info("Cleared all live tracking state from Redis");
    } catch (err) {
      logger.error("Error clearing Redis state", err);
    }
  }

  /**
   * Process incoming telemetry data for a batch of vehicles using Redis Pipelining
   */
  async processTelemetryBatch(vehicles: TelemetryBatchItem[], io: any): Promise<number> {
    if (!Array.isArray(vehicles) || vehicles.length === 0) return 0;

    const allGeofences = geofenceEngine.getGeofences();
    // Process all incoming vehicles from the /live endpoint dynamically
    // No onboarding required - if a vehicle sends telemetry, it gets tracked.
    const filteredVehicles = vehicles;

    if (filteredVehicles.length === 0) return 0;

    // --- 1. PIPELINE FETCH ---
    const movementKeys = await redisClient.keys(`${MOVEMENT_PREFIX}*`);
    const fetchPipeline = redisClient.multi();
    
    filteredVehicles.forEach(v => fetchPipeline.get(`${STATE_PREFIX}${v.vehicleNumber}`));
    movementKeys.forEach(k => fetchPipeline.get(k));
    
    const results = await fetchPipeline.exec();
    if (!results) return 0;
    
    const vehicleStates: Record<string, VehicleGeofenceState> = {};
    for (let i = 0; i < filteredVehicles.length; i++) {
       const vId = filteredVehicles[i].vehicleNumber;
       vehicleStates[vId] = results[i] ? JSON.parse(results[i] as any) : {};
    }

    const movementDataByFlag: Record<string, MovementRecord[]> = {};
    let offset = filteredVehicles.length;
    for (let i = 0; i < movementKeys.length; i++) {
       const flag = movementKeys[i].replace(MOVEMENT_PREFIX, "");
       movementDataByFlag[flag] = results[offset + i] ? JSON.parse(results[offset + i] as any) : [];
    }

    // --- 2. SYNCHRONOUS IN-MEMORY PROCESSING ---
    for (const vehicle of filteredVehicles) {
      this.computeVehicleState(vehicle, vehicleStates, movementDataByFlag, allGeofences, io);
      
      // Emit live enriched telemetry for map plotting and building status
      const vState = vehicleStates[vehicle.vehicleNumber];
      const arrivalTime = vState.enteredTime ? formatTimeToHHMM(vState.enteredTime) : null;
      const depTime = vState.enteredTime ? formatTimeToHHMM(getNextDepartureSlot(vState.enteredTime)) : null;

      io.emit('telemetry:update', {
        deviceId: vehicle.vehicleNumber,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        speed: vehicle.speed,
        currentGeofence: vState.current?.name || null,
        status: vehicle.speed > 0 ? 'moving' : 'idle',
        arrivalTime,
        estimatedDeparture: depTime
      });
    }

    // --- 3. PIPELINE SAVE ---
    const savePipeline = redisClient.multi();
    for (const [vId, state] of Object.entries(vehicleStates)) {
       savePipeline.set(`${STATE_PREFIX}${vId}`, JSON.stringify(state));
    }
    for (const [flag, data] of Object.entries(movementDataByFlag)) {
       savePipeline.set(`${MOVEMENT_PREFIX}${flag}`, JSON.stringify(data));
    }
    
    await savePipeline.exec();

    // --- 4. BROADCAST ---
    this.broadcastUpdates(io, movementDataByFlag);
    
    return filteredVehicles.length;
  }

  /**
   * Pure memory computation for a single vehicle's state
   */
  private computeVehicleState(
    vehicle: TelemetryBatchItem, 
    vehicleStates: Record<string, VehicleGeofenceState>, 
    movementDataByFlag: Record<string, MovementRecord[]>, 
    allGeofences: Geofence[],
    io: any
  ): void {
    const {
      vehicleNumber: vehicleId,
      latitude: lat,
      longitude: lng, 
      vehicleName,
      speed,
    } = vehicle;

    const currentFence = geofenceEngine.checkPoint(lat, lng);
    const vehicleState = vehicleStates[vehicleId];
    
    let previousFence = vehicleState.previous || null;
    let destination = vehicleState.destination || null;
    let enteredTime = vehicleState.enteredTime || null;
    let stoppedSince = vehicleState.stoppedSince || null;

    let currentTime = getCurrentISTTime();

    const isStopped = speed === 0;
    if (isStopped) {
      stoppedSince = stoppedSince || currentTime;
    } else {
      stoppedSince = null;
    }
    const stoppedDurationMins = isStopped && stoppedSince
      ? Math.floor((currentTime - stoppedSince) / 60000)
      : null;

    // Remove vehicle from old flags
    Object.keys(movementDataByFlag).forEach((flag) => {
      const movementData = movementDataByFlag[flag];
      const hasVehicle = movementData.some((record) => record.vehicleId === vehicleId);
      
      if (hasVehicle && (!currentFence || generateFlag(currentFence) !== flag)) {
        const removedRecord = movementData.find((record) => record.vehicleId === vehicleId);
        movementDataByFlag[flag] = movementData.filter((record) => record.vehicleId !== vehicleId);

        if (removedRecord) {
          mqttIngestion.publish(removedRecord.vehicleId, {
            lastUpdated: new Date().setMilliseconds(-10),
            vehicleNumber: removedRecord.vehicleName || "",
            state: "D",
            arr: removedRecord.eta || "",
            dep: removedRecord.dep || "",
          }).catch((err: any) => logger.error(`MQTT publish error: ${err.message}`));
        }
      }
    });

    // Vehicle entered a new geofence
    if (currentFence && (!previousFence || previousFence.name !== currentFence.name)) {
      enteredTime = getCurrentISTTime();

      vehicleStates[vehicleId] = {
        current: currentFence,
        previous: currentFence,
        destination: null,
        enteredTime,
        stoppedSince: isStopped ? currentTime : null,
        vehicleName,
      };

      previousFence = currentFence;
      destination = null;

      const currentFlag = generateFlag(currentFence);

      if (currentFlag) {
        const movementRecord: MovementRecord = {
          vehicleId,
          from: previousFence?.name || null,
          to: currentFence.name,
          toFlag: currentFlag,
          timestamp: currentTime,
          enteredTime,
          speed,
          etaInMins: 0,
          eta: formatTimeToHHMM(currentTime),
          distance: 0,
          isStopped,
          stoppedSince,
          stoppedDurationMins,
          latitude: lat,
          longitude: lng,
          vehicleName,
        };

        if (!movementDataByFlag[currentFlag]) movementDataByFlag[currentFlag] = [];
        const movementData = movementDataByFlag[currentFlag];
        const existingIndex = movementData.findIndex((r) => r.vehicleId === vehicleId);

        if (existingIndex !== -1) {
          movementData[existingIndex] = movementRecord;
        } else {
          movementData.push(movementRecord);
        }
      }

      // Emit geofence event (Entry)
      io.emit('geofence:event', {
        deviceId: vehicleId,
        type: 'ENTERED',
        geofence: currentFence.name,
        timestamp: currentTime
      });

      // Return to origin logic
      if (previousFence && currentFence.name === previousFence.name && destination) {
        const destinationFlag = generateFlag(destination);
        if (destinationFlag && movementDataByFlag[destinationFlag]) {
          const movementData = movementDataByFlag[destinationFlag];
          const removedRecord = movementData.find((r) => r.vehicleId === vehicleId);
          
          if (removedRecord) {
            movementDataByFlag[destinationFlag] = movementData.filter((r) => r.vehicleId !== vehicleId);
            mqttIngestion.publish(vehicleId, {
              lastUpdated: new Date().setMilliseconds(-10),
              vehicleNumber: removedRecord.vehicleName || "",
              state: "D",
              arr: removedRecord.eta || "",
              dep: removedRecord.dep || "",
            }).catch((err: any) => logger.error(`MQTT publish error: ${err.message}`));
          }
        }
        destination = null;
        if (vehicleStates[vehicleId]) {
          vehicleStates[vehicleId].destination = null;
        }
      }
    }

    // Vehicle left a geofence
    if (!currentFence && previousFence) {
      enteredTime = null;

      const orders = allGeofences.map((x) => x.order);
      const maxOrder = Math.max(...(orders.length ? orders : [0]));
      const minOrder = Math.min(...(orders.length ? orders : [0]));

      if (!destination) {
        if (previousFence.order < maxOrder) {
          destination = allGeofences.find((x) => x.order === (previousFence?.order || 0) + 1) || null;
        } else if (previousFence.order > minOrder) {
          destination = allGeofences.find((x) => x.order === (previousFence?.order || 0) - 1) || null;
        }
      }

      if (!destination) {
        destination =
          allGeofences.find((x) => x.order === (previousFence?.order || 0) + 1) ||
          allGeofences.find((x) => x.order === (previousFence?.order || 0) - 1) || null;
      }

      if (!destination || destination.name !== previousFence.name) {
        const flag = generateFlag(previousFence);
        if (flag && movementDataByFlag[flag]) {
          const movementData = movementDataByFlag[flag];
          const removedRecord = movementData.find((r) => r.vehicleId === vehicleId);
          
          if (removedRecord) {
            movementDataByFlag[flag] = movementData.filter((r) => r.vehicleId !== vehicleId);
            mqttIngestion.publish(vehicleId, {
              lastUpdated: new Date().setMilliseconds(-10),
              vehicleNumber: removedRecord.vehicleName || "",
              state: "D",
              arr: removedRecord.eta || "",
              dep: removedRecord.dep || "",
            }).catch((err: any) => logger.error(`MQTT publish error: ${err.message}`));
          }
        }
      }

      vehicleStates[vehicleId] = {
        current: null,
        previous: previousFence,
        destination,
        enteredTime,
        stoppedSince: isStopped ? currentTime : null,
      };

      // Emit geofence event (Exit)
      io.emit('geofence:event', {
        deviceId: vehicleId,
        type: 'EXITED',
        geofence: previousFence.name,
        timestamp: currentTime
      });
    }

    // Transit logic
    if (destination && destination.latlngs?.[0]) {
      const flag = generateFlag(destination) || "";
      const point1 = turf.point([lat, lng]);
      const point2 = turf.point([destination.latlngs[0].latitude, destination.latlngs[0].longitude]);
      const distance = turf.distance(point1, point2, { units: "kilometers" });

      const movementRecord: MovementRecord = {
        vehicleId,
        from: previousFence?.name || null,
        to: destination.name,
        toFlag: flag,
        timestamp: currentTime,
        enteredTime: enteredTime || null,
        speed,
        etaInMins: findETAInMins(speed, distance),
        eta: findETA(speed, distance),
        dep: findETAWithBuffer(speed, distance),
        distance,
        isStopped,
        stoppedSince,
        stoppedDurationMins,
        latitude: lat,
        longitude: lng,
        vehicleName,
      };

      if (!movementDataByFlag[flag]) movementDataByFlag[flag] = [];
      const movementData = movementDataByFlag[flag];
      const existingIndex = movementData.findIndex((r) => r.vehicleId === vehicleId);

      if (existingIndex !== -1) {
        movementData[existingIndex] = movementRecord;
      } else {
        movementData.push(movementRecord);
      }

      vehicleStates[vehicleId] = {
        current: null,
        vehicleName,
        previous: previousFence,
        destination,
        enteredTime,
        stoppedSince: isStopped ? currentTime : null,
      };
    }
  }

  /**
   * Broadcasts the compiled data
   */
  broadcastUpdates(io: any, movementDataByFlag: Record<string, MovementRecord[]>): void {
    Object.keys(movementDataByFlag).forEach((flag) => {
      const movementData = movementDataByFlag[flag];

      movementData.forEach((record) => {
        if (record.enteredTime) {
          record.eta = formatTimeToHHMM(record.enteredTime);
          const departureTime = getNextDepartureSlot(record.enteredTime);
          record.dep = formatTimeToHHMM(departureTime);
        } else {
          record.eta = findETA(record.speed, record.distance);
          record.dep = findETAWithBuffer(record.speed, record.distance);
        }
      });

      const sortedData = [...movementData].sort((a, b) => {
        return (a.enteredTime || a.timestamp || 0) - (b.enteredTime || b.timestamp || 0);
      });

      io.emit(flag, sortedData);

      sortedData.forEach((x) => {
        mqttIngestion.publish(x.vehicleId, {
          lastUpdated: new Date().setMilliseconds(-10),
          vehicleNumber: x.vehicleName || "",
          state: "M",
          arr: x.eta,
          dep: x.dep,
        }).catch((err: any) => logger.error(`MQTT publish error: ${err.message}`));
      });
    });
  }
}

export const liveTrackingService = new LiveTrackingService();
