import { SlackFlyApp } from ".";
import { config } from "@/config";
import { RedisService } from "@/services/redis";
import { SlackService } from "@/services/slack";
import { SummarizerService } from "@/services/summarizer";
import { Helpers } from "@/utils/helpers";
import { SchedulerService } from "@/utils/scheduler";
import { OpenAIService } from "./services/openai";
import { MemoryCacheService } from "./services/memory-cache";

async function main() {
  console.log("🚀 Starting Slack Fly...");

  // Validate environment
  Helpers.validateEnvironment();

  const cacheService = createCacheService();
  await cacheService.connect();

  const slackService = new SlackService(config);
  await slackService.start();

  const openaiService = new OpenAIService(config);

  const summarizerService = new SummarizerService(
    cacheService,
    slackService,
    openaiService,
    config
  );

  const schedulerService = new SchedulerService(config);
  // Schedule digest generation
  schedulerService.scheduleDigestGeneration(summarizerService);
  // Optional: Schedule weekly summary
  if (config.app.isProduction) {
    schedulerService.scheduleWeeklySummary(summarizerService);
  }
  // Schedule health checks
  schedulerService.scheduleHealthCheck();

  const app = new SlackFlyApp(summarizerService, schedulerService, config);
  await app.start();

  console.log(`📊 Daily digest schedule: ${config.digest.schedule}`);
  console.log(
    `📺 Watching channels: ${config.digest.watchedChannels.join(", ")}`
  );
  console.log("✅ Slack Fly is ready!");

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;

    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    isShuttingDown = true;

    try {
      // Close app server
      await app.stop();

      // Stop scheduled tasks
      schedulerService.stopAllTasks();

      // Stop Slack service
      await slackService.stop();

      // Disconnect from cache service
      await cacheService.disconnect();

      console.log("✅ Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    shutdown("UNCAUGHT_EXCEPTION");
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    shutdown("UNHANDLED_REJECTION");
  });
}

function createCacheService(): RedisService | MemoryCacheService {
  switch (config.app.cacheType) {
    case "redis":
      console.log("🔴 Using Redis cache service");
      return new RedisService(config);

    case "memory":
    default:
      console.log("🧠 Using in-memory cache service");
      return new MemoryCacheService();
  }
}

main().catch((error) => {
  console.error("❌ Failed to start Slack Fly:", error);
  process.exit(1);
});
