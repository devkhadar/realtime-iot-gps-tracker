import axios from "axios";
import "dotenv/config";
import crypto from "crypto";

/**
 * Fleet Webhook Simulator
 * 
 * Mimics an external fleet management system sending batches of vehicle telemetry
 * to the /api/live endpoint.
 */

const args = process.argv.slice(2).reduce((acc: any, arg) => {
  const [key, value] = arg.replace("--", "").split("=");
  acc[key] = value;
  return acc;
}, {});

const VEHICLE_COUNT = parseInt(args.vehicles) || 100;
const UPDATE_INTERVAL_MS = parseInt(args.interval) || 2000;
const BATCH_SIZE = parseInt(args.batch) || 50;
const API_URL = `http://localhost:${process.env.APP_PORT || 5000}/api/live`;
const API_KEY = process.env.EXTERNAL_FLEET_API_KEY || "ZmxlZXR4OnNlY3JldA==";

// Mock Geofence Coordinates (Centers strictly INSIDE polygons in seed-mock.ts)
const WAYPOINTS = [
  { latitude: 17.440, longitude: 78.383 }, // Corporate Headquarters (Order 1)
  { latitude: 17.450, longitude: 78.392 }, // North Warehouse (Order 2)
  { latitude: 17.430, longitude: 78.373 }, // Logistics Hub Alpha (Order 3)
];

interface VehicleState {
  vehicleNumber: string;
  latitude: number;
  longitude: number;
  speed: number;
  targetWaypoint: number;
  movingForward: boolean; // For 1->2->3->2->1 routing
}

const vehicles: VehicleState[] = [];

// Initialize vehicles randomly on paths between waypoints
for (let i = 1; i <= VEHICLE_COUNT; i++) {
  const startIdx = i % WAYPOINTS.length;
  const isLast = startIdx === WAYPOINTS.length - 1;
  const movingForward = !isLast;
  const nextIdx = movingForward ? startIdx + 1 : startIdx - 1;
  
  // Progress between start and next
  const progress = Math.random();
  const lat = WAYPOINTS[startIdx].latitude + (WAYPOINTS[nextIdx].latitude - WAYPOINTS[startIdx].latitude) * progress;
  const lng = WAYPOINTS[startIdx].longitude + (WAYPOINTS[nextIdx].longitude - WAYPOINTS[startIdx].longitude) * progress;

  vehicles.push({
    vehicleNumber: `SIM-${String(i).padStart(4, "0")}`,
    latitude: lat,
    longitude: lng,
    speed: Math.floor(Math.random() * 40) + 20,
    targetWaypoint: nextIdx,
    movingForward: movingForward
  });
}

function moveTowardsWaypoint(vehicle: VehicleState) {
  const target = WAYPOINTS[vehicle.targetWaypoint];
  
  const latDiff = target.latitude - vehicle.latitude;
  const lngDiff = target.longitude - vehicle.longitude;
  const distanceSq = latDiff * latDiff + lngDiff * lngDiff;
  
  // If close enough (~50m), pick next waypoint based on order rules
  if (distanceSq < 0.0000005) {
    if (vehicle.movingForward) {
      if (vehicle.targetWaypoint === WAYPOINTS.length - 1) {
        vehicle.movingForward = false;
        vehicle.targetWaypoint = WAYPOINTS.length - 2;
      } else {
        vehicle.targetWaypoint++;
      }
    } else {
      if (vehicle.targetWaypoint === 0) {
        vehicle.movingForward = true;
        vehicle.targetWaypoint = 1;
      } else {
        vehicle.targetWaypoint--;
      }
    }
    return;
  }
  
  const moveFactor = (vehicle.speed * 0.0000004); 
  const angle = Math.atan2(lngDiff, latDiff);
  
  vehicle.latitude += Math.cos(angle) * moveFactor;
  vehicle.longitude += Math.sin(angle) * moveFactor;
  
  // Subtle jitter
  vehicle.latitude += (Math.random() - 0.5) * 0.00001;
  vehicle.longitude += (Math.random() - 0.5) * 0.00001;
  
  vehicle.speed = Math.max(15, Math.min(90, vehicle.speed + (Math.random() - 0.5) * 5));
}

async function runSimulation() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           Fleet Webhook Simulator                       ║
╠══════════════════════════════════════════════════════════╣
║  Vehicles:    ${String(VEHICLE_COUNT).padEnd(42)}║
║  Batch Size:  ${String(BATCH_SIZE).padEnd(42)}║
║  Interval:    ${String(UPDATE_INTERVAL_MS + "ms").padEnd(42)}║
║  Target:      ${String(API_URL).padEnd(42)}║
║  Mode:        Bi-Directional Order-Based Routing        ║
╚══════════════════════════════════════════════════════════╝
  `);

  let totalRequests = 0;
  let totalVehiclesSent = 0;

  setInterval(async () => {
    // Update positions
    vehicles.forEach(v => {
      moveTowardsWaypoint(v);
    });

    // Send in batches
    for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
      const batch = vehicles.slice(i, i + BATCH_SIZE);
      const payload = JSON.stringify(batch);
      
      const signature = crypto
        .createHmac("sha256", API_KEY)
        .update(payload)
        .digest("hex");
      
      try {
        await axios.post(API_URL, payload, {
          headers: {
            "x-signature": signature,
            "Content-Type": "application/json"
          }
        });
        totalRequests++;
        totalVehiclesSent += batch.length;
      } catch (err: any) {
        console.error(`  ✗ Batch failed: ${err.response?.status || err.message}`);
      }
    }
  }, UPDATE_INTERVAL_MS);

  // Stats reporter
  setInterval(() => {
    const throughput = (totalVehiclesSent / (process.uptime() || 1)).toFixed(1);
    console.log(`📊 Stats: ${VEHICLE_COUNT} vehicles | ${totalRequests} requests | ${totalVehiclesSent} pts | ${throughput} pts/sec`);
  }, 5000);
}

runSimulation().catch(console.error);
