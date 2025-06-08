#!/usr/bin/env node

/**
 * Setup script for Meeting Whisperer
 * Run this script to validate your environment and test connections
 */

import "dotenv/config";
import redisService from "@/services/redis";
import { WebClient } from "@slack/web-api";
import OpenAI from "openai";
import * as fs from "fs";

async function validateSlackConnection(): Promise<boolean> {
  console.log("🔍 Testing Slack connection...");

  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error("SLACK_BOT_TOKEN is not set");
  }

  const client = new WebClient(process.env.SLACK_BOT_TOKEN);

  try {
    const auth = await client.auth.test();
    console.log(`✅ Slack connected as: ${auth.user} (${auth.team})`);
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Slack connection failed: ${errorMessage}`);
  }
}

async function validateOpenAI(): Promise<boolean> {
  console.log("🔍 Testing OpenAI connection...");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const models = await openai.models.list();
    console.log(`✅ OpenAI connected - ${models.data.length} models available`);
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`OpenAI connection failed: ${errorMessage}`);
  }
}

async function validateRedis(): Promise<boolean> {
  console.log("🔍 Testing Redis connection...");

  try {
    await redisService.connect();
    await redisService.set("test-key", "test-value", 10);
    const value = await redisService.get<string>("test-key");

    if (value === "test-value") {
      console.log("✅ Redis connected and working");
      await redisService.del("test-key");
      return true;
    } else {
      throw new Error("Redis read/write test failed");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Redis connection failed: ${errorMessage}`);
  }
}

async function main(): Promise<void> {
  console.log("🚀 Meeting Whisperer - Environment Setup\n");

  try {
    // Check environment file
    if (!fs.existsSync(".env")) {
      console.log(
        "⚠️  .env file not found. Please copy .env.example to .env and configure it."
      );
      process.exit(1);
    }

    // Validate all connections
    await validateSlackConnection();
    await validateOpenAI();
    await validateRedis();

    console.log("\n✅ All connections validated successfully!");
    console.log("\n🎉 Meeting Whisperer is ready to run!");
    console.log("\nNext steps:");
    console.log(
      "  1. Make sure your Slack bot is added to the channels you want to monitor"
    );
    console.log(
      "  2. Run: npm start (production) or npm run dev (development)"
    );
    console.log("  3. Test the /recap command in your Slack channels");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`\n❌ Setup failed: ${errorMessage}`);
    console.log("\nPlease check your .env configuration and try again.");
    process.exit(1);
  } finally {
    if (redisService.isConnected) {
      await redisService.disconnect();
    }
  }
}

if (require.main === module) {
  main();
}

export { validateSlackConnection, validateOpenAI, validateRedis };
