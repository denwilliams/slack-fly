import openaiService from "@/services/openai";
import slackService from "@/services/slack";
import redisService from "@/services/redis";
import config from "@/config";
import type { SlackMessage, ChannelDigest, DigestParticipant } from "@/types";

class SummarizerService {
  private isProcessing: boolean = false;

  async generateDailyDigest(
    channelName: string,
    date: string | null = null
  ): Promise<ChannelDigest | null> {
    if (this.isProcessing) {
      console.log("⏳ Digest generation already in progress, skipping...");
      return null;
    }

    try {
      this.isProcessing = true;
      const targetDate = date || new Date().toISOString().split("T")[0]!;

      console.log(
        `🔄 Generating daily digest for #${channelName} on ${targetDate}`
      );

      // Check if digest already exists in cache
      const channelId = await slackService.getChannelIdByName(channelName);
      if (!channelId) {
        console.log(`❌ Channel #${channelName} not found`);
        return null;
      }

      const cachedDigest = await redisService.getDigest(channelId, targetDate);
      if (cachedDigest) {
        console.log(`✅ Using cached digest for #${channelName}`);
        return cachedDigest;
      }

      // Get messages for the day
      const messages = await this.getMessagesForDate(channelId, targetDate);

      if (messages.length === 0) {
        console.log(
          `📭 No messages found for #${channelName} on ${targetDate}`
        );
        return null;
      }

      console.log(
        `📝 Processing ${messages.length} messages from #${channelName}`
      );

      // Generate summary using OpenAI
      const summary = await openaiService.generateSummary(
        messages,
        channelName
      );

      // Create digest object
      const digest: ChannelDigest = {
        channelName,
        date: targetDate,
        messageCount: messages.length,
        summary,
        generatedAt: new Date().toISOString(),
        participants: this.extractParticipants(messages),
      };

      // Cache the digest
      await redisService.storeDigest(channelId, targetDate, digest);

      console.log(`✅ Daily digest generated for #${channelName}`);
      return digest;
    } catch (error) {
      console.error(
        `❌ Error generating daily digest for #${channelName}:`,
        error
      );
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async generateQuickRecap(
    messages: SlackMessage[],
    channelName: string
  ): Promise<string> {
    try {
      console.log(`🔄 Generating quick recap for #${channelName}`);

      if (messages.length === 0) {
        return "📭 No recent messages found in this channel.";
      }

      const recap = await openaiService.generateQuickRecap(
        messages,
        channelName
      );

      console.log(`✅ Quick recap generated for #${channelName}`);
      return recap;
    } catch (error) {
      console.error(
        `❌ Error generating quick recap for #${channelName}:`,
        error
      );
      throw error;
    }
  }

  async getMessagesForDate(
    channelId: string,
    date: string
  ): Promise<SlackMessage[]> {
    try {
      // Check cache first
      const cachedMessages = await redisService.getChannelMessages(
        channelId,
        date
      );
      if (cachedMessages) {
        console.log(`📦 Using cached messages for ${date}`);
        return cachedMessages;
      }

      // Calculate timestamp range for the date
      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");

      const oldest = Math.floor(startOfDay.getTime() / 1000);
      const latest = Math.floor(endOfDay.getTime() / 1000);

      // Fetch messages from Slack
      const messages = await this.fetchMessagesInRange(
        channelId,
        oldest,
        latest
      );

      // Cache the messages with appropriate expiration
      if (messages.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const isToday = date === today;

        // Use shorter cache for incomplete days (1 hour), longer for complete days (24 hours)
        const cacheExpiration = isToday ? 3600 : 86400; // 1 hour vs 24 hours

        await redisService.storeChannelMessages(
          channelId,
          messages,
          date,
          cacheExpiration
        );

        console.log(
          `💾 Cached messages for ${date} (${
            isToday ? "1 hour" : "24 hours"
          } TTL)`
        );
      }

      return messages;
    } catch (error) {
      console.error("Error getting messages for date:", error);
      return [];
    }
  }

  private async fetchMessagesInRange(
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
        allMessages.length < config.digest.maxMessagesPerDigest
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

        // Access the Slack client directly from slackService
        const slackClient = (slackService as any).client;
        const result = await slackClient.conversations.history(params);

        if (!result.ok) {
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

        hasMore = result.has_more;
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
    messages: Omit<SlackMessage, "user">[]
  ): Promise<SlackMessage[]> {
    // For now, we'll use the slack service method
    // In a real implementation, we might want to extract this logic
    return messages as SlackMessage[]; // Temporary cast - should be properly implemented
  }

  private extractParticipants(messages: SlackMessage[]): DigestParticipant[] {
    const participants: Record<string, number> = {};

    messages.forEach((msg) => {
      if (participants[msg.user]) {
        participants[msg.user]!++;
      } else {
        participants[msg.user] = 1;
      }
    });

    // Sort by message count
    return Object.entries(participants)
      .sort(([, a], [, b]) => b - a)
      .map(([user, count]) => ({ user, messageCount: count }));
  }

  async generateAndSendDailyDigests(): Promise<void> {
    console.log("🌅 Starting daily digest generation...");

    const promises = config.digest.watchedChannels.map(async (channelName) => {
      try {
        const digest = await this.generateDailyDigest(channelName);

        if (digest) {
          const channelId = await slackService.getChannelIdByName(channelName);
          if (channelId) {
            await slackService.sendDailyDigest(
              channelId,
              digest.summary,
              channelName
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ Failed to generate digest for #${channelName}:`,
          error
        );
      }
    });

    await Promise.all(promises);
    console.log("✅ Daily digest generation completed");
  }

  async getDigestHistory(
    channelName: string,
    days: number = 7
  ): Promise<ChannelDigest[]> {
    try {
      const channelId = await slackService.getChannelIdByName(channelName);
      if (!channelId) return [];

      const digests: ChannelDigest[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0]!;

        const digest = await redisService.getDigest(channelId, dateStr);
        if (digest) {
          digests.push(digest);
        }
      }

      return digests.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error("Error getting digest history:", error);
      return [];
    }
  }
}

const summarizerService = new SummarizerService();

export { summarizerService };
