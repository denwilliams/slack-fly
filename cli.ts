#!/usr/bin/env node

/**
 * Slack Fly CLI Tool
 * Provides command-line utilities for managing the application
 */

import { program } from "commander";
import axios from "axios";
import "dotenv/config";

const API_BASE = process.env.API_BASE || "http://localhost:3000";

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  redis: boolean;
  tasks: Record<string, any>;
}

interface DigestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface HistoryResponse {
  success: boolean;
  digests: Array<{
    date: string;
    messageCount: number;
    generatedAt: string;
    participants: Array<{ user: string; messageCount: number }>;
  }>;
}

interface ConfigResponse {
  watchedChannels: string[];
  schedule: string;
  maxMessages: number;
  environment: string;
}

program
  .name("slack-fly")
  .description("CLI tool for Slack Fly - Slack Summarizer")
  .version("1.0.0");

program
  .command("health")
  .description("Check application health")
  .action(async () => {
    try {
      const response = await axios.get<HealthResponse>(`${API_BASE}/health`);
      console.log("✅ Application is healthy");
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Health check failed:", errorMessage);
      process.exit(1);
    }
  });

program
  .command("digest")
  .description("Trigger daily digest generation")
  .option("-c, --channel <channel>", "specific channel to generate digest for")
  .option("-d, --date <date>", "date for digest (YYYY-MM-DD format)")
  .action(async (options: { channel?: string; date?: string }) => {
    try {
      const payload: { channel?: string; date?: string } = {};
      if (options.channel) payload.channel = options.channel;
      if (options.date) payload.date = options.date;

      const response = await axios.post<DigestResponse>(
        `${API_BASE}/api/digest/trigger`,
        payload
      );

      if (response.data.success) {
        console.log("✅ Digest generation triggered successfully");
        if (options.channel) {
          console.log(`📊 Generated digest for #${options.channel}`);
        } else {
          console.log("📊 Generated digests for all watched channels");
        }
      }
    } catch (error: any) {
      console.error(
        "❌ Failed to trigger digest:",
        error.response?.data?.error || error.message
      );
      process.exit(1);
    }
  });

program
  .command("history")
  .description("Get digest history for a channel")
  .requiredOption("-c, --channel <channel>", "channel name")
  .option("-d, --days <days>", "number of days to retrieve", "7")
  .action(async (options: { channel: string; days: string }) => {
    try {
      const response = await axios.get<HistoryResponse>(
        `${API_BASE}/api/digest/${options.channel}?days=${options.days}`
      );

      if (response.data.success && response.data.digests.length > 0) {
        console.log(
          `📊 Digest history for #${options.channel} (last ${options.days} days):\n`
        );

        response.data.digests.forEach((digest, index) => {
          console.log(
            `${index + 1}. ${digest.date} (${digest.messageCount} messages)`
          );
          console.log(
            `   Generated: ${new Date(digest.generatedAt).toLocaleString()}`
          );
          console.log(`   Participants: ${digest.participants.length}`);
          console.log("");
        });
      } else {
        console.log(`📭 No digest history found for #${options.channel}`);
      }
    } catch (error: any) {
      console.error(
        "❌ Failed to get history:",
        error.response?.data?.error || error.message
      );
      process.exit(1);
    }
  });

program
  .command("config")
  .description("Show current configuration")
  .action(async () => {
    try {
      const response = await axios.get<ConfigResponse>(
        `${API_BASE}/api/config`
      );
      console.log("⚙️  Current Configuration:");
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Failed to get config:", errorMessage);
      process.exit(1);
    }
  });

program
  .command("setup")
  .description("Run environment setup and validation")
  .action(async () => {
    try {
      console.log("🔧 Running setup validation...");
      // Dynamic import for setup module
      await import("./setup.js");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Setup failed:", errorMessage);
      process.exit(1);
    }
  });

program.parse();
