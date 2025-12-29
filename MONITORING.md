# Monitoring & Alerting Guide

This document provides a comprehensive guide to monitoring, error tracking, health checks, and alerting for the Crypto Portfolio application.

## Table of Contents

1. [Overview](#overview)
2. [Error Tracking with Sentry](#error-tracking-with-sentry)
3. [Structured Logging](#structured-logging)
4. [Health Checks](#health-checks)
5. [Performance Monitoring](#performance-monitoring)
6. [Alerting with Slack](#alerting-with-slack)
7. [Uptime Monitoring](#uptime-monitoring)
8. [Metrics & Dashboards](#metrics--dashboards)
9. [Alert Response Procedures](#alert-response-procedures)
10. [Configuration](#configuration)

---

## Overview

The application includes comprehensive monitoring and observability features:

- **Error Tracking**: Sentry integration for backend and frontend
- **Structured Logging**: JSON-formatted logs for production
- **Health Checks**: Endpoints for system and price feed health
- **Performance Monitoring**: Request timing and slow query detection
- **Alerting**: Slack notifications for critical issues
- **Metrics**: Cache statistics and endpoint performance data

**Target SLA**: 99.5% uptime (max 3.6 hours downtime/month)

---

## Error Tracking with Sentry

### Setup

1. **Create Sentry Account**: Sign up at [sentry.io](https://sentry.io) (free tier: 5,000 errors/month)
2. **Create Projects**:
   - Backend project (Node.js)
   - Frontend project (React)
3. **Get DSN**: Copy the DSN from each project's settings

### Configuration

**Backend** (`.env`):
```bash
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
NODE_ENV=production
```

**Frontend** (`.env`):
```bash
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
```

### Features

- **Automatic Error Capture**: All unhandled exceptions are captured
- **Performance Tracing**: 10% of requests traced in production (100% in development)
- **Profiling**: CPU profiling for performance issues
- **Session Replay**: Frontend user session recordings on errors
- **Context**: Environment, user info, and custom tags

### Alert Rules (Configure in Sentry Dashboard)

1. **High Error Rate**: Alert when error rate >5% for 1 hour
2. **New Error Type**: Alert when new error appears
3. **Critical Errors**: Alert on 500/503 HTTP errors immediately
4. **Performance Degradation**: Alert on P95 response time >3s

### Severity Levels

- `fatal`: Critical errors causing service unavailability
- `error`: Unhandled exceptions, API failures
- `warning`: Performance degradation, retry attempts
- `info`: Important events (data imports, user actions)

---

## Structured Logging

### Logger Utility (`src/utils/logger.js`)

The application uses a structured logging utility that outputs:
- **Development**: Pretty-printed console logs
- **Production**: JSON-formatted logs to stdout

### Usage Examples

```javascript
const logger = require('./utils/logger');

// Info logging
logger.info('CSV import started', {
  portfolioId: 123,
  filename: 'trades.csv',
  rows: 500,
});

// Error logging
logger.error('Database query failed', error, {
  query: 'SELECT * FROM trades',
  duration: '250ms',
});

// Warning logging
logger.warn('Slow request detected', {
  method: 'GET',
  path: '/api/portfolios/summary',
  duration: '1500ms',
});

// Debug logging (development only)
logger.debug('Cache hit', {
  key: 'price:BTC',
  ttl: 900,
});

// Fatal logging
logger.fatal('Server startup failed', error, {
  port: 3000,
});
```

### Log Format (Production)

```json
{
  "timestamp": "2025-12-29T12:00:00.000Z",
  "level": "ERROR",
  "message": "Database query failed",
  "environment": "production",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\n    at ...",
  "query": "SELECT * FROM trades",
  "duration": "250ms"
}
```

### Log Retention

- **Railway**: ~7 days (built-in log viewer)
- **AWS CloudWatch**: Configurable (default 1 month)
- **Production Strategy**: Keep 1 month in primary storage, archive to S3 for compliance

---

## Health Checks

### 1. System Health (`GET /health`)

**Response (Healthy)**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-29T12:00:00.000Z",
  "uptime": 3600,
  "postgres": "connected",
  "redis": "connected"
}
```

**Response (Degraded)**:
```json
{
  "status": "degraded",
  "timestamp": "2025-12-29T12:00:00.000Z",
  "uptime": 3600,
  "postgres": "disconnected",
  "redis": "connected",
  "error": "Database connection timeout after 5s"
}
```

**Status Codes**:
- `200`: All systems operational
- `503`: Service degraded (database or Redis down)

**Monitoring**:
- Configure Uptime Robot to poll `/health` every 5 minutes
- Alert on 503 status or timeout

### 2. Price Feed Health (`GET /health/prices`)

Checks freshness of cached price data for key symbols.

**Response (Healthy)**:
```json
{
  "status": "healthy",
  "lastUpdate": "2025-12-29T12:00:00.000Z",
  "symbols": {
    "BTC": {
      "lastPrice": 42500,
      "updatedAt": "2025-12-29T12:00:00.000Z",
      "age": "5m",
      "status": "current"
    },
    "ETH": {
      "lastPrice": 2250,
      "updatedAt": "2025-12-29T11:55:00.000Z",
      "age": "10m",
      "status": "current"
    }
  }
}
```

**Response (Degraded)**:
```json
{
  "status": "degraded",
  "lastUpdate": "2025-12-29T12:00:00.000Z",
  "symbols": {
    "BTC": {
      "lastPrice": 42500,
      "updatedAt": "2025-12-29T11:25:00.000Z",
      "age": "35m",
      "status": "stale"
    }
  }
}
```

**Alert Conditions**:
- Price not updated for >30 minutes
- Price cache miss for any symbol
- Price API timeout or 503 error

---

## Performance Monitoring

### 1. Request Duration Tracking

All API requests are automatically tracked with:
- Duration
- Status code
- Endpoint path
- Slow request detection (>1s)

**Slow Request Example**:
```
WARN: Slow request detected
{
  "method": "GET",
  "path": "/api/portfolios/123/summary",
  "duration": "1500ms",
  "statusCode": 200
}
```

### 2. Database Query Timing

**Threshold**: 500ms for slow query detection

**Example**:
```
WARN: Slow database query detected
{
  "query": "SELECT * FROM trades WHERE portfolio_id = $1",
  "duration": "850ms",
  "rows": 1500
}
```

### 3. Cache Statistics (`GET /metrics/cache`)

**Response**:
```json
{
  "timestamp": "2025-12-29T12:00:00.000Z",
  "priceCache": {
    "hits": 1250,
    "misses": 50,
    "hitRate": "96.15%"
  },
  "equityCurveCache": {
    "size": 25,
    "hits": 500,
    "misses": 30,
    "hitRate": "94.34%"
  },
  "simulatorCache": {
    "size": 15,
    "hits": 200,
    "misses": 10,
    "hitRate": "95.24%"
  }
}
```

**Monitoring**:
- Target cache hit rate: >90%
- Alert if hit rate drops below 80%

### 4. Performance Metrics (`GET /metrics/performance`)

**Response**:
```json
{
  "timestamp": "2025-12-29T12:00:00.000Z",
  "uptime": "7200s",
  "totalRequests": 5000,
  "slowRequests": 15,
  "errorRequests": 5,
  "errorRate": "0.10%",
  "endpoints": {
    "GET /api/portfolios/:id/summary": {
      "count": 500,
      "avg_response_time": "245ms",
      "p50_response_time": "200ms",
      "p95_response_time": "1200ms",
      "p99_response_time": "3500ms",
      "error_count": 1,
      "error_rate": "0.20%"
    },
    "POST /api/simulations/dca": {
      "count": 100,
      "avg_response_time": "1800ms",
      "p50_response_time": "1500ms",
      "p95_response_time": "3200ms",
      "p99_response_time": "5000ms",
      "error_count": 0,
      "error_rate": "0.00%"
    }
  }
}
```

**Monitoring**:
- Target P95 response time: <1s for most endpoints
- Target P95 for simulations: <3s
- Target error rate: <1%

---

## Alerting with Slack

### Setup

1. **Create Slack Webhook**:
   - Go to Slack workspace → Apps → Incoming Webhooks
   - Create webhook for #alerts channel
   - Copy webhook URL

2. **Configure** (`.env`):
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Alert Types

**1. Critical (🚨 Red)**
- Database connection failure
- Redis connection failure
- Server startup failure
- Uncaught exceptions

**2. Error (❌ Light Red)**
- API endpoint failures
- Database query errors
- External API failures

**3. Warning (⚠️ Orange)**
- Slow requests (>1s)
- Slow queries (>500ms)
- Stale price data (>30 min)
- High error rate (>5%)

**4. Info (ℹ️ Blue)**
- Server startup
- Significant events
- Configuration changes

**5. Success (✅ Green)**
- System recovery
- Successful deployments
- Health checks passing

### Rate Limiting

Alerts are rate-limited to prevent spam:
- **Cooldown**: 5 minutes per alert type
- **Dedupe**: Duplicate alerts within cooldown ignored

### Usage Example

```javascript
const slack = require('./utils/slack');

// Critical alert
await slack.critical(
  'Database Connection Failed',
  'Unable to connect to PostgreSQL database',
  {
    error: error.message,
    host: 'db.example.com',
    port: 5432,
  }
);

// Warning alert
await slack.warning(
  'High Error Rate Detected',
  'Error rate exceeded 5% threshold',
  {
    errorRate: '8.5%',
    timeWindow: '1 hour',
    totalRequests: 1000,
    errorRequests: 85,
  }
);
```

---

## Uptime Monitoring

### Uptime Robot Setup

1. **Create Account**: Sign up at [uptimerobot.com](https://uptimerobot.com) (free tier: 1 monitor)
2. **Add Monitor**:
   - Type: HTTP(s)
   - URL: `https://yourdomain.com/health`
   - Interval: Every 5 minutes
   - Alert Type: Email or Slack webhook
   - Alert When: Down, 503, Timeout (>30s)

3. **Optional Checks**:
   - Keyword monitoring: Look for `"status":"ok"` in response
   - Custom HTTP headers if needed

### Expected Behavior

- **200 OK**: All systems operational
- **503 Service Unavailable**: System degraded but running
- **Timeout**: Server not responding (alert immediately)
- **Connection Error**: DNS or network issue (alert immediately)

### Response Time Monitoring

Uptime Robot tracks:
- Average response time
- Uptime percentage
- Downtime incidents
- Response time trends

**Target**: Average response time <500ms

---

## Metrics & Dashboards

### Built-in Endpoints

1. **System Health**: `GET /health`
2. **Price Health**: `GET /health/prices`
3. **Cache Stats**: `GET /metrics/cache`
4. **Performance**: `GET /metrics/performance`

### Sentry Dashboard

Monitor in Sentry:
- Error frequency by type
- Error trends (24h, 7d, 30d)
- Affected users
- Stack traces
- Performance traces

### Custom Dashboard (Optional)

Create simple HTML dashboard at `/admin/metrics`:

```
╔═══════════════════════════════════════════╗
║     CRYPTO PORTFOLIO SYSTEM STATUS        ║
╠═══════════════════════════════════════════╣
║ Uptime:              99.5%                ║
║ Error rate:          0.15%                ║
║ P95 response time:   850ms                ║
║ Cache hit rate:      94%                  ║
║ Active users:        12                   ║
║ Price feed status:   🟢 Healthy           ║
╚═══════════════════════════════════════════╝
```

### Weekly Health Report

Send automated email every Monday:
- Uptime % for last week
- Error count + top errors
- Performance metrics (avg, P95, P99)
- Cache hit rates
- Price feed reliability
- User feedback summary

---

## Alert Response Procedures

### 🚨 Critical Alert: Database Connection Failed

**Immediate Actions**:
1. Check database server status in hosting dashboard
2. Verify connection string in environment variables
3. Check database logs for errors
4. Restart database if necessary
5. If persistent, check connection pool settings

**Recovery Time Objective (RTO)**: 5 minutes

### 🚨 Critical Alert: Server Crashed

**Immediate Actions**:
1. Check server logs for error messages
2. Review recent deployments (rollback if needed)
3. Check system resources (CPU, memory, disk)
4. Restart server if safe to do so
5. Monitor error tracking for root cause

**RTO**: 5 minutes

### ⚠️ Warning: Stale Price Data

**Actions**:
1. Check price service API status (Bybit, CoinGecko)
2. Review rate limiting errors in logs
3. Check Redis connection
4. Manually refresh prices if needed
5. Monitor for recovery

**RTO**: 15 minutes

### ⚠️ Warning: High Error Rate

**Actions**:
1. Identify error types in Sentry
2. Check if error is isolated to specific endpoint
3. Review recent code changes
4. Check external API status
5. Increase monitoring frequency

**RTO**: 30 minutes

### ⚠️ Warning: Slow Request Performance

**Actions**:
1. Check database query performance
2. Review cache hit rates
3. Check for resource contention
4. Analyze slow query logs
5. Consider scaling if persistent

**RTO**: 1 hour

---

## Configuration

### Environment Variables

**Backend** (`.env`):
```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# Sentry
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Cache TTL
PRICE_CACHE_TTL=900  # 15 minutes
```

**Frontend** (`.env`):
```bash
# Sentry
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id

# API
VITE_API_URL=https://api.yourdomain.com
```

### Alert Thresholds

Configured in `src/server.js`:

```javascript
// Performance
SLOW_REQUEST_THRESHOLD_MS = 1000  // 1 second
VERY_SLOW_REQUEST_MS = 3000       // 3 seconds (Sentry alert)
SLOW_QUERY_THRESHOLD_MS = 500     // 500ms (database)

// Cache
TARGET_CACHE_HIT_RATE = 0.90      // 90%

// Price Feed
STALE_PRICE_THRESHOLD_MS = 1800000 // 30 minutes

// Error Rate
HIGH_ERROR_RATE_THRESHOLD = 0.05   // 5%
```

### Sentry Configuration

```javascript
// Backend
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,           // 10% in production
  profilesSampleRate: 0.1,          // 10% profiling
});

// Frontend
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,    // 10% session replays
  replaysOnErrorSampleRate: 1.0,    // 100% on errors
});
```

---

## Testing Alerts

### Test Each Alert Type

1. **Database Failure**:
```bash
# Stop database temporarily
docker stop postgres

# Check /health endpoint returns 503
curl http://localhost:3000/health

# Verify Slack alert received
# Restart database
docker start postgres
```

2. **Slow Request**:
```bash
# Add artificial delay in endpoint
setTimeout(() => res.json(data), 2000);

# Make request
curl http://localhost:3000/api/portfolios/1/summary

# Verify warning logged
```

3. **Stale Price Data**:
```bash
# Clear Redis cache
redis-cli FLUSHALL

# Wait 31 minutes
# Check /health/prices endpoint
curl http://localhost:3000/health/prices

# Verify degraded status and alert
```

### Quarterly Disaster Recovery Drill

**Procedure**:
1. Schedule maintenance window
2. Intentionally take database offline
3. Verify health check returns 503
4. Verify alerts fire within 1 minute
5. Verify Uptime Robot detects downtime
6. Restore database
7. Measure recovery time
8. Document lessons learned

**Target Metrics**:
- Alert latency: <1 minute
- Recovery time: <5 minutes
- All alerts received successfully

---

## Best Practices

### Development

- Always use structured logger (never `console.log` in production code)
- Add context to logs (IDs, durations, counts)
- Log important events (imports, calculations, user actions)
- Use appropriate log levels (debug, info, warn, error, fatal)

### Production

- Monitor error rates daily
- Review slow query logs weekly
- Check cache hit rates weekly
- Review Sentry dashboard weekly
- Respond to critical alerts within 5 minutes
- Investigate warnings within 1 hour

### Alerting

- Don't alert on expected errors (404s, validation failures)
- Use rate limiting to prevent alert spam
- Send critical alerts to multiple channels
- Include actionable context in alerts
- Document alert response procedures

### Performance

- Target P95 response time <1s for most endpoints
- Cache aggressively (15+ minute TTL)
- Monitor database query performance
- Use indexes for frequently queried fields
- Profile slow endpoints with Sentry

---

## Troubleshooting

### Logs Not Appearing

**Check**:
- Logger imported correctly: `const logger = require('./utils/logger')`
- Environment variable set: `NODE_ENV=production`
- Logs going to correct output (stdout for containers)

### Sentry Not Capturing Errors

**Check**:
- DSN configured: `SENTRY_DSN` set in `.env`
- Sentry initialized before app code runs
- Error handler middleware added: `app.use(Sentry.Handlers.errorHandler())`
- Internet connectivity to sentry.io

### Slack Alerts Not Sending

**Check**:
- Webhook URL configured: `SLACK_WEBHOOK_URL` in `.env`
- Webhook URL is valid (test with curl)
- Rate limiting not preventing alert
- Network connectivity to Slack

### Health Check Returning 503

**Possible Causes**:
- Database connection failed (check logs)
- Redis connection failed (check logs)
- Network issues between services
- Resource exhaustion (CPU, memory, connections)

---

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Uptime Robot Documentation](https://uptimerobot.com/help/)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)

---

## Support & Contacts

For monitoring and alerting issues:
- **Sentry Dashboard**: https://sentry.io/organizations/YOUR_ORG/
- **Uptime Robot**: https://uptimerobot.com/dashboard
- **Slack Alerts Channel**: #alerts
- **On-Call**: See team rotation schedule

---

**Last Updated**: 2025-12-29
**Version**: 1.0.0
