# 📊 Meeting Whisperer Usage Examples

## Getting Started

### 1. First Time Setup
```bash
# Copy environment template
cp .env.example .env

# Edit your .env file with real values
# Install dependencies
npm install

# Validate setup
npm run setup

# Start in development
npm run dev
```

### 2. Add Bot to Slack Channels
```bash
# In your Slack channels, invite the bot:
/invite @meeting-whisperer
```

## 🎯 Usage Examples

### Instant Recap
In any monitored Slack channel:
```
/recap
```

Result:
```
📊 Quick Recap for #standup

**QUICK SUMMARY**
• Sprint planning discussion for Q2 features
• Database migration completed successfully  
• New team member onboarding scheduled

**NEXT STEPS**
• Review PR #123 for authentication module
• Schedule client demo for Thursday
• Update documentation by EOD
```

### Daily Digest (Automatic)
Every weekday at 5 PM (configurable), channels get:
```
📊 Daily Digest for #project-alpha

**DAILY SUMMARY**
• Completed user authentication module
• Fixed critical bug in payment processing
• Discussed API rate limiting implementation

**ACTION ITEMS**  
• @john to review security audit by Wednesday
• @sarah to update client documentation
• Team to test staging environment tomorrow

**SENTIMENT ANALYSIS**
• Overall mood: Positive
• High collaboration on problem-solving
• No major blockers reported

**KEY PARTICIPANTS**
• John Smith (12 messages) - Technical lead
• Sarah Johnson (8 messages) - Product manager
• Mike Chen (6 messages) - Backend developer
```

### CLI Management
```bash
# Check application health
npm run cli health

# Trigger digest for specific channel
npm run cli digest --channel standup

# Get last 3 days of digests
npm run cli history --channel project-alpha --days 3

# View current configuration
npm run cli config
```

## 🔧 Configuration Examples

### Basic Setup (.env)
```bash
SLACK_BOT_TOKEN=xoxb-1234567890-abcdefghijk
SLACK_SIGNING_SECRET=abc123def456
SLACK_APP_TOKEN=xapp-1-A123-456-xyz
OPENAI_API_KEY=sk-abcd1234efgh5678
REDIS_URL=redis://localhost:6379
WATCHED_CHANNELS=standup,project-alpha,general
```

### Advanced Configuration
```bash
# Custom schedule (9 AM and 5 PM weekdays)
DIGEST_SCHEDULE=0 9,17 * * 1-5

# High-activity channels
MAX_MESSAGES_PER_DIGEST=200
SUMMARY_MAX_TOKENS=800

# Multiple environments
NODE_ENV=production
PORT=3000
```

## 📱 Slack App Permissions

Required scopes for your Slack app:
```
Bot Token Scopes:
- channels:history    # Read channel messages
- channels:read       # View channel info
- chat:write         # Send digest messages
- commands           # Handle /recap command
- app_mentions:read  # Respond to @mentions

User Token Scopes:
(None required)
```

## 🎨 Customization Examples

### Custom Watched Channels
```javascript
// In your .env
WATCHED_CHANNELS=engineering,product,design,qa,support
```

### Custom Schedule
```javascript
// Daily at 8 AM and 6 PM
DIGEST_SCHEDULE=0 8,18 * * *

// Only Monday, Wednesday, Friday at 5 PM  
DIGEST_SCHEDULE=0 17 * * 1,3,5

// Twice daily on weekdays
DIGEST_SCHEDULE=0 9,17 * * 1-5
```

## 🚀 API Usage Examples

### Trigger Digest via API
```bash
# Trigger for all channels
curl -X POST http://localhost:3000/api/digest/trigger

# Trigger for specific channel and date
curl -X POST http://localhost:3000/api/digest/trigger \
  -H "Content-Type: application/json" \
  -d '{"channel": "standup", "date": "2025-06-07"}'
```

### Get Digest History
```bash
# Last 7 days
curl http://localhost:3000/api/digest/standup

# Last 30 days
curl http://localhost:3000/api/digest/standup?days=30
```

Response:
```json
{
  "success": true,
  "digests": [
    {
      "channelName": "standup",
      "date": "2025-06-07",
      "messageCount": 42,
      "summary": "Daily summary content...",
      "generatedAt": "2025-06-07T17:00:00Z",
      "participants": [
        {"user": "John Smith", "messageCount": 8},
        {"user": "Sarah Johnson", "messageCount": 6}
      ]
    }
  ]
}
```

## 🔍 Monitoring Examples

### Health Check Response
```json
{
  "status": "ok",
  "timestamp": "2025-06-08T14:30:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "redis": true,
  "tasks": {
    "dailyDigest": {"running": true, "destroyed": false},
    "healthCheck": {"running": true, "destroyed": false}
  }
}
```

### Log Examples
```
🚀 Starting Meeting Whisperer...
✅ Environment variables validated
✅ Redis connected successfully
✅ Slack connected as: meeting-whisperer (Your Workspace)
⏰ Daily digest scheduled: 0 17 * * 1-5
📺 Watching channels: standup, project-alpha
🌐 HTTP server running on port 3000
✅ Meeting Whisperer is ready!

📝 Message received in #standup: Good morning team! Ready for...
📊 Recap requested by john.doe in #standup
🌅 Starting daily digest generation...
✅ Daily digest generated for #standup
✅ Daily digest sent to #standup
💓 Health check: 2025-06-08T14:30:00Z - Service running
```

## 🛠️ Troubleshooting Examples

### Common Scenarios

**Bot doesn't respond to /recap:**
```bash
# Check bot permissions
npm run cli config

# Verify in Slack app settings:
# - Bot is installed in workspace
# - /recap command is configured
# - Bot has chat:write permission
```

**No daily digests:**
```bash
# Check schedule format
echo $DIGEST_SCHEDULE

# Verify channels exist and bot is member
npm run cli digest --channel standup

# Check logs for errors
tail -f logs/app.log
```

**OpenAI rate limit errors:**
```bash
# Check current usage at platform.openai.com
# Consider upgrading plan or reducing token limits
SUMMARY_MAX_TOKENS=300
MAX_MESSAGES_PER_DIGEST=50
```

## 🎯 Best Practices

### Channel Management
- Add bot to channels after they're active
- Use descriptive channel names in config
- Monitor channel activity to adjust limits

### Performance Optimization
- Set appropriate message limits per digest
- Use caching for frequently accessed data
- Monitor OpenAI token usage

### Security
- Rotate API keys regularly
- Use environment variables for all secrets
- Monitor bot permissions and usage

## 📈 Scaling Examples

### Multi-Team Setup
```bash
# Engineering team
WATCHED_CHANNELS=backend,frontend,devops,qa

# Product team  
WATCHED_CHANNELS=product,design,user-research

# Sales team
WATCHED_CHANNELS=sales,customer-success,marketing
```

### High-Volume Configuration
```bash
MAX_MESSAGES_PER_DIGEST=500
SUMMARY_MAX_TOKENS=1000
DIGEST_SCHEDULE=0 */6 * * *  # Every 6 hours
```
