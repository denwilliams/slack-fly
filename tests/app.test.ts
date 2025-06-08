// Mock environment variables for testing
process.env.OPENAI_API_KEY = "test-key";
process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
process.env.SLACK_SIGNING_SECRET = "test-secret";
process.env.REDIS_URL = "redis://localhost:6379";

// Mock OpenAI
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Mock response" } }],
        }),
      },
    },
  }));
});

// Mock Redis
jest.mock("../src/services/redis", () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: true,
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

// Mock Slack
jest.mock("@slack/bolt", () => ({
  App: jest.fn().mockImplementation(() => ({
    message: jest.fn(),
    command: jest.fn(),
    event: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock("@slack/web-api", () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: jest.fn() },
    conversations: {
      info: jest.fn(),
      history: jest.fn(),
      list: jest.fn(),
    },
    users: { info: jest.fn() },
    chat: { postMessage: jest.fn() },
  })),
}));

import { summarizerService } from "../src/services/summarizer";
import type { SlackMessage, DigestParticipant } from "../src/types";

describe("Meeting Whisperer", () => {
  // Mock data for testing
  const mockMessages: SlackMessage[] = [
    {
      ts: "1640995200.000100",
      user: "John Doe",
      text: "Good morning team! Ready for our standup?",
    },
    {
      ts: "1640995260.000200",
      user: "Jane Smith",
      text: "Yes! I completed the user authentication feature yesterday.",
    },
    {
      ts: "1640995320.000300",
      user: "Mike Johnson",
      text: "Great work Jane! I'll review the PR today. My task is to fix the database connection issue.",
    },
  ];

  test("should extract participants from messages", () => {
    // Access the private method through any cast for testing
    const participants = (summarizerService as any).extractParticipants(
      mockMessages
    ) as DigestParticipant[];

    expect(participants).toHaveLength(3);
    expect(participants[0]!.user).toBe("John Doe");
    expect(participants[0]!.messageCount).toBe(1);
  });

  test("should handle empty messages array", () => {
    const participants = (summarizerService as any).extractParticipants(
      []
    ) as DigestParticipant[];
    expect(participants).toHaveLength(0);
  });
});

describe("Helpers", () => {
  let Helpers: typeof import("../src/utils/helpers").default;

  beforeEach(async () => {
    const helpersModule = await import("../src/utils/helpers");
    Helpers = helpersModule.default;
  });

  test("should sanitize Slack messages", () => {
    const input =
      "<@U123456> mentioned <#C789012|general> with a link <https://example.com|Example>";
    const expected = "@user mentioned #general with a link Example";

    expect(Helpers.sanitizeMessage(input)).toBe(expected);
  });

  test("should detect action items", () => {
    const textWithActions =
      "We need to fix the bug by tomorrow. John will handle it.";
    const textWithoutActions = "The weather is nice today.";

    expect(Helpers.containsActionItems(textWithActions)).toBe(true);
    expect(Helpers.containsActionItems(textWithoutActions)).toBe(false);
  });

  test("should format timestamps correctly", () => {
    const timestamp = "1640995200.000100";
    const formatted = Helpers.formatTimestamp(timestamp);

    expect(formatted).toHaveProperty("date");
    expect(formatted).toHaveProperty("time");
    expect(formatted).toHaveProperty("iso");
  });
});
