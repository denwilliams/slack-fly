import "dotenv/config";
import express, { Request, Response } from "express";
import { Server } from "http";

import { SummarizerService } from "@/services/summarizer";
import { SchedulerService } from "./utils/scheduler";

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
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

export class SlackFlyApp {
  private app: express.Application;
  private server?: Server;

  constructor(
    private readonly summarizerService: SummarizerService,
    private readonly schedulerService: Pick<
      SchedulerService,
      | "getTaskStatus"
      | "triggerDailyDigest"
      | "scheduleDigestGeneration"
      | "scheduleWeeklySummary"
      | "scheduleHealthCheck"
    >,
    private readonly config: {
      digest: {
        watchedChannels: string[];
        schedule: string;
        maxMessagesPerDigest: number;
      };
      app: {
        port: number;
        nodeEnv: string;
      };
    }
  ) {
    this.app = express();

    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response<HealthResponse>) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require("../../package.json").version,
        tasks: this.schedulerService.getTaskStatus(),
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
            const digest = await this.summarizerService.generateDailyDigest(
              channel,
              date || null
            );
            res.json({ success: true, data: digest });
          } else {
            await this.schedulerService.triggerDailyDigest(
              this.summarizerService
            );
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

          const digests = await this.summarizerService.getDigestHistory(
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
        watchedChannels: this.config.digest.watchedChannels,
        schedule: this.config.digest.schedule,
        maxMessages: this.config.digest.maxMessagesPerDigest,
        environment: this.config.app.nodeEnv,
      });
    });

    // Root endpoint
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "Slack Fly",
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

  async start(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Start HTTP server
      this.server = this.app.listen(this.config.app.port, () => {
        console.log(`🌐 HTTP server running on port ${this.config.app.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server?.close(() => {
          console.log("✅ HTTP server closed");
          resolve();
        });
      });
    }
  }
}
