# Monitoring Guide — TSE Dashboard

> **Stack**: Prometheus · Grafana · postgres_exporter · redis_exporter
> **Last updated**: 2026-02-23

---

## Quick Access

| Service    | URL                          | Credentials     |
|------------|------------------------------|-----------------|
| Grafana    | http://127.0.0.1:3002        | admin / admin   |
| Prometheus | http://localhost:9090        | none            |

> Use `127.0.0.1` not `localhost` for Grafana — macOS port 3001/3002 IPv6 routing quirk.

---

## Architecture

```
Docker services → Prometheus (scrapes every 15s) → Grafana (visualises)

app:8000/metrics          → job: api
postgres-exporter:9187    → job: postgres
redis-exporter:9121       → job: redis
tick_ingestor:9091/metrics → job: tick_ingestor
```

---

## Dashboards

### Opening a dashboard

1. Go to http://127.0.0.1:3002
2. Login: `admin` / `admin`
3. Left sidebar → **Dashboards** (grid icon) → **Browse**
4. Click any dashboard

---

### Dashboard reference

#### Tick Ingestor
**Purpose**: Real-time market tick ingestion health
**Key panels**:
| Panel | Healthy value |
|-------|--------------|
| Poll duration | < 5s |
| Ticks ingested/s | > 0 during market hours (09:00–12:30 Tehran) |
| DB insert errors | 0 |
| Active symbols | ~700 during market hours |

---

#### API — FastAPI Metrics
**Purpose**: HTTP traffic, latency, and error rates
**Key panels**:
| Panel | Healthy value |
|-------|--------------|
| Requests per second | Matches expected traffic |
| HTTP error rate (4xx + 5xx) | < 1% |
| P95 latency | < 200ms |
| P99 latency | < 1s |
| Gunicorn workers | 8 (matches `GUNICORN_WORKERS`) |
| RSS memory | < 2 GB total |

**PromQL to explore**:
```promql
# Requests per second by endpoint
sum(rate(http_requests_total[1m])) by (handler)

# 95th percentile latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Error rate %
sum(rate(http_requests_total{status=~"5.."}[1m])) / sum(rate(http_requests_total[1m])) * 100
```

---

#### PostgreSQL — Database Metrics
**Purpose**: Database connections, cache efficiency, replication
**Key panels**:
| Panel | Healthy value |
|-------|--------------|
| Active connections | < 50 (max 200 via PgBouncer) |
| Cache hit rate | > 90% (current: ~94%) |
| Transactions/s | Scales with traffic |
| Replication lag | 0 bytes (replica in sync) |
| Deadlocks | 0 |
| DB size | ~764 MB (monitor growth) |

**PromQL to explore**:
```promql
# Active DB connections
pg_stat_activity_count{datname="tsetmc"}

# Cache hit rate
rate(pg_stat_database_blks_hit{datname="tsetmc"}[1m]) /
(rate(pg_stat_database_blks_hit{datname="tsetmc"}[1m]) + rate(pg_stat_database_blks_read{datname="tsetmc"}[1m])) * 100

# Replication lag bytes
pg_replication_slots_lag_bytes
```

---

#### Redis — Cache Metrics
**Purpose**: Cache memory, hit rate, and persistence
**Key panels**:
| Panel | Healthy value |
|-------|--------------|
| Memory used | < 1.6 GB (80% of 2 GB limit) |
| Cache hit rate | > 85% (current: ~91.8%) |
| Evicted keys | 0 (if > 0: increase maxmemory or review TTLs) |
| Memory fragmentation ratio | 1.0–1.5 (> 2.0 = restart Redis) |
| AOF rewrite in progress | 0 (brief spike during rewrite is normal) |

**PromQL to explore**:
```promql
# Memory utilisation %
redis_memory_used_bytes / redis_config_maxmemory * 100

# Hit rate %
rate(redis_keyspace_hits_total[1m]) /
(rate(redis_keyspace_hits_total[1m]) + rate(redis_keyspace_misses_total[1m])) * 100

# Commands per second
rate(redis_commands_processed_total[1m])
```

---

## Dashboard Controls

```
Time range  →  top-right picker  (e.g. Last 1h, Last 6h, Last 24h)
Auto-refresh → next to time picker  (set 30s for live monitoring)
Zoom in     →  click + drag on any chart
Full screen →  panel title → View
Edit panel  →  panel title → Edit
```

---

## Explore Mode (Ad-hoc Queries)

Left sidebar → **Explore** (compass icon) → datasource: **Prometheus**

Type any PromQL expression and press `Shift+Enter` to run.

**Useful starting queries**:
```promql
up                                    # which targets are alive (1=up, 0=down)
rate(http_requests_total[5m])         # API traffic last 5 min
pg_stat_database_numbackends          # all DB connection counts
redis_connected_clients               # Redis client count
tick_ingestor_symbols_active          # symbols being polled right now
```

---

## Alerts Setup (Optional)

### Add an alert to a panel

1. Open a dashboard → click a panel title → **Edit**
2. Go to **Alert** tab → **New alert rule**
3. Set condition, threshold, evaluation interval
4. Add notification channel (email, Slack, webhook) under **Alerting → Contact points**

### Recommended alert rules

| Metric | Condition | Severity |
|--------|-----------|----------|
| API error rate | > 5% for 2m | Critical |
| API p99 latency | > 2s for 5m | Warning |
| PostgreSQL connections | > 180 for 5m | Warning |
| Redis memory | > 80% for 10m | Warning |
| Redis hit rate | < 70% for 5m | Warning |
| Replication lag | > 10 MB for 1m | Critical |
| Target down | `up == 0` for 1m | Critical |

---

## Checking Prometheus Directly

```bash
# All scrape targets and their health
curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool | grep -E "job|health|lastError"

# Query a metric from the CLI
curl -s "http://localhost:9090/api/v1/query?query=up" | python3 -m json.tool

# Check loaded config
curl -s http://localhost:9090/api/v1/status/config | python3 -m json.tool

# Reload config after editing prometheus.yml (no restart)
curl -s -X POST http://localhost:9090/-/reload
```

---

## Troubleshooting

### Target shows "down"
```bash
# Check exporter logs
docker logs tse_dashboard-postgres-exporter-1
docker logs tse_dashboard-redis-exporter-1

# Test exporter endpoints directly
curl -s http://localhost:9187/metrics | head -20   # postgres
curl -s http://localhost:9121/metrics | head -20   # redis
curl -s http://localhost:8000/metrics | head -20   # api
```

### Grafana shows "No data"
- Check time range (top-right) — widen to Last 6h if just started
- Verify Prometheus datasource: **Settings → Data sources → Prometheus → Test**
- Run the panel's query in Explore mode to debug

### Grafana login fails
```bash
# Reset admin password
docker exec tse_dashboard-grafana-1 grafana-cli admin reset-admin-password admin
```

### Config changes not picked up by Prometheus
```bash
# Hard restart (Docker Desktop on macOS doesn't always hot-reload mounted files)
docker compose restart prometheus
```

---

## Exporter Ports

| Exporter | Port | Metrics URL |
|----------|------|-------------|
| postgres-exporter | 9187 | http://localhost:9187/metrics |
| redis-exporter | 9121 | http://localhost:9121/metrics |
| app (FastAPI) | 8000 | http://localhost:8000/metrics |
| tick-ingestor | 9091 | http://localhost:9091/metrics |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3002 | http://127.0.0.1:3002 |
