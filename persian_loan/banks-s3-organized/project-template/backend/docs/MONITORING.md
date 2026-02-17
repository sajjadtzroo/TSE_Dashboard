# Backend Monitoring & Observability Guide

This document outlines the monitoring, logging, and observability setup for the Persian Loan Banks backend API.

## Table of Contents

- [Logging Configuration](#logging-configuration)
- [Security Event Logging](#security-event-logging)
- [Health Check Monitoring](#health-check-monitoring)
- [Redis Cache Monitoring](#redis-cache-monitoring)
- [Rate Limit Monitoring](#rate-limit-monitoring)
- [Correlation ID Tracking](#correlation-id-tracking)
- [Error Tracking Setup](#error-tracking-setup)
- [Metrics Collection](#metrics-collection)
- [Alerting](#alerting)

## Logging Configuration

### Loguru Setup

The application uses **Loguru** for structured logging. Configuration is in `app/core/logging.py`.

```python
from loguru import logger
import sys

# Configure logger
logger.remove()  # Remove default handler
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)
logger.add(
    "logs/app_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="30 days",
    compression="zip",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
)
logger.add(
    "logs/error_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="90 days",
    compression="zip",
    level="ERROR",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
)
```

### Log Levels

- **DEBUG**: Detailed debugging information (development only)
- **INFO**: General informational messages
- **WARNING**: Warning messages for recoverable issues
- **ERROR**: Error messages for exceptions
- **CRITICAL**: Critical issues requiring immediate attention

### Example Usage

```python
from loguru import logger

# Info logging
logger.info("User {user_id} logged in", user_id=123)

# Error logging with exception
try:
    result = risky_operation()
except Exception as e:
    logger.error("Operation failed: {error}", error=str(e))
    logger.exception("Full traceback:")

# Structured logging
logger.bind(user_id=123, action="login").info("User action")
```

## Security Event Logging

Security events are logged in `app/middleware/security_logging.py`.

### Tracked Events

1. **Authentication Events**
   - Login attempts (success/failure)
   - Token generation
   - Token validation failures
   - Logout events

2. **Authorization Events**
   - Unauthorized access attempts
   - Permission checks
   - Role-based access violations

3. **Rate Limiting Events**
   - Rate limit violations
   - IP blocking
   - Suspicious activity patterns

4. **Data Access Events**
   - Sensitive data queries
   - Bulk data exports
   - Data modification attempts

### Security Log Format

```python
logger.bind(
    event_type="security",
    severity="high",
    user_id=user_id,
    ip_address=request.client.host,
    endpoint=request.url.path,
    action=action,
).warning(f"Security event: {description}")
```

### Example Security Logs

```
2025-02-05 10:30:45 | WARNING  | security:log_security_event:25 - Failed login attempt from 192.168.1.100
2025-02-05 10:35:12 | WARNING  | security:log_security_event:25 - Rate limit exceeded for IP 192.168.1.101
2025-02-05 10:40:30 | ERROR    | security:log_security_event:25 - Unauthorized access attempt to /api/admin/users
```

## Health Check Monitoring

The `/health` endpoint provides comprehensive health status.

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-02-05T10:30:45.123456",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "response_time_ms": 15,
      "connection_pool": {
        "active": 5,
        "idle": 10,
        "total": 15
      }
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 3,
      "memory_usage_mb": 45.2,
      "connected_clients": 8
    }
  },
  "request_id": "abc123def456"
}
```

### Monitoring Health Endpoint

```bash
# Basic health check
curl -f http://localhost:8000/health

# Detailed health check with metrics
curl http://localhost:8000/health | jq .

# Monitor continuously
watch -n 5 'curl -s http://localhost:8000/health | jq .services'
```

### Health Check Alerts

Set up alerts for:
- Response time > 1000ms
- Database connection failures
- Redis connection failures
- High memory usage (> 80%)

## Redis Cache Monitoring

### Cache Metrics

Monitor these Redis metrics:

1. **Hit Rate**: `cache_hits / (cache_hits + cache_misses)`
2. **Memory Usage**: Current memory consumption
3. **Eviction Rate**: Keys evicted due to maxmemory
4. **Connection Count**: Active client connections
5. **Command Rate**: Commands per second

### Monitoring Cache Performance

```python
# In app/core/cache.py
from loguru import logger

async def get_cache_stats():
    """Get Redis cache statistics."""
    info = await redis_client.info('stats')

    total_commands = info.get('total_commands_processed', 0)
    hits = info.get('keyspace_hits', 0)
    misses = info.get('keyspace_misses', 0)

    hit_rate = hits / (hits + misses) if (hits + misses) > 0 else 0

    logger.info(
        f"Cache stats: {hit_rate:.2%} hit rate, "
        f"{hits} hits, {misses} misses, "
        f"{total_commands} total commands"
    )

    return {
        'hit_rate': hit_rate,
        'hits': hits,
        'misses': misses,
        'total_commands': total_commands,
    }
```

### Cache Monitoring Commands

```bash
# Monitor Redis in real-time
redis-cli --stat

# Get detailed info
redis-cli INFO stats
redis-cli INFO memory

# Monitor specific metrics
redis-cli INFO stats | grep keyspace
```

## Rate Limit Monitoring

Rate limiting is implemented using SlowAPI.

### Monitored Metrics

1. **Rate Limit Hits**: Requests blocked by rate limiter
2. **User-specific rates**: Per-user request counts
3. **Endpoint-specific rates**: Per-endpoint request counts
4. **IP-based tracking**: Per-IP request patterns

### Rate Limit Logs

```python
from loguru import logger

@app.middleware("http")
async def log_rate_limits(request: Request, call_next):
    """Log rate limit violations."""
    response = await call_next(request)

    if response.status_code == 429:
        logger.bind(
            event_type="rate_limit",
            ip=request.client.host,
            endpoint=request.url.path,
            user_agent=request.headers.get('user-agent'),
        ).warning("Rate limit exceeded")

    return response
```

### Rate Limit Metrics Endpoint

```python
# app/api/monitoring.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/metrics/rate-limits")
async def get_rate_limit_metrics():
    """Get rate limit statistics."""
    # Implement rate limit metrics collection
    return {
        'total_requests': 10000,
        'rate_limited_requests': 150,
        'rate_limit_percentage': 1.5,
        'top_limited_ips': [
            {'ip': '192.168.1.100', 'count': 50},
            {'ip': '192.168.1.101', 'count': 30},
        ]
    }
```

## Correlation ID Tracking

Every request gets a unique correlation ID for distributed tracing.

### Implementation

```python
# app/middleware/correlation_id.py
from fastapi import Request
import uuid
from loguru import logger

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    """Add correlation ID to each request."""
    correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))

    # Bind to logger context
    with logger.contextualize(correlation_id=correlation_id):
        logger.info(f"Request started: {request.method} {request.url.path}")

        response = await call_next(request)
        response.headers['X-Correlation-ID'] = correlation_id

        logger.info(f"Request completed: {response.status_code}")

        return response
```

### Using Correlation IDs

```bash
# Send request with correlation ID
curl -H "X-Correlation-ID: my-custom-id-123" http://localhost:8000/api/banks

# Response includes correlation ID
# X-Correlation-ID: my-custom-id-123
```

### Log Filtering by Correlation ID

```bash
# Filter logs by correlation ID
grep "correlation_id=abc123" logs/app_2025-02-05.log

# Follow specific request flow
tail -f logs/app_2025-02-05.log | grep "correlation_id=abc123"
```

## Error Tracking Setup

### Sentry Integration (Recommended)

```python
# app/core/sentry.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastAPIIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.loguru import LoguruIntegration

def init_sentry(dsn: str, environment: str):
    """Initialize Sentry error tracking."""
    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        integrations=[
            FastAPIIntegration(),
            RedisIntegration(),
            LoguruIntegration(),
        ],
        traces_sample_rate=0.1,  # 10% of transactions
        profiles_sample_rate=0.1,  # 10% of transactions
        send_default_pii=False,  # Don't send PII
    )

# In app/main.py
from app.core.sentry import init_sentry

if settings.SENTRY_DSN:
    init_sentry(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT
    )
```

### Error Context

```python
from sentry_sdk import capture_exception, set_context, set_tag

try:
    result = process_loan_data(loan_id)
except Exception as e:
    # Add context
    set_context("loan", {
        "loan_id": loan_id,
        "user_id": user.id,
    })
    set_tag("component", "loan_processor")

    # Capture exception
    capture_exception(e)
    logger.error(f"Loan processing failed: {e}")
```

## Metrics Collection

### Prometheus Integration (Example)

```python
# app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

# Define custom metrics
request_count = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)

active_users = Gauge(
    'active_users',
    'Number of active users'
)

cache_hit_rate = Gauge(
    'cache_hit_rate',
    'Cache hit rate'
)

# In app/main.py
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app, endpoint="/metrics")
```

### Metrics Endpoint

```bash
# Get Prometheus metrics
curl http://localhost:8000/metrics

# Example output
# HELP api_requests_total Total API requests
# TYPE api_requests_total counter
# api_requests_total{method="GET",endpoint="/api/banks",status="200"} 1234
```

### Grafana Dashboard (Example)

```yaml
# grafana-dashboard.json
{
  "dashboard": {
    "title": "Persian Loan Banks API",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(api_requests_total[5m])"
        }]
      },
      {
        "title": "Response Time (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, api_request_duration_seconds)"
        }]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [{
          "expr": "cache_hit_rate"
        }]
      }
    ]
  }
}
```

## Alerting

### Alert Rules (Example)

```yaml
# alerts.yml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(api_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, api_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "API response time is slow"
          description: "P95 response time is {{ $value }} seconds"

      - alert: CacheLowHitRate
        expr: cache_hit_rate < 0.5
        for: 10m
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}"

      - alert: HighRateLimitViolations
        expr: rate(rate_limited_requests[5m]) > 10
        for: 5m
        annotations:
          summary: "High rate limit violations"
          description: "{{ $value }} rate limit violations per second"
```

### Notification Channels

Configure alerts to send to:
- **Slack**: Real-time team notifications
- **Email**: Critical alerts
- **PagerDuty**: On-call escalation
- **Webhook**: Custom integrations

## Best Practices

1. **Log Retention**: Keep logs for 30 days (info) and 90 days (errors)
2. **Log Rotation**: Rotate daily and compress old logs
3. **Structured Logging**: Use structured formats (JSON) for easy parsing
4. **Correlation IDs**: Always use correlation IDs for request tracing
5. **Sensitive Data**: Never log passwords, tokens, or PII
6. **Performance**: Use async logging to avoid blocking
7. **Monitoring**: Set up dashboards for key metrics
8. **Alerting**: Configure alerts for critical issues
9. **Testing**: Test logging in CI/CD pipeline
10. **Documentation**: Document all monitored metrics

## Quick Start

1. **View Logs**:
   ```bash
   tail -f logs/app_$(date +%Y-%m-%d).log
   ```

2. **Check Health**:
   ```bash
   curl http://localhost:8000/health | jq .
   ```

3. **Monitor Cache**:
   ```bash
   redis-cli --stat
   ```

4. **View Metrics**:
   ```bash
   curl http://localhost:8000/metrics
   ```

## Troubleshooting

### High Error Rate

1. Check error logs: `grep ERROR logs/app_*.log`
2. Review Sentry dashboard
3. Check database connectivity
4. Verify Redis connection

### Slow Response Times

1. Check database query performance
2. Review cache hit rate
3. Analyze slow endpoints
4. Check resource usage (CPU, memory)

### Rate Limit Issues

1. Review rate limit logs
2. Check for DDoS attacks
3. Adjust rate limits if needed
4. Implement IP whitelisting

## Resources

- [Loguru Documentation](https://loguru.readthedocs.io/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [FastAPI Monitoring](https://fastapi.tiangolo.com/advanced/middleware/)
