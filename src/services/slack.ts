import { App } from "@slack/bolt";
import { WebClient } from "@slack/web-api";

import type {
  SlackMessage,
  SlackMessageRaw,
  SlackChannelInfo,
  SlackUserInfo,
} from "@/types";
import type { SummarizerService } from "@/services/summarizer";

export class SlackService {
  private app: App;
  private client: WebClient;
  private recapHandler?: Pick<SummarizerService, "generateQuickRecap">;

  constructor(
    private readonly config: {
      slack: {
        botToken: string;
        signingSecret: string;
        appToken: string;
      };
      digest: {
        watchedChannels: string[];
        maxMessagesPerDigest: number;
      };
    }
  ) {
    this.app = new App({
      token: config.slack.botToken,
      signingSecret: config.slack.signingSecret,
      appToken: config.slack.appToken,
      socketMode: true,
    });

    this.client = new WebClient(config.slack.botToken);
    this.setupEventHandlers();
    this.setupCommands();
  }

  private setupEventHandlers(): void {
    // Listen to messages in watched channels
    this.app.message(async ({ message, say }) => {
      try {
        // Only process messages from watched channels
        const channelInfo = await this.client.conversations.info({
          channel: message.channel,
        });

        if (!channelInfo.ok || !channelInfo.channel) {
          return;
        }

        const channel = channelInfo.channel as SlackChannelInfo;

        if (this.config.digest.watchedChannels.includes(channel.name)) {
          const messageText = (message as any).text;
          console.log(
            `📝 Message received in #${channel.name}: ${messageText?.substring(
              0,
              50
            )}...`
          );

          // Store message for later processing
          this.onChannelMessage(message as SlackMessageRaw, channel.name);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    // Handle app mentions
    this.app.event("app_mention", async ({ event, say }) => {
      try {
        await say({
          text: `Hey <@${event.user}>! 👋 I'm watching this channel for daily summaries. Use \`/recap\` for a quick summary anytime!`,
          thread_ts: event.ts,
        });
      } catch (error) {
        console.error("Error handling app mention:", error);
      }
    });
  }

  public setRecapCommandHandler(
    handler: Pick<SummarizerService, "generateQuickRecap">
  ): void {
    this.recapHandler = handler;
  }

  private setupCommands(): void {
    // /recap command for instant summaries
    this.app.command("/recap", async ({ command, ack, respond }) => {
      await ack();

      try {
        if (!this.recapHandler) {
          throw new Error(
            "Recap handler not set. Please set it using setRecapCommandHandler."
          );
        }

        console.log(
          `📊 Recap requested by ${command.user_name} in #${command.channel_name}`
        );

        await respond({
          text: "🔄 Generating recap... This might take a moment.",
          response_type: "ephemeral",
        });

        // Get recent messages from the channel
        const messages = await this.getChannelMessages(command.channel_id, 50);

        if (messages.length === 0) {
          await respond({
            text: "📭 No recent messages found in this channel.",
            response_type: "ephemeral",
          });
          return;
        }

        // This will be handled by the summarizer service
        const recap = await this.recapHandler.generateQuickRecap(
          messages,
          command.channel_name
        );

        await respond({
          text: `📊 *Quick Recap for #${command.channel_name}*\n\n${recap}`,
          response_type: "in_channel",
        });
      } catch (error) {
        console.error("Error generating recap:", error);
        await respond({
          text: "❌ Sorry, I encountered an error generating the recap. Please try again later.",
          response_type: "ephemeral",
        });
      }
    });
  }

  async start(): Promise<void> {
    try {
      await this.app.start();
      console.log("🚀 Slack bot is running!");
    } catch (error) {
      console.error("❌ Failed to start Slack app:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.app.stop();
      console.log("Slack bot stopped");
    } catch (error) {
      console.error("Error stopping Slack app:", error);
    }
  }

  async getChannelMessages(
    channelId: string,
    limit: number = 100,
    oldest: string | null = null
  ): Promise<SlackMessage[]> {
    try {
      const params: any = {
        channel: channelId,
        limit: limit,
        inclusive: true,
      };

      if (oldest) {
        params.oldest = oldest;
      }

      const result = await this.client.conversations.history(params);

      if (!result.ok || !result.messages) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      // Filter out bot messages and system messages
      const messages = result.messages
        .filter(
          (msg): msg is SlackMessageRaw =>
            !msg.bot_id && msg.type === "message" && Boolean(msg.text)
        )
        .reverse() // Chronological order
        .map((msg): Omit<SlackMessage, "user"> & { user: string } => ({
          ts: msg.ts!,
          user: msg.user!,
          text: msg.text!,
          ...(msg.thread_ts && { thread_ts: msg.thread_ts }),
        }));

      // Get user names for better readability
      const enrichedMessages = await this.enrichMessagesWithUserNames(messages);

      return enrichedMessages;
    } catch (error) {
      console.error("Error fetching channel messages:", error);
      return [];
    }
  }

  // why has AI generated this function, seems similar to getChannelMessages?
  async fetchMessagesInRange(
    channelId: string,
    oldest: number,
    latest: number
  ): Promise<SlackMessage[]> {
    try {
      const allMessages: any[] = [];
      let cursor: string | undefined = undefined;
      let hasMore = true;

      while (
        hasMore &&
        allMessages.length < this.config.digest.maxMessagesPerDigest
      ) {
        const params: any = {
          channel: channelId,
          oldest: oldest.toString(),
          latest: latest.toString(),
          inclusive: true,
          limit: 200,
        };

        if (cursor) {
          params.cursor = cursor;
        }

        const result = await this.client.conversations.history(params);

        if (!result.ok || !result.messages) {
          throw new Error(`Slack API error: ${result.error}`);
        }

        // Filter and process messages
        const filteredMessages = result.messages
          .filter(
            (msg: any) => !msg.bot_id && msg.type === "message" && msg.text
          )
          .map((msg: any) => ({
            ts: msg.ts,
            user: msg.user,
            text: msg.text,
            thread_ts: msg.thread_ts,
          }));

        allMessages.push(...filteredMessages);

        if (result.has_more !== undefined) hasMore = result.has_more;
        cursor = result.response_metadata?.next_cursor;
      }

      // Enrich with user names and sort chronologically
      const enrichedMessages = await this.enrichMessagesWithUserNames(
        allMessages
      );
      return enrichedMessages.sort(
        (a, b) => parseFloat(a.ts) - parseFloat(b.ts)
      );
    } catch (error) {
      console.error("Error fetching messages in range:", error);
      return [];
    }
  }

  private async enrichMessagesWithUserNames(
    messages: (Omit<SlackMessage, "user"> & { user: string })[]
  ): Promise<SlackMessage[]> {
    try {
      const userIds = [...new Set(messages.map((msg) => msg.user))];
      const userInfoPromises = userIds.map((userId) =>
        this.client.users.info({ user: userId }).catch(() => null)
      );

      const userInfos = await Promise.all(userInfoPromises);
      const userMap: Record<string, string> = {};

      userInfos.forEach((info, index) => {
        if (info && info.ok && info.user) {
          const user = info.user as SlackUserInfo;
          userMap[userIds[index]!] = user.real_name || user.name;
        }
      });

      return messages.map(
        (msg): SlackMessage => ({
          ...msg,
          user: userMap[msg.user] || msg.user,
        })
      );
    } catch (error) {
      console.error("Error enriching messages with user names:", error);
      return messages.map(
        (msg): SlackMessage => ({
          ...msg,
          user: msg.user,
        })
      );
    }
  }

  async getChannelIdByName(channelName: string): Promise<string | null> {
    try {
      const result = await this.client.conversations.list({
        types: "public_channel,private_channel",
      });

      if (!result.ok || !result.channels) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      const channel = result.channels.find((ch) => ch.name === channelName);
      return channel ? channel.id! : null;
    } catch (error) {
      console.error("Error getting channel ID:", error);
      return null;
    }
  }

  async sendMessage(
    channelId: string,
    text: string,
    blocks: any[] | null = null
  ): Promise<any> {
    try {
      const params: any = {
        channel: channelId,
        text: text,
      };

      if (blocks) {
        params.blocks = blocks;
      }

      const result = await this.client.chat.postMessage(params);

      if (!result.ok) {
        throw new Error(`Failed to send message: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  // Event handler for when messages are received
  private onChannelMessage(
    message: SlackMessageRaw,
    channelName: string
  ): void {
    // This can be used to trigger real-time processing
    // For now, we'll just log it
    console.log(`💬 Message in #${channelName} stored for daily digest`);
  }

  async sendDailyDigest(
    channelId: string,
    digest: string,
    channelName: string
  ): Promise<void> {
    try {
      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `📊 Daily Digest for #${channelName}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: digest,
          },
        },
        {
          type: "divider",
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Generated on ${new Date().toLocaleDateString()} • Use \`/recap\` for instant summaries`,
            },
          ],
        },
      ];

      await this.sendMessage(
        channelId,
        `Daily Digest for #${channelName}`,
        blocks
      );
      console.log(`✅ Daily digest sent to #${channelName}`);
    } catch (error) {
      console.error(`Error sending daily digest to #${channelName}:`, error);
      throw error;
    }
  }
}
