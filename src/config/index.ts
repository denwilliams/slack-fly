import { config as configDotenv } from "dotenv";
import { AppConfig } from "@/types";

configDotenv();

function validateEnvironment(): void {
  const required = [
    "SLACK_BOT_TOKEN",
    "SLACK_SIGNING_SECRET",
    "OPENAI_API_KEY",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Validate environment on module load
validateEnvironment();

const config: AppConfig = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    appToken: process.env.SLACK_APP_TOKEN || "",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4-turbo-preview",
    maxTokens: parseInt(process.env.SUMMARY_MAX_TOKENS || "500"),
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  app: {
    port: parseInt(process.env.PORT || "3000"),
    nodeEnv: process.env.NODE_ENV || "development",
  },
  digest: {
    schedule: process.env.DIGEST_SCHEDULE || "0 17 * * 1-5", // 5 PM weekdays
    watchedChannels: process.env.WATCHED_CHANNELS
      ? process.env.WATCHED_CHANNELS.split(",").map((ch) => ch.trim())
      : ["standup", "project-x"],
    maxMessagesPerDigest: parseInt(
      process.env.MAX_MESSAGES_PER_DIGEST || "100"
    ),
  },
};

export default config;
