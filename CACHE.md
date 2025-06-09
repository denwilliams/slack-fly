# Cache Service Options

Channel Fly supports two caching backends that can be selected via environment variable:

## Redis Cache (Default)
- **Production recommended**
- Persistent storage
- Shared across multiple app instances
- Requires Redis server

```bash
CACHE_TYPE=redis
REDIS_URL=redis://localhost:6379
```

## In-Memory Cache
- **Development & testing**
- No external dependencies
- Data lost on restart
- Single instance only

```bash
CACHE_TYPE=memory
```

## Usage Examples

### Development with Memory Cache
```bash
# .env
CACHE_TYPE=memory
SLACK_BOT_TOKEN=xoxb-...
OPENAI_API_KEY=sk-...
```

### Production with Redis
```bash
# .env
CACHE_TYPE=redis
REDIS_URL=redis://your-redis-server:6379
SLACK_BOT_TOKEN=xoxb-...
OPENAI_API_KEY=sk-...
```

### Testing
```bash
# Run tests with memory cache (no Redis required)
CACHE_TYPE=memory npm test
```

## Cache Features

Both cache implementations support:
- ✅ Message caching (1 hour for today, 24 hours for past dates)
- ✅ Digest caching (7 days)
- ✅ Automatic expiration
- ✅ Same API interface

## When to Use Each

| Scenario | Recommended Cache |
|----------|------------------|
| Local development | Memory |
| CI/CD testing | Memory |
| Single instance production | Redis |
| Multi-instance production | Redis |
| Docker deployment | Redis |
| Serverless functions | Memory |
