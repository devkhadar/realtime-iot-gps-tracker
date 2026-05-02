import logger from "../utils/logger";

/**
 * Mock Redis Client for local development.
 * Implements the minimal interface needed for the IoT pipeline.
 * Can be easily deleted later.
 */
class MockRedisClient {
  private store: Map<string, string> = new Map();

  async connect() {
    logger.info("Mock Redis connected (In-Memory)");
    return this;
  }

  async quit() {
    logger.info("Mock Redis disconnected");
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return "OK";
  }

  async mGet(keys: string[]) {
    return keys.map(k => this.store.get(k) || null);
  }

  async keys(pattern: string) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  async del(key: string | string[]) {
    const keysToDelete = Array.isArray(key) ? key : [key];
    keysToDelete.forEach(k => this.store.delete(k));
    return keysToDelete.length;
  }

  // Basic implementation of multi/exec for pipelining
  multi() {
    const operations: Array<() => Promise<any>> = [];
    const chain = {
      set: (key: string, value: string) => {
        operations.push(async () => this.set(key, value));
        return chain;
      },
      get: (key: string) => {
        operations.push(async () => this.get(key));
        return chain;
      },
      exec: async () => {
        const results = [];
        for (const op of operations) {
          results.push(await op());
        }
        return results;
      }
    };
    return chain;
  }

  on(event: string, callback: any) {
    // No-op for mock
  }
}

export const mockRedisClient = new MockRedisClient();
