import OpenAI from "openai";
import config from "@/config";
import { SlackMessage } from "@/types";

class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateSummary(
    messages: SlackMessage[],
    channelName: string
  ): Promise<string> {
    try {
      const messagesText = messages
        .map((msg) => {
          const timestamp = new Date(
            parseFloat(msg.ts) * 1000
          ).toLocaleTimeString();
          return `[${timestamp}] ${msg.user}: ${msg.text}`;
        })
        .join("\n");

      const prompt = `
You are analyzing messages from the Slack channel #${channelName}. Please provide a comprehensive summary with the following structure:

**DAILY SUMMARY**
- Key topics discussed
- Important decisions made
- Progress updates mentioned

**ACTION ITEMS**
- List specific tasks mentioned
- Include assignees if mentioned
- Note deadlines if specified

**SENTIMENT ANALYSIS**
- Overall team mood (positive/neutral/negative)
- Any concerns or blockers mentioned
- Team collaboration quality

**KEY PARTICIPANTS**
- Most active contributors
- Subject matter experts involved

Here are the messages to analyze:

${messagesText}

Please format your response in clear sections using markdown formatting.`;

      const completion = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that specializes in analyzing team communications and creating concise, actionable summaries.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: 0.3,
      });

      return (
        completion.choices[0]?.message?.content || "Failed to generate summary"
      );
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(
        `Failed to generate summary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async generateQuickRecap(
    messages: SlackMessage[],
    channelName: string,
    timeframe: string = "recent"
  ): Promise<string> {
    try {
      const recentMessages = messages.slice(-20);
      const messagesText = recentMessages
        .map((msg) => {
          const timestamp = new Date(
            parseFloat(msg.ts) * 1000
          ).toLocaleTimeString();
          return `[${timestamp}] ${msg.user}: ${msg.text}`;
        })
        .join("\n");

      const prompt = `
Provide a quick recap of the ${timeframe} messages from #${channelName}:

**QUICK SUMMARY**
- What was discussed (2-3 bullet points)
- Any immediate action items
- Current status/progress

**NEXT STEPS**
- What needs to happen next
- Who should follow up

Keep it concise and actionable.

Messages:
${messagesText}`;

      const completion = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that creates brief, actionable recaps of team conversations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      return (
        completion.choices[0]?.message?.content || "Failed to generate recap"
      );
    } catch (error) {
      console.error("OpenAI quick recap error:", error);
      throw new Error(
        `Failed to generate quick recap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async analyzeSentiment(
    text: string
  ): Promise<"positive" | "negative" | "neutral"> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Analyze the sentiment of the given text and respond with just one word: positive, negative, or neutral.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const sentiment = completion.choices[0]?.message?.content
        ?.toLowerCase()
        .trim();
      if (
        sentiment === "positive" ||
        sentiment === "negative" ||
        sentiment === "neutral"
      ) {
        return sentiment;
      }
      return "neutral";
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return "neutral";
    }
  }
}

export default new OpenAIService();
