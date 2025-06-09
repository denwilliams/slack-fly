import * as crypto from "crypto";

interface FormattedTimestamp {
  date: string;
  time: string;
  iso: string;
  relative: string;
}

interface MessageMentions {
  users: string[];
  channels: string[];
  links: string[];
}

interface RateLimiter {
  isAllowed: (key: string) => boolean;
  getRemainingRequests: (key: string) => number;
}

export class Helpers {
  // Format timestamp to readable date/time
  static formatTimestamp(timestamp: string): FormattedTimestamp {
    const date = new Date(parseFloat(timestamp) * 1000);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      iso: date.toISOString(),
      relative: this.getRelativeTime(date),
    };
  }

  // Get relative time (e.g., "2 hours ago")
  static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    if (diffInDays < 7)
      return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  }

  // Clean and sanitize message text
  static sanitizeMessage(text: string): string {
    if (!text) return "";

    // Remove Slack-specific formatting
    return text
      .replace(/<@U\w+>/g, "@user") // Replace user mentions
      .replace(/<#C\w+\|(\w+)>/g, "#$1") // Replace channel mentions
      .replace(/<https?:\/\/[^>|]+\|([^>]+)>/g, "$1") // Replace links with display text
      .replace(/<https?:\/\/[^>]+>/g, "[link]") // Replace raw links
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
  }

  // Extract mentions from message
  static extractMentions(text: string): MessageMentions {
    if (!text) {
      return {
        users: [],
        channels: [],
        links: [],
      };
    }

    const mentions: MessageMentions = {
      users: [],
      channels: [],
      links: [],
    };

    // Extract user mentions
    const userMentions = text.match(/<@U\w+>/g);
    if (userMentions) {
      mentions.users = userMentions.map((mention) => mention.slice(2, -1));
    }

    // Extract channel mentions
    const channelMentions = text.match(/<#C\w+\|(\w+)>/g);
    if (channelMentions) {
      mentions.channels = channelMentions
        .map((mention) => {
          const match = mention.match(/<#C\w+\|(\w+)>/);
          return match ? match[1] : null;
        })
        .filter((channel): channel is string => Boolean(channel));
    }

    // Extract links
    const links = text.match(/<https?:\/\/[^>]+>/g);
    if (links) {
      mentions.links = links.map((link) => link.slice(1, -1));
    }

    return mentions;
  }

  // Generate a hash for caching
  static generateHash(data: any): string {
    return crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
  }

  // Truncate text to specified length
  static truncateText(text: string, maxLength: number = 100): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }

  // Check if text contains action items keywords
  static containsActionItems(text: string): boolean {
    const actionKeywords = [
      "todo",
      "action",
      "task",
      "assign",
      "responsible",
      "deadline",
      "due",
      "follow up",
      "next steps",
      "should",
      "will",
      "need to",
      "must",
      "required",
    ];

    const lowerText = text.toLowerCase();
    return actionKeywords.some((keyword) => lowerText.includes(keyword));
  }

  // Extract potential action items from text
  static extractActionItems(text: string): string[] {
    if (!text) return [];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const actionItems: string[] = [];

    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (this.containsActionItems(trimmed)) {
        actionItems.push(trimmed);
      }
    });

    return actionItems;
  }

  // Format message count
  static formatMessageCount(count: number): string {
    if (count === 0) return "No messages";
    if (count === 1) return "1 message";
    return `${count} messages`;
  }

  // Get date range string
  static getDateRangeString(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString();
    }

    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  // Validate environment variables
  static validateEnvironment(): void {
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

    // Validate token formats
    if (!process.env.SLACK_BOT_TOKEN?.startsWith("xoxb-")) {
      throw new Error("Invalid SLACK_BOT_TOKEN format");
    }

    if (!process.env.OPENAI_API_KEY?.startsWith("sk-")) {
      throw new Error("Invalid OPENAI_API_KEY format");
    }

    console.log("✅ Environment variables validated");
  }

  // Rate limiting helper
  static createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
    const requests = new Map<string, number[]>();

    return {
      isAllowed: (key: string): boolean => {
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!requests.has(key)) {
          requests.set(key, []);
        }

        const userRequests = requests.get(key)!;

        // Remove old requests outside the window
        const validRequests = userRequests.filter((time) => time > windowStart);
        requests.set(key, validRequests);

        if (validRequests.length >= maxRequests) {
          return false;
        }

        validRequests.push(now);
        return true;
      },

      getRemainingRequests: (key: string): number => {
        const now = Date.now();
        const windowStart = now - windowMs;
        const userRequests = requests.get(key) || [];
        const validRequests = userRequests.filter((time) => time > windowStart);
        return Math.max(0, maxRequests - validRequests.length);
      },
    };
  }

  // Sleep utility
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Retry with exponential backoff
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${i + 1} failed:`, lastError.message);

        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }
}
