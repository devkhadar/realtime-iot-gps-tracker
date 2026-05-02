import mqtt, { MqttClient } from "mqtt";
import "dotenv/config";

/**
 * IoT Device Simulator (MQTT)
 */

const args = process.argv.slice(2).reduce((acc: any, arg) => {
  const [key, value] = arg.replace("--", "").split("=");
  acc[key] = value;
  return acc;
}, {});

const DEVICE_COUNT = parseInt(args.devices) || 10;
const UPDATE_INTERVAL_MS = parseInt(args.interval) || 2000;
const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost";
const BROKER_PORT = parseInt(process.env.MQTT_PORT || "1883") || 1883;

const BOUNDS = {
  latMin: 17.35,
  latMax: 17.50,
  lngMin: 78.35,
  lngMax: 78.55,
};

function randomPosition() {
  return {
    latitude: BOUNDS.latMin + Math.random() * (BOUNDS.latMax - BOUNDS.latMin),
    longitude: BOUNDS.lngMin + Math.random() * (BOUNDS.lngMax - BOUNDS.lngMin),
  };
}

function drift(pos: any, speed: number) {
  const factor = speed * 0.00001;
  return {
    latitude: pos.latitude + (Math.random() - 0.5) * factor,
    longitude: pos.longitude + (Math.random() - 0.5) * factor,
  };
}

interface Device {
  deviceId: string;
  client: MqttClient;
  getMessageCount: () => number;
}

function createDevice(index: number): Device {
  const deviceId = `SIM-${String(index).padStart(4, "0")}`;
  let position = randomPosition();
  let speed = Math.floor(Math.random() * 60) + 10;
  let messageCount = 0;

  const client = mqtt.connect(BROKER_URL, {
    port: BROKER_PORT,
    clientId: `sim-device-${deviceId}-${Date.now().toString(36)}`,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
  });

  client.on("connect", () => {
    console.log(`  ✓ MQTT Device ${deviceId} connected`);

    const interval = setInterval(() => {
      speed = Math.max(0, speed + (Math.random() - 0.5) * 10);
      position = drift(position, speed);

      const payload = {
        deviceId,
        latitude: parseFloat(position.latitude.toFixed(6)),
        longitude: parseFloat(position.longitude.toFixed(6)),
        speed: parseFloat(speed.toFixed(1)),
        heading: Math.floor(Math.random() * 360),
        timestamp: Date.now(),
      };

      const topic = `devices/${deviceId}/telemetry`;
      client.publish(topic, JSON.stringify(payload), { qos: 1 });
      messageCount++;
    }, UPDATE_INTERVAL_MS + Math.random() * 500);

    client.on("close", () => clearInterval(interval));
  });

  return { deviceId, client, getMessageCount: () => messageCount };
}

console.log(`Starting ${DEVICE_COUNT} MQTT devices...\n`);

const devices: Device[] = [];
for (let i = 1; i <= DEVICE_COUNT; i++) {
  devices.push(createDevice(i));
}

setInterval(() => {
  const totalMessages = devices.reduce((sum, d) => sum + d.getMessageCount(), 0);
  const throughput = (totalMessages / process.uptime()).toFixed(1);
  console.log(`📊 Stats: ${devices.length} MQTT devices | ${totalMessages} total messages | ${throughput} msg/sec`);
}, 10000);

process.on("SIGINT", () => {
  console.log("\nShutting down MQTT simulator...");
  devices.forEach((d) => d.client.end());
  setTimeout(() => process.exit(0), 1000);
});
