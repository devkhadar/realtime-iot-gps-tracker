import logger from "../utils/logger";

/**
 * @interface DeviceState
 */
export interface DeviceState {
  deviceId: string;
  status: "online" | "offline";
  firstSeen: number;
  lastSeen: number;
  messageCount: number;
  rateLimitWindow: number;
  rateLimitCount: number;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSpeed: number;
}

interface RegistryOptions {
  offlineThresholdMs?: number;
  rateLimitPerSecond?: number;
  cleanupIntervalMs?: number;
}

export class DeviceRegistry {
  private offlineThresholdMs: number;
  private rateLimitPerSecond: number;
  private cleanupIntervalMs: number;
  private devices: Map<string, DeviceState>;
  private metrics = {
    totalMessagesIngested: 0,
    totalMessagesThrottled: 0,
    totalDevicesRegistered: 0,
    peakConcurrentDevices: 0,
  };
  private _cleanupTimer: NodeJS.Timeout | null;

  constructor(options: RegistryOptions = {}) {
    this.offlineThresholdMs = options.offlineThresholdMs || 60000;
    this.rateLimitPerSecond = options.rateLimitPerSecond || 10;
    this.cleanupIntervalMs = options.cleanupIntervalMs || 30000;
    this.devices = new Map();

    this._cleanupTimer = setInterval(() => this._cleanup(), this.cleanupIntervalMs);
  }

  heartbeat(deviceId: string, metadata: any = {}): boolean {
    const now = Date.now();
    this.metrics.totalMessagesIngested++;

    if (!this.devices.has(deviceId)) {
      this.devices.set(deviceId, {
        deviceId,
        status: "online",
        firstSeen: now,
        lastSeen: now,
        messageCount: 1,
        rateLimitWindow: now,
        rateLimitCount: 1,
        lastLatitude: metadata.latitude || null,
        lastLongitude: metadata.longitude || null,
        lastSpeed: metadata.speed || 0,
      });
      this.metrics.totalDevicesRegistered++;
      this._updatePeakDevices();
      logger.info(`Device registered: ${deviceId}`, { deviceId });
      return true;
    }

    const device = this.devices.get(deviceId)!;

    if (now - device.rateLimitWindow >= 1000) {
      device.rateLimitWindow = now;
      device.rateLimitCount = 0;
    }

    device.rateLimitCount++;
    if (device.rateLimitCount > this.rateLimitPerSecond) {
      this.metrics.totalMessagesThrottled++;
      logger.warn(`Rate limit exceeded for device ${deviceId}`, {
        deviceId,
        count: device.rateLimitCount,
        limit: this.rateLimitPerSecond,
      });
      return false;
    }

    device.status = "online";
    device.lastSeen = now;
    device.messageCount++;
    device.lastLatitude = metadata.latitude ?? device.lastLatitude;
    device.lastLongitude = metadata.longitude ?? device.lastLongitude;
    device.lastSpeed = metadata.speed ?? device.lastSpeed;

    return true;
  }

  getDevice(deviceId: string): DeviceState | null {
    return this.devices.get(deviceId) || null;
  }

  getOnlineDevices(): DeviceState[] {
    const now = Date.now();
    const online: DeviceState[] = [];
    for (const device of this.devices.values()) {
      if (now - device.lastSeen < this.offlineThresholdMs) {
        online.push(device);
      }
    }
    return online;
  }

  getOnlineCount(): number {
    const now = Date.now();
    let count = 0;
    for (const device of this.devices.values()) {
      if (now - device.lastSeen < this.offlineThresholdMs) count++;
    }
    return count;
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      currentOnlineDevices: this.getOnlineCount(),
      totalTrackedDevices: this.devices.size,
      rateLimitPerSecond: this.rateLimitPerSecond,
      offlineThresholdMs: this.offlineThresholdMs,
    };
  }

  markOffline(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = "offline";
      logger.info(`Device marked offline: ${deviceId}`, { deviceId });
    }
  }

  private _cleanup(): void {
    const now = Date.now();
    let staleCount = 0;
    for (const [deviceId, device] of this.devices) {
      if (now - device.lastSeen > this.offlineThresholdMs * 5) {
        this.devices.delete(deviceId);
        staleCount++;
      } else if (now - device.lastSeen > this.offlineThresholdMs) {
        device.status = "offline";
      }
    }
    if (staleCount > 0) {
      logger.debug(`Cleaned up ${staleCount} stale devices`);
    }
  }

  private _updatePeakDevices(): void {
    const currentCount = this.devices.size;
    if (currentCount > this.metrics.peakConcurrentDevices) {
      this.metrics.peakConcurrentDevices = currentCount;
    }
  }

  shutdown(): void {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
}

export const deviceRegistry = new DeviceRegistry({
  offlineThresholdMs: parseInt(process.env.DEVICE_OFFLINE_THRESHOLD_MS || "60000") || 60000,
  rateLimitPerSecond: parseInt(process.env.DEVICE_RATE_LIMIT_PER_SEC || "10") || 10,
});
