import "dotenv/config";
import express, { Request, Response } from "express";
import { Server } from "http";
import config from "@/config";
import slackService from "@/services/slack";
import redisService from "@/services/redis";
import { summarizerService } from "@/services/summarizer";
import schedulerService from "@/utils/scheduler";
import Helpers from "@/utils/helpers";

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  redis: boolean;
  tasks: Record<string, any>;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface DigestTriggerRequest {
  channel?: string;
  date?: string;
}

class MeetingWhispererApp {
  private app: express.Application;
  private server?: Server;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();

    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.setupRoutes();
    this.setupGracefulShutdown();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response<HealthResponse>) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require("../../package.json").version,
        redis: redisService.isConnected,
        tasks: schedulerService.getTaskStatus(),
      });
    });

    // Manual digest trigger (for testing)
    this.app.post(
      "/api/digest/trigger",
      async (
        req: Request<{}, ApiResponse, DigestTriggerRequest>,
        res: Response<ApiResponse>
      ) => {
        try {
          const { channel, date } = req.body;
          if (channel) {
            const digest = await summarizerService.generateDailyDigest(
              channel,
              date || null
            );
            res.json({ success: true, data: digest });
          } else {
            await schedulerService.triggerDailyDigest(summarizerService);
            res.json({
              success: true,
              message: "Daily digest generation triggered for all channels",
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          res.status(500).json({
            success: false,
            error: errorMessage,
          });
        }
      }
    );

    // Get digest history
    this.app.get(
      "/api/digest/:channel",
      async (req: Request, res: Response<ApiResponse>) => {
        try {
          const { channel } = req.params;
          const { days = "7" } = req.query;

          if (!channel) {
            res.status(400).json({
              success: false,
              error: "Channel parameter is required",
            });
            return;
          }

          const digests = await summarizerService.getDigestHistory(
            channel,
            parseInt(days as string)
          );
          res.json({ success: true, data: digests });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          res.status(500).json({
            success: false,
            error: errorMessage,
          });
        }
      }
    );

    // Configuration endpoint
    this.app.get("/api/config", (req: Request, res: Response) => {
      res.json({
        watchedChannels: config.digest.watchedChannels,
        schedule: config.digest.schedule,
        maxMessages: config.digest.maxMessagesPerDigest,
        environment: config.app.nodeEnv,
      });
    });

    // Root endpoint
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "Meeting Whisperer",
        description: "Real-Time Slack Summarizer",
        version: require("../../package.json").version,
        status: "running",
        endpoints: {
          health: "/health",
          triggerDigest: "POST /api/digest/trigger",
          getDigests: "GET /api/digest/:channel",
          config: "/api/config",
        },
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;

      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      this.isShuttingDown = true;

      try {
        // Stop scheduled tasks
        schedulerService.stopAllTasks();

        // Stop Slack service
        await slackService.stop();

        // Disconnect from Redis
        await redisService.disconnect();

        // Close Express server
        if (this.server) {
          this.server.close(() => {
            console.log("✅ HTTP server closed");
          });
        }

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

  async start(): Promise<void> {
    try {
      console.log("🚀 Starting Meeting Whisperer...");

      // Validate environment
      Helpers.validateEnvironment();

      // Connect to Redis
      await redisService.connect();

      // Start Slack service
      await slackService.start();

      // Schedule digest generation
      schedulerService.scheduleDigestGeneration(summarizerService);

      // Optional: Schedule weekly summary
      if (config.app.nodeEnv === "production") {
        schedulerService.scheduleWeeklySummary(summarizerService);
      }

      // Schedule health checks
      schedulerService.scheduleHealthCheck();

      // Start HTTP server
      this.server = this.app.listen(config.app.port, () => {
        console.log(`🌐 HTTP server running on port ${config.app.port}`);
        console.log(`📊 Daily digest schedule: ${config.digest.schedule}`);
        console.log(
          `📺 Watching channels: ${config.digest.watchedChannels.join(", ")}`
        );
        console.log("✅ Meeting Whisperer is ready!");
      });
    } catch (error) {
      console.error("❌ Failed to start Meeting Whisperer:", error);
      process.exit(1);
    }
  }
}

// Start the application
if (require.main === module) {
  const app = new MeetingWhispererApp();
  app.start();
}

export default MeetingWhispererApp;
