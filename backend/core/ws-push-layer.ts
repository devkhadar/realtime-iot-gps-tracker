import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import logger from "../utils/logger";

export class WebSocketPushLayer {
  private io: Server | null = null;
  private clientBuffers: Map<string, any[]> = new Map();
  private maxBufferPerClient: number = 50;
  private metrics = {
    totalPushes: 0,
    totalBroadcasts: 0,
    avgPushLatencyMs: 0,
    _latencySum: 0,
    _latencyCount: 0,
    connectedClients: 0,
  };

  constructor() {}

  /**
   * Initialize the WebSocket server on an existing HTTP server.
   */
  initialize(httpServer: HttpServer): Server {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["*"];

    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
        methods: ["GET", "POST"],
      },
      pingInterval: 10000,
      pingTimeout: 5000,
      transports: ["websocket", "polling"],
    });

    this.io.on("connection", (socket: Socket) => {
      this.metrics.connectedClients++;
      logger.info(`WebSocket client connected: ${socket.id}`, {
        clientId: socket.id,
        transport: socket.conn.transport.name,
      });

      // Bind to specific device stream
      socket.on("subscribe:device", (deviceId: string) => {
        const room = `device:${deviceId}`;
        socket.join(room);
        logger.debug(`Client ${socket.id} subscribed to ${room}`);

        // Flush history
        this._flushBuffer(socket.id, socket);
      });

      // Bind to global feed
      socket.on("subscribe:fleet", () => {
        socket.join("fleet:all");
        logger.debug(`Client ${socket.id} subscribed to fleet:all`);
      });

      // Client unsubscribes
      socket.on("unsubscribe:device", (deviceId: string) => {
        socket.leave(`device:${deviceId}`);
      });

      socket.on("disconnect", (reason: string) => {
        this.metrics.connectedClients--;
        logger.info(`WebSocket client disconnected: ${socket.id}`, {
          clientId: socket.id,
          reason,
        });
      });
    });

    logger.info("WebSocket push layer initialized");
    return this.io;
  }

  /**
   * Push telemetry data to a specific device room + fleet broadcast.
   */
  pushToDevice(deviceId: string, payload: any): void {
    if (!this.io) return;

    const startTime = Date.now();
    const enrichedPayload = {
      ...payload,
      deviceId,
      serverTimestamp: startTime,
    };

    // Push to device-specific room
    this.io.to(`device:${deviceId}`).emit("telemetry:update", enrichedPayload);

    // Global broadcast
    this.io.to("fleet:all").emit("telemetry:update", enrichedPayload);

    const latency = Date.now() - startTime;
    this._trackLatency(latency);
    this.metrics.totalPushes++;
  }

  /**
   * Broadcast a system-wide event.
   */
  broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
    this.metrics.totalBroadcasts++;
  }

  /**
   * Push a geofence event for a specific device.
   */
  pushGeofenceEvent(deviceId: string, geofenceEvent: any): void {
    if (!this.io) return;

    const payload = {
      ...geofenceEvent,
      deviceId,
      timestamp: Date.now(),
    };

    this.io.to(`device:${deviceId}`).emit("geofence:event", payload);
    this.io.to("fleet:all").emit("geofence:event", payload);
    this.metrics.totalPushes++;
  }

  /**
   * Buffer a message for a disconnected client.
   */
  private _bufferForClient(clientId: string, message: any): void {
    if (!this.clientBuffers.has(clientId)) {
      this.clientBuffers.set(clientId, []);
    }
    const buffer = this.clientBuffers.get(clientId)!;
    if (buffer.length >= this.maxBufferPerClient) {
      buffer.shift();
    }
    buffer.push(message);
  }

  /**
   * Flush buffered messages to a reconnected client.
   */
  private _flushBuffer(clientId: string, socket: Socket): void {
    const buffer = this.clientBuffers.get(clientId);
    if (buffer && buffer.length > 0) {
      logger.debug(`Flushing ${buffer.length} buffered messages to ${clientId}`);
      buffer.forEach((msg) => socket.emit("telemetry:update", msg));
      this.clientBuffers.delete(clientId);
    }
  }

  /**
   * Track push latency for SLA monitoring.
   */
  private _trackLatency(latencyMs: number): void {
    this.metrics._latencySum += latencyMs;
    this.metrics._latencyCount++;
    this.metrics.avgPushLatencyMs = Math.round(
      this.metrics._latencySum / this.metrics._latencyCount
    );
  }

  /**
   * Get WebSocket layer metrics.
   */
  getMetrics(): any {
    return {
      totalPushes: this.metrics.totalPushes,
      totalBroadcasts: this.metrics.totalBroadcasts,
      avgPushLatencyMs: this.metrics.avgPushLatencyMs,
      connectedClients: this.metrics.connectedClients,
    };
  }

  getConnectedCount(): number {
    return this.metrics.connectedClients;
  }
}

export const wsPushLayer = new WebSocketPushLayer();
