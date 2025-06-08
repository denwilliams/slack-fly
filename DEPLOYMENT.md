# Slack Fly - Production Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

Set environment variables in Railway dashboard:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET` 
- `SLACK_APP_TOKEN`
- `OPENAI_API_KEY`
- `REDIS_URL` (Railway provides this automatically if you add Redis)

### Option 2: Render
1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Add Redis database
4. Set environment variables
5. Deploy!

### Option 3: Heroku
```bash
# Install Heroku CLI and create app
heroku create your-slack-fly
heroku addons:create heroku-redis:mini

# Set config vars
heroku config:set SLACK_BOT_TOKEN=xoxb-...
heroku config:set SLACK_SIGNING_SECRET=...
heroku config:set OPENAI_API_KEY=sk-...

# Deploy
git push heroku main
```

### Option 4: Docker
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t slack-fly .
docker run -p 3000:3000 --env-file .env slack-fly
```

### Option 5: VPS/Cloud Server
```bash
# On Ubuntu/Debian server
sudo apt update
sudo apt install nodejs npm redis-server
git clone <your-repo>
cd slack-fly
npm install --production
npm start
```

## 🔧 Configuration

### Required Environment Variables
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # For Socket Mode
OPENAI_API_KEY=sk-your-openai-key
REDIS_URL=redis://localhost:6379
```

### Optional Configuration
```bash
PORT=3000
NODE_ENV=production
DIGEST_SCHEDULE=0 17 * * 1-5      # 5 PM weekdays
WATCHED_CHANNELS=standup,general   # Comma-separated
MAX_MESSAGES_PER_DIGEST=100
SUMMARY_MAX_TOKENS=500
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl https://your-app.com/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-06-08T...",
  "uptime": 3600,
  "redis": true,
  "tasks": { "dailyDigest": { "running": true } }
}
```

### Logging
The app logs to console. In production, consider:
- Structured logging with Winston
- Log aggregation (Datadog, New Relic, etc.)
- Error tracking (Sentry)

## 🛠️ Management Commands

### CLI Tool
```bash
# Check health
npm run cli health

# Trigger digest manually
npm run cli digest
npm run cli digest --channel standup --date 2025-06-07

# View digest history
npm run cli history --channel standup --days 7

# Show configuration
npm run cli config
```

### API Endpoints
```bash
# Health check
GET /health

# Manual digest trigger
POST /api/digest/trigger
Content-Type: application/json
{ "channel": "standup", "date": "2025-06-07" }

# Get digest history
GET /api/digest/standup?days=7

# Configuration
GET /api/config
```

## 🔒 Security Considerations

### Production Checklist
- [ ] Use HTTPS in production
- [ ] Secure Redis with password authentication
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting for API endpoints
- [ ] Set up proper CORS if needed
- [ ] Use a reverse proxy (nginx/cloudflare)

### Slack Security
- [ ] Verify webhook signatures
- [ ] Use Socket Mode for easier firewall setup
- [ ] Limit bot permissions to minimum required
- [ ] Regularly rotate tokens

## 📈 Scaling

### Single Instance Limits
- ~1000 messages/hour per channel
- ~10 channels monitored simultaneously
- OpenAI rate limits apply

### Multi-Instance Setup
For high-volume workspaces:
1. Use Redis for coordination between instances
2. Implement leader election for scheduled tasks
3. Load balance HTTP endpoints
4. Consider message queuing (Bull/Agenda)

## 🐛 Troubleshooting

### Common Issues

**Bot not responding to /recap:**
- Check bot permissions in Slack
- Verify Socket Mode is enabled
- Check console for errors

**Daily digests not sending:**
- Check cron schedule syntax
- Verify channel names are exact matches
- Confirm bot is in target channels

**OpenAI errors:**
- Check API key and billing
- Monitor rate limits
- Verify model availability

**Redis connection issues:**
- Check connection string format
- Verify network connectivity
- Check Redis server status

### Debug Mode
```bash
DEBUG=slack-fly:* npm start
```

### Log Analysis
Key log messages to monitor:
- `✅ Daily digest generated for #channel`
- `❌ Error generating daily digest`
- `📊 Recap requested by user`
- `💓 Health check: Service running`

## 🔄 Updates & Maintenance

### Update Process
```bash
git pull origin main
npm install
npm test
npm run setup  # Validate environment
npm start
```

### Backup Strategy
- Export Redis data regularly
- Backup environment variables
- Keep digest history if needed

### Monitoring Alerts
Set up alerts for:
- Health check failures
- High error rates
- OpenAI API quota exhaustion
- Redis connection failures

## 📞 Support

For issues:
1. Check logs and health endpoint
2. Run `npm run setup` to validate config
3. Review Slack app permissions
4. Check OpenAI API status
5. Verify Redis connectivity
