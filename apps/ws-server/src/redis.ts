import Redis from "ioredis";

export class RedisClient {
  private sub: Redis;
  private pub: Redis;

  constructor(url: string) {
    this.sub = new Redis(url, { lazyConnect: true });
    this.pub = new Redis(url, { lazyConnect: true });

    this.sub.on("error", (err) => {
      console.error("[Redis Sub] Connection error:", err.message);
    });
    this.pub.on("error", (err) => {
      console.error("[Redis Pub] Connection error:", err.message);
    });
  }

  async subscribe(
    pattern: string,
    callback: (channel: string, message: string) => void,
  ): Promise<void> {
    try {
      await this.sub.connect();
      await this.sub.psubscribe(pattern);

      this.sub.on("pmessage", (_pattern, channel, message) => {
        callback(channel, message);
      });

      console.log(`[Redis] Subscribed to pattern: ${pattern}`);
    } catch (err) {
      // Redis not available — run without it in dev
      console.warn(
        `[Redis] Could not connect — running without pub/sub. Err: ${(err as Error).message}`,
      );
    }
  }

  async publish(channel: string, data: unknown): Promise<void> {
    try {
      if (this.pub.status !== "ready") {
        await this.pub.connect();
      }
      await this.pub.publish(channel, JSON.stringify(data));
    } catch {
      // Silent fail in dev if Redis is not running
    }
  }

  async disconnect(): Promise<void> {
    await this.sub.quit();
    await this.pub.quit();
  }
}
