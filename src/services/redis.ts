import { createClient, RedisClientType } from "redis";
import { ChannelDigest, SlackMessage } from "@/types";
import { ICacheService } from "./cache.interface";

export class RedisService implements ICacheService {
  private client: RedisClientType | null = null;
  public isConnected: boolean = false;

  constructor(private readonly config: { redis: { url: string } }) {}

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: this.config.redis.url,
      });

      this.client.on("error", (err: Error) => {
        console.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("✅ Redis connected successfully");
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log("Redis disconnected");
    }
  }

  async set(
    key: string,
    value: any,
    expiration: number | null = null
  ): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) return false;

      const serializedValue = JSON.stringify(value);
      if (expiration) {
        await this.client.setEx(key, expiration, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      console.error("Redis SET error:", error);
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected || !this.client) return null;

      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) return false;

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("Redis DEL error:", error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) return false;

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis EXISTS error:", error);
      return false;
    }
  }

  // Store channel messages with timestamp
  async storeChannelMessages(
    channelId: string,
    messages: SlackMessage[],
    date: string,
    expiration: number = 86400 // Default 24 hours
  ): Promise<boolean> {
    const key = `channel:${channelId}:${date}`;
    return await this.set(key, messages, expiration);
  }

  // Get channel messages for a specific date
  async getChannelMessages(
    channelId: string,
    date: string
  ): Promise<SlackMessage[] | null> {
    const key = `channel:${channelId}:${date}`;
    return await this.get<SlackMessage[]>(key);
  }

  // Store digest summary
  async storeDigest(
    channelId: string,
    date: string,
    digest: ChannelDigest
  ): Promise<boolean> {
    const key = `digest:${channelId}:${date}`;
    return await this.set(key, digest, 604800); // 7 days expiration
  }

  // Get digest summary
  async getDigest(
    channelId: string,
    date: string
  ): Promise<ChannelDigest | null> {
    const key = `digest:${channelId}:${date}`;
    return await this.get<ChannelDigest>(key);
  }
}
