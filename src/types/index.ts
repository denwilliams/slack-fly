export interface AppConfig {
  slack: SlackConfig;
  openai: OpenAIConfig;
  redis: RedisConfig;
  app: ApplicationConfig;
  digest: DigestConfig;
}

export interface SlackConfig {
  botToken: string;
  signingSecret: string;
  appToken: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface RedisConfig {
  url: string;
}

export interface ApplicationConfig {
  port: number;
  nodeEnv: string;
}

export interface DigestConfig {
  schedule: string;
  watchedChannels: string[];
  maxMessagesPerDigest: number;
}

export interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  thread_ts?: string;
}

export interface EnrichedSlackMessage extends SlackMessage {
  user: string; // Now contains the actual user name instead of ID
}

export interface Participant {
  user: string;
  messageCount: number;
}

export interface ChannelDigest {
  channelName: string;
  date: string;
  messageCount: number;
  summary: string;
  generatedAt: string;
  participants: Participant[];
}

export interface HealthStatus {
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
  version: string;
  redis: boolean;
  tasks: Record<string, TaskStatus>;
}

export interface TaskStatus {
  running: boolean;
  destroyed: boolean;
}

export interface DigestTriggerRequest {
  channel?: string;
  date?: string;
}

export interface DigestHistoryResponse {
  success: boolean;
  digests: ChannelDigest[];
}

export interface ConfigResponse {
  watchedChannels: string[];
  schedule: string;
  maxMessages: number;
  environment: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RateLimiter {
  isAllowed: (key: string) => boolean;
  getRemainingRequests: (key: string) => number;
}

export interface MentionExtraction {
  users: string[];
  channels: string[];
  links: string[];
}

export interface TimestampFormatted {
  date: string;
  time: string;
  iso: string;
  relative: string;
}

// Slack API related interfaces
export interface SlackMessageRaw {
  ts?: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  channel: string;
  type?: string;
  bot_id?: string;
}

export interface SlackChannelInfo {
  id: string;
  name: string;
  is_channel?: boolean;
  is_private?: boolean;
}

export interface SlackUserInfo {
  id: string;
  name: string;
  real_name?: string;
}

// Service interface for dependency injection
export interface SummarizerService {
  generateDailyDigest(
    channelName: string,
    date?: string | null
  ): Promise<ChannelDigest | null>;
  generateQuickRecap(
    messages: SlackMessage[],
    channelName: string
  ): Promise<string>;
  generateAndSendDailyDigests(): Promise<void>;
  getDigestHistory(
    channelName: string,
    days?: number
  ): Promise<ChannelDigest[]>;
}

// Rename to avoid confusion with the main Participant interface
export interface DigestParticipant {
  user: string;
  messageCount: number;
}
