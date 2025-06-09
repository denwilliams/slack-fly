# Slack Fly - Real-Time Slack Summarizer

A TypeScript Node.js application that watches designated Slack channels and generates daily digests with summaries, action items, and sentiment analysis using OpenAI API.

> [!NOTE]  
> Part of a set of projects exploring different agentic coding AI tools. Not likely to be maintained but code is free to use if helpful.

## Features

- 🔍 **Real-time monitoring** of designated Slack channels
- 📝 **Daily digest generation** with summaries and action items
- 😊 **Sentiment analysis** of conversations
- ⚡ **Instant recap** with `/recap` slash command
- 🗄️ **Redis caching** for performance optimization
- 📊 **Configurable channels** and scheduling
- 🛡️ **Full TypeScript support** with comprehensive type definitions

## Setup

### Prerequisites

- Node.js (v22 or higher)
- Redis server
- Slack App with appropriate permissions
- OpenAI API key

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Copy the environment template:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=your-openai-api-key
REDIS_URL=redis://localhost:6379
PORT=3000
DIGEST_SCHEDULE=0 17 * * 1-5
WATCHED_CHANNELS=standup,project-x
```

### Slack App Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Add these OAuth scopes:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `commands`
3. Install the app to your workspace
4. Add the bot to the channels you want to monitor

### Running

Development mode (TypeScript with hot reload):
```bash
npm run dev
```

Production mode (compiled JavaScript):
```bash
npm run build
npm start
```

Type checking only:
```bash
npm run type-check
```

## Usage

### Monitoring Channels

Add the bot to channels you want to monitor:
```
/invite @slack-fly
```

### Manual Recap

Use the slash command in any channel:
```
/recap
```

### Daily Digests

Automatic daily digests are sent based on the `DIGEST_SCHEDULE` configuration.

## Configuration

- `WATCHED_CHANNELS`: Comma-separated list of channel names to monitor
- `DIGEST_SCHEDULE`: Cron expression for daily digest timing
- `REDIS_URL`: Redis connection string
- `PORT`: Application port (default: 3000)

## Architecture

```
src/
├── index.js           # Application entry point
├── services/
│   ├── slack.js       # Slack API integration
│   ├── openai.js      # OpenAI API integration
│   ├── redis.js       # Redis caching
│   └── summarizer.js  # Core summarization logic
├── utils/
│   ├── scheduler.js   # Cron job management
│   └── helpers.js     # Utility functions
└── config/
    └── index.js       # Configuration management
```
