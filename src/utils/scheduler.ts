import * as cron from "node-cron";
import type { SummarizerService } from "@/types";

interface TaskStatus {
  running: boolean;
  destroyed: boolean;
}

interface SchedulerStatus {
  [taskName: string]: TaskStatus;
}

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private readonly config: {
      digest: {
        schedule: string;
        watchedChannels: string[];
      };
    }
  ) {}

  scheduleDigestGeneration(
    summarizerService: SummarizerService
  ): cron.ScheduledTask {
    const task = cron.schedule(
      this.config.digest.schedule,
      async () => {
        console.log("⏰ Scheduled daily digest generation triggered");
        try {
          await summarizerService.generateAndSendDailyDigests();
        } catch (error) {
          console.error("❌ Error in scheduled digest generation:", error);
        }
      },
      {
        scheduled: false,
        timezone: "America/New_York", // Adjust timezone as needed
      }
    );

    this.tasks.set("dailyDigest", task);

    // Start the task
    task.start();

    console.log(`⏰ Daily digest scheduled: ${this.config.digest.schedule}`);
    console.log(
      `📺 Watching channels: ${this.config.digest.watchedChannels.join(", ")}`
    );

    return task;
  }

  // Optional: Schedule weekly summary
  scheduleWeeklySummary(
    summarizerService: SummarizerService
  ): cron.ScheduledTask {
    const task = cron.schedule(
      "0 17 * * 5",
      async () => {
        // Friday 5 PM
        console.log("📊 Generating weekly summary...");
        try {
          for (const channelName of this.config.digest.watchedChannels) {
            const digests = await summarizerService.getDigestHistory(
              channelName,
              7
            );
            if (digests.length > 0) {
              console.log(
                `📈 Weekly summary for #${channelName}: ${digests.length} daily digests`
              );
              // Could generate a weekly summary here
            }
          }
        } catch (error) {
          console.error("❌ Error in weekly summary generation:", error);
        }
      },
      {
        scheduled: false,
        timezone: "America/New_York",
      }
    );

    this.tasks.set("weeklySummary", task);
    task.start();

    console.log("📊 Weekly summary scheduled for Fridays at 5 PM");
    return task;
  }

  // Health check schedule
  scheduleHealthCheck(): cron.ScheduledTask {
    const task = cron.schedule(
      "*/15 * * * *",
      () => {
        // Every 15 minutes
        const now = new Date();
        console.log(`💓 Health check: ${now.toISOString()} - Service running`);
      },
      {
        scheduled: false,
      }
    );

    this.tasks.set("healthCheck", task);
    task.start();

    return task;
  }

  stopAllTasks(): void {
    console.log("🛑 Stopping all scheduled tasks...");
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`✅ Stopped task: ${name}`);
    }
    this.tasks.clear();
  }

  getTaskStatus(): SchedulerStatus {
    const status: SchedulerStatus = {};
    for (const [name, task] of this.tasks) {
      // Use type assertion to access properties that might exist at runtime
      const taskAny = task as any;
      status[name] = {
        running: taskAny.running ?? false,
        destroyed: taskAny.destroyed ?? false,
      };
    }
    return status;
  }

  // Manual trigger for testing
  async triggerDailyDigest(
    summarizerService: SummarizerService
  ): Promise<void> {
    console.log("🔧 Manually triggering daily digest generation...");
    try {
      await summarizerService.generateAndSendDailyDigests();
      console.log("✅ Manual digest generation completed");
    } catch (error) {
      console.error("❌ Manual digest generation failed:", error);
      throw error;
    }
  }
}
