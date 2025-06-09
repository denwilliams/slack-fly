import { ICacheService } from "./cache.interface";
import { ChannelDigest, SlackMessage } from "@/types";

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  public isConnected: boolean = false;

  async connect(): Promise<void> {
    try {
      this.isConnected = true;

      // Start cleanup timer to remove expired entries every 5 minutes
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000); // 5 minutes

      console.log("✅ Memory cache connected successfully");
    } catch (error) {
      console.error("❌ Failed to initialize memory cache:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cache.clear();
    this.isConnected = false;
    console.log("Memory cache disconnected");
  }

  async set(
    key: string,
    value: any,
    expiration: number | null = null
  ): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const expiresAt = expiration ? Date.now() + expiration * 1000 : null;

      this.cache.set(key, {
        value: JSON.parse(JSON.stringify(value)), // Deep clone to avoid reference issues
        expiresAt,
      });

      return true;
    } catch (error) {
      console.error("Memory cache SET error:", error);
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) return null;

      const entry = this.cache.get(key);
      if (!entry) return null;

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      return JSON.parse(JSON.stringify(entry.value)) as T; // Deep clone
    } catch (error) {
      console.error("Memory cache GET error:", error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error("Memory cache DEL error:", error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const entry = this.cache.get(key);
      if (!entry) return false;

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Memory cache EXISTS error:", error);
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

  // Utility method to clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats (useful for debugging/monitoring)
  getCacheStats() {
    return {
      totalKeys: this.cache.size,
      isConnected: this.isConnected,
    };
  }
}
