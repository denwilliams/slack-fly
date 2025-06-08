# Development Scripts and Commands

## Quick Start
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys and configuration
# Then install dependencies
npm install

# Test your setup
node setup.js

# Start in development mode
npm run dev
```

## Slack App Setup Instructions

### 1. Create a Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Slack Fly" and select your workspace

### 2. Configure OAuth & Permissions
Go to "OAuth & Permissions" and add these Bot Token Scopes:
- `channels:history` - Read messages from public channels
- `channels:read` - View basic information about public channels  
- `chat:write` - Send messages as the bot
- `commands` - Add slash commands
- `app_mentions:read` - Listen to mentions

### 3. Install App to Workspace
- Click "Install to Workspace"
- Copy the "Bot User OAuth Token" (starts with `xoxb-`)
- Add it to your `.env` file as `SLACK_BOT_TOKEN`

### 4. Add Slash Command
Go to "Slash Commands" and create:
- Command: `/recap`
- Request URL: `https://your-domain.com/slack/events` (or use ngrok for local testing)
- Description: "Get a quick summary of recent channel activity"
- Usage Hint: "Generate instant channel recap"

### 5. Enable Socket Mode (Easier for Development)
1. Go to "Socket Mode" and enable it
2. Create an App-Level Token with `connections:write` scope
3. Copy the token (starts with `xapp-`) to your `.env` as `SLACK_APP_TOKEN`

### 6. Subscribe to Events
Go to "Event Subscriptions":
- Enable Events
- Subscribe to Bot Events: `message.channels`, `app_mention`

## Environment Variables Reference

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here  
SLACK_APP_TOKEN=xapp-your-app-token-here      # For Socket Mode

# OpenAI Configuration  
OPENAI_API_KEY=sk-your-openai-api-key-here

# Redis Configuration
REDIS_URL=redis://localhost:6379              # Local Redis
# REDIS_URL=redis://user:pass@host:port        # Remote Redis

# Application Configuration
PORT=3000
NODE_ENV=development
DIGEST_SCHEDULE=0 17 * * 1-5                  # 5 PM weekdays
WATCHED_CHANNELS=standup,project-x,general    # Comma-separated
MAX_MESSAGES_PER_DIGEST=100
SUMMARY_MAX_TOKENS=500
```

## Development Commands

```bash
# Development with auto-restart
npm run dev

# Production start
npm start

# Run tests
npm test

# Test environment setup
node setup.js

# Manual digest trigger (via API)
curl -X POST http://localhost:3000/api/digest/trigger

# Get digest history
curl http://localhost:3000/api/digest/standup?days=7
```

## Testing Locally with ngrok

If you want to test webhooks locally:

```bash
# Install ngrok
brew install ngrok

# Expose local port
ngrok http 3000

# Use the HTTPS URL in your Slack app configuration
```

## Production Deployment

### Environment Setup
- Set `NODE_ENV=production`
- Use a production Redis instance
- Set up proper logging
- Configure SSL/HTTPS

### Recommended Services
- **Hosting**: Railway, Render, Heroku, or AWS
- **Redis**: Redis Cloud, AWS ElastiCache, or Railway Redis
- **Monitoring**: Use the `/health` endpoint for health checks

## Troubleshooting

### Common Issues

**Slack bot not responding:**
- Check if the bot is added to the channel
- Verify OAuth permissions
- Check the console for error messages

**OpenAI API errors:**
- Verify API key is correct and has credits
- Check rate limits and quotas
- Ensure model name is supported

**Redis connection issues:**
- Check Redis server is running: `redis-cli ping`
- Verify connection URL format
- Check firewall/network settings

**Daily digests not sending:**
- Verify cron schedule format
- Check channel names match exactly
- Ensure bot has permission to post in channels

### Debug Mode
Set environment variable for verbose logging:
```bash
DEBUG=slack-fly:* npm run dev
```
