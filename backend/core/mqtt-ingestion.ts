import mqtt, { MqttClient, IClientOptions } from "mqtt";
import logger from "../utils/logger";
// @ts-ignore
import { deviceRegistry } from "./device-registry";

interface MQTTIngestionOptions {
  poolSize?: number;
  maxBufferSize?: number;
  onMessage?: (deviceId: string, payload: any, topic: string) => void;
}

export class MQTTIngestionLayer {
  private poolSize: number;
  private maxBufferSize: number;
  public onMessage: ((deviceId: string, payload: any, topic: string) => void) | null;
  private clients: Map<number, MqttClient> = new Map();
  private messageBuffer: Array<{ topic: string; payload: any; timestamp: number }> = [];
  private roundRobinIndex: number = 0;
  private isShuttingDown: boolean = false;
  private metrics = {
    messagesPublished: 0,
    messagesFailed: 0,
    messagesBuffered: 0,
    reconnections: 0,
    avgPublishLatencyMs: 0,
    _latencySum: 0,
    _latencyCount: 0,
  };

  constructor(options: MQTTIngestionOptions = {}) {
    this.poolSize = options.poolSize || parseInt(process.env.MQTT_POOL_SIZE || "3") || 3;
    this.maxBufferSize = options.maxBufferSize || 5000;
    this.onMessage = options.onMessage || null;
  }

  async initialize(): Promise<void> {
    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost";
    logger.info(`Initializing MQTT ingestion layer`, {
      brokerUrl,
      poolSize: this.poolSize,
      maxBufferSize: this.maxBufferSize,
    });

    for (let i = 0; i < this.poolSize; i++) {
      this._createPooledClient(i, brokerUrl);
    }
  }

  private _createPooledClient(index: number, brokerUrl: string): void {
    const clientId = `iot-pipeline-${index}-${Date.now().toString(36)}`;
    const client = mqtt.connect(brokerUrl, {
      port: parseInt(process.env.MQTT_PORT || "1883") || 1883,
      clientId,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 0,
    } as IClientOptions);

    let reconnectAttempt = 0;

    client.on("connect", () => {
      reconnectAttempt = 0;
      logger.info(`MQTT pool[${index}] connected`, { clientId });
      this._drainBuffer();
    });

    client.on("error", (err) => {
      logger.error(`MQTT pool[${index}] error: ${err.message}`, { clientId });
    });

    client.on("close", () => {
      if (this.isShuttingDown) return;
      this.metrics.reconnections++;
      reconnectAttempt++;

      const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
      const jitter = Math.random() * baseDelay * 0.3;
      const delay = Math.floor(baseDelay + jitter);

      logger.warn(`MQTT pool[${index}] disconnected. Reconnecting in ${delay}ms`, {
        attempt: reconnectAttempt,
        clientId,
      });

      setTimeout(() => {
        if (!this.isShuttingDown) client.reconnect();
      }, delay);
    });

    client.on("message", (topic, message) => {
      this._handleIncomingMessage(topic, message);
    });

    this.clients.set(index, client);
  }

  private _getNextClient(): MqttClient | null {
    const entries = Array.from(this.clients.entries());
    for (let i = 0; i < entries.length; i++) {
      const idx = (this.roundRobinIndex + i) % entries.length;
      const [, client] = entries[idx];
      if (client.connected) {
        this.roundRobinIndex = (idx + 1) % entries.length;
        return client;
      }
    }
    return null;
  }

  async publish(deviceId: string, payload: any, options: { qos?: 0 | 1 | 2 } = {}): Promise<boolean> {
    const accepted = deviceRegistry.heartbeat(deviceId, payload);
    if (!accepted) return false;

    const topic = `devices/${deviceId}/telemetry`;
    const qos = options.qos ?? 1;
    const client = this._getNextClient();

    if (!client) {
      if (process.env.USE_MOCK_MQTT === "true") {
        return true; // Skip buffering in mock mode
      }
      this._bufferMessage(topic, payload);
      return false;
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      client.publish(topic, JSON.stringify(payload), { qos }, (err) => {
        const latency = Date.now() - startTime;
        this._trackLatency(latency);

        if (err) {
          this.metrics.messagesFailed++;
          logger.error(`Publish failed for device ${deviceId}: ${err.message}`);
          this._bufferMessage(topic, payload);
          resolve(false);
        } else {
          this.metrics.messagesPublished++;
          logger.debug(`Published to ${topic}`, { deviceId, latencyMs: latency });
          resolve(true);
        }
      });
    });
  }

  subscribe(topicPattern: string): void {
    for (const [index, client] of this.clients) {
      if (client.connected) {
        client.subscribe(topicPattern, { qos: 1 }, (err) => {
          if (err) {
            logger.error(`MQTT pool[${index}] subscribe failed: ${err.message}`);
          } else {
            logger.info(`MQTT pool[${index}] subscribed to ${topicPattern}`);
          }
        });
      }
    }
  }

  private _handleIncomingMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      const parts = topic.split("/");
      const deviceId = parts.length >= 2 ? parts[1] : "unknown";

      deviceRegistry.heartbeat(deviceId, payload);

      if (this.onMessage) {
        this.onMessage(deviceId, payload, topic);
      }
    } catch (err: any) {
      logger.warn(`Failed to parse MQTT message on ${topic}: ${err.message}`);
    }
  }

  private _bufferMessage(topic: string, payload: any): void {
    if (this.messageBuffer.length >= this.maxBufferSize) {
      this.messageBuffer.shift();
      logger.warn("Message buffer full — dropping oldest message");
    }
    this.messageBuffer.push({ topic, payload, timestamp: Date.now() });
    this.metrics.messagesBuffered++;
  }

  private _drainBuffer(): void {
    if (this.messageBuffer.length === 0) return;

    const count = this.messageBuffer.length;
    logger.info(`Draining ${count} buffered messages`);

    while (this.messageBuffer.length > 0) {
      const buffered = this.messageBuffer.shift();
      if (!buffered) break;
      const { topic, payload } = buffered;
      const client = this._getNextClient();
      if (!client) {
        logger.warn("No connected clients during buffer drain — stopping");
        break;
      }
      client.publish(topic, JSON.stringify(payload), { qos: 1 });
    }

    logger.info(`Buffer drain complete. ${count - this.messageBuffer.length} messages sent`);
  }

  private _trackLatency(latencyMs: number): void {
    this.metrics._latencySum += latencyMs;
    this.metrics._latencyCount++;
    this.metrics.avgPublishLatencyMs = Math.round(
      this.metrics._latencySum / this.metrics._latencyCount
    );
  }

  getMetrics(): any {
    const connectedClients = Array.from(this.clients.values()).filter((c) => c.connected).length;
    return {
      ...this.metrics,
      poolSize: this.poolSize,
      connectedClients,
      bufferedMessages: this.messageBuffer.length,
      _latencySum: undefined,
      _latencyCount: undefined,
    };
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    logger.info("Shutting down MQTT ingestion layer...");

    const closePromises = Array.from(this.clients.values()).map(
      (client) => new Promise<void>((resolve) => client.end(false, () => resolve()))
    );

    await Promise.allSettled(closePromises);
    this.messageBuffer = [];
    logger.info("MQTT ingestion layer shut down complete");
  }
}

export const mqttIngestion = new MQTTIngestionLayer();
