#!/usr/bin/env tsx

/**
 * Cache Service Demo
 * 
 * This script demonstrates how to use both Redis and Memory cache services
 * and shows the dynamic selection based on environment variables.
 */

import { ICacheService } from "../src/services/cache.interface";
import { RedisService } from "../src/services/redis";
import { MemoryCacheService } from "../src/services/memory-cache";
import cacheService from "../src/services/cache";

async function demonstrateCacheService(service: ICacheService, name: string) {
  console.log(`\n🧪 Testing ${name} Cache Service`);
  console.log("=====================================");

  try {
    // Connect
    await service.connect();
    console.log(`✅ Connected to ${name}`);

    // Test basic operations
    await service.set("demo:key1", "Hello World", 30);
    console.log("✅ Stored key1 with 30s expiration");

    const value1 = await service.get<string>("demo:key1");
    console.log(`✅ Retrieved key1: "${value1}"`);

    // Test complex data
    const complexData = {
      id: 123,
      name: "Test User",
      channels: ["general", "random"],
      timestamp: new Date().toISOString()
    };

    await service.set("demo:complex", complexData, 60);
    console.log("✅ Stored complex object with 60s expiration");

    const retrievedData = await service.get("demo:complex");
    console.log(`✅ Retrieved complex data:`, retrievedData);

    // Test existence
    const exists = await service.exists("demo:key1");
    console.log(`✅ Key exists check: ${exists}`);

    // Test channel message methods
    const mockMessages = [
      { ts: "1640995200.000100", user: "John", text: "Hello team!" },
      { ts: "1640995260.000200", user: "Jane", text: "Good morning!" }
    ];

    await service.storeChannelMessages("C123456", mockMessages, "2025-06-09");
    console.log("✅ Stored channel messages");

    const retrievedMessages = await service.getChannelMessages("C123456", "2025-06-09");
    console.log(`✅ Retrieved ${retrievedMessages?.length || 0} channel messages`);

    // Test digest methods
    const mockDigest = {
      channelName: "general",
      date: "2025-06-09",
      messageCount: 2,
      summary: "Team exchanged morning greetings",
      generatedAt: new Date().toISOString(),
      participants: [
        { user: "John", messageCount: 1 },
        { user: "Jane", messageCount: 1 }
      ]
    };

    await service.storeDigest("C123456", "2025-06-09", mockDigest);
    console.log("✅ Stored digest");

    const retrievedDigest = await service.getDigest("C123456", "2025-06-09");
    console.log(`✅ Retrieved digest for channel: ${retrievedDigest?.channelName}`);

    // Cleanup
    await service.del("demo:key1");
    await service.del("demo:complex");
    console.log("✅ Cleaned up test data");

  } catch (error) {
    console.error(`❌ Error testing ${name}:`, error);
  } finally {
    await service.disconnect();
    console.log(`✅ Disconnected from ${name}`);
  }
}

async function main() {
  console.log("🚀 Cache Service Demonstration");
  console.log("==============================");
  
  console.log(`Current CACHE_TYPE: ${process.env.CACHE_TYPE || 'redis (default)'}`);
  
  // Test the factory-created service
  console.log("\n🏭 Testing Factory-Created Service");
  await demonstrateCacheService(cacheService, "Factory");

  // Test Memory Cache directly
  console.log("\n🧠 Testing Memory Cache Directly");
  const memoryCache = new MemoryCacheService();
  await demonstrateCacheService(memoryCache, "Memory");

  // Only test Redis if it's available (skip if no Redis URL)
  if (process.env.REDIS_URL) {
    console.log("\n🔴 Testing Redis Cache Directly");
    const redisCache = new RedisService();
    await demonstrateCacheService(redisCache, "Redis");
  } else {
    console.log("\n⚠️  Skipping Redis test (REDIS_URL not set)");
  }

  console.log("\n🎉 Cache demonstration completed!");
  console.log("\n💡 Tips:");
  console.log("  • Set CACHE_TYPE=memory for development");
  console.log("  • Set CACHE_TYPE=redis for production");
  console.log("  • Memory cache is great for testing (no dependencies)");
  console.log("  • Redis cache is great for production (persistent & scalable)");
}

if (require.main === module) {
  main().catch(console.error);
}
