# Deployment Guide

**Iranian Banks Loan Dashboard -- Setup and Deployment**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [MongoDB Setup](#mongodb-setup)
4. [Redis Setup](#redis-setup)
5. [Python Environment](#python-environment)
6. [Running Database Scripts](#running-database-scripts)
7. [Running the Application](#running-the-application)
8. [Health Check](#health-check)
9. [Docker Deployment](#docker-deployment)
10. [Production Settings](#production-settings)
11. [Reverse Proxy Configuration](#reverse-proxy-configuration)
12. [Monitoring and Logging](#monitoring-and-logging)
13. [Backup and Recovery](#backup-and-recovery)
14. [Pre-Deployment Checklist](#pre-deployment-checklist)

---

## Prerequisites

| Component   | Minimum Version | Purpose                        |
|-------------|-----------------|--------------------------------|
| Python      | 3.12+           | Application runtime            |
| MongoDB     | 6.0+            | Primary database               |
| Redis       | 6.0+ (optional) | Caching and rate limit storage |
| Node.js     | 18+ (optional)  | Frontend build                 |

### System Dependencies (for OCR support)

```bash
# Ubuntu/Debian
apt-get install -y tesseract-ocr tesseract-ocr-eng poppler-utils libmagic1

# macOS
brew install tesseract poppler libmagic
```

---

## Environment Variables

Create a `.env` file in the backend root directory. Use `.env.example` as a template.

### Required Variables

| Variable         | Description                                       | Example                                    |
|------------------|---------------------------------------------------|--------------------------------------------|
| `MONGODB_URL`    | MongoDB connection string                          | `mongodb://user:pass@localhost:27017`       |
| `DATABASE_NAME`  | MongoDB database name                              | `iranian_banks`                             |
| `CORS_ORIGINS`   | Comma-separated allowed origins (no wildcards in prod) | `https://app.example.com`             |
| `SECRET_KEY`     | JWT signing secret (use `openssl rand -hex 32`)    | `a1b2c3d4...`                              |

### Optional Variables

| Variable                       | Default                      | Description                     |
|--------------------------------|------------------------------|---------------------------------|
| `DEBUG`                        | `false`                      | Enable debug mode               |
| `APP_NAME`                     | `Iranian Banks Loan Dashboard`| Application name               |
| `APP_VERSION`                  | `1.0.0`                      | Application version             |
| `API_PREFIX`                   | `/api`                       | API URL prefix                  |
| `JWT_ALGORITHM`                | `HS256`                      | JWT signing algorithm           |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `15`                      | Access token TTL (minutes)      |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS`| `7`                          | Refresh token TTL (days)        |
| `REDIS_URL`                    | `redis://localhost:6379/0`   | Redis connection URL            |
| `CACHE_ENABLED`                | `true`                       | Enable Redis caching            |
| `CACHE_DEFAULT_TTL`            | `300`                        | Default cache TTL (seconds)     |
| `CACHE_KEY_PREFIX`             | `ploan:cache`                | Redis key prefix                |

### .env File Template

```bash
# =============================================================================
# Application Configuration
# =============================================================================

# Application
APP_NAME=Iranian Banks Loan Dashboard
APP_VERSION=1.0.0
DEBUG=false

# MongoDB - REQUIRED
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=iranian_banks

# CORS - REQUIRED (no wildcards in production)
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# API
API_PREFIX=/api

# JWT Authentication - REQUIRED (generate with: openssl rand -hex 32)
SECRET_KEY=CHANGE_THIS_TO_A_SECURE_RANDOM_VALUE
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis Cache (optional but recommended)
REDIS_URL=redis://localhost:6379/0
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300
CACHE_KEY_PREFIX=ploan:cache
```

### Security Warnings

- **SECRET_KEY**: Generate a unique 64-character hex string: `openssl rand -hex 32`. Never reuse across environments.
- **CORS_ORIGINS**: Never use `*` in production. The application will refuse to start with `*` when `DEBUG=false`.
- **MONGODB_URL**: Use authentication in production. Never expose MongoDB to the public internet.

---

## MongoDB Setup

### Local Installation

```bash
# Ubuntu/Debian
sudo apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Docker

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secure_password \
  mongo:7.0
```

When using authentication, update `MONGODB_URL`:

```
MONGODB_URL=mongodb://admin:secure_password@localhost:27017
```

### MongoDB Atlas (Cloud)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user.
3. Whitelist your server IP address.
4. Copy the connection string:
   ```
   MONGODB_URL=mongodb+srv://user:password@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Verify Connection

```bash
mongosh "mongodb://localhost:27017" --eval "db.adminCommand('ping')"
```

---

## Redis Setup

Redis is optional but recommended. Without Redis, the application runs without caching, and rate limiting uses in-memory storage.

### Local Installation

```bash
# Ubuntu/Debian
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping  # Should return PONG
```

### Docker

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Redis Cloud / Managed

For managed Redis (AWS ElastiCache, Redis Cloud, etc.), set the URL with authentication:

```
REDIS_URL=redis://default:password@redis-host:6379/0
```

### Verify Connection

```bash
redis-cli ping  # Should return PONG
```

---

## Python Environment

### Setup Virtual Environment

```bash
cd backend/
python3.12 -m venv venv
source venv/bin/activate  # Linux/macOS
# or: .\venv\Scripts\activate  # Windows
```

### Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Verify Installation

```bash
python -c "import fastapi; print(f'FastAPI {fastapi.__version__}')"
python -c "import motor; print('Motor OK')"
python -c "import redis; print('Redis OK')"
```

---

## Running Database Scripts

The backend includes several scripts for database initialization and maintenance.

### 1. Import Bank Data

Load the bank and loan data from JSON source files into MongoDB:

```bash
cd backend/
python -m scripts.import_data
```

### 2. Create Database Indexes

Create indexes for query optimization (also done automatically at app startup):

```bash
python -m scripts.create_indexes
```

### 3. Apply Schema Validation

Apply MongoDB schema validators to enforce document structure:

```bash
python -m scripts.apply_schema_validation
```

### 4. Initialize Auth Collections

Set up authentication indexes and optionally create an admin user:

```bash
python -m scripts.init_auth
```

### 5. Add Numeric Fields

Add computed numeric fields to existing loan data (e.g., `interestRateNumeric`):

```bash
python -m scripts.add_numeric_fields
```

### 6. Validate Existing Data

Run validation against all existing documents:

```bash
python -m scripts.validate_existing_data
```

### Recommended Initialization Order

```bash
# 1. Import data
python -m scripts.import_data

# 2. Create indexes
python -m scripts.create_indexes

# 3. Apply schema validation
python -m scripts.apply_schema_validation

# 4. Add computed fields
python -m scripts.add_numeric_fields

# 5. Initialize auth
python -m scripts.init_auth

# 6. Validate data
python -m scripts.validate_existing_data
```

---

## Running the Application

### Development

```bash
cd backend/
source venv/bin/activate

# Start with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- API: http://localhost:8000/api
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

### Production

```bash
# Production with 4 workers
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --timeout-keep-alive 65 \
  --access-log \
  --log-level info
```

### Using the Docker Image

```bash
# Build
docker build -t ploan-backend --target production .

# Run
docker run -d \
  --name ploan-backend \
  -p 8000:8000 \
  --env-file .env \
  ploan-backend
```

---

## Health Check

### Endpoint

```
GET /health
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T10:00:00.000000+00:00",
  "version": "1.0.0",
  "components": {
    "database": {
      "status": "connected",
      "type": "mongodb"
    },
    "cache": {
      "status": "connected",
      "type": "redis",
      "keys": 42,
      "memory": "1.5M"
    },
    "rate_limiter": {
      "status": "active",
      "type": "slowapi"
    }
  }
}
```

### Status Values

| Status     | Meaning                                   |
|------------|-------------------------------------------|
| `healthy`  | Database connected, all systems nominal    |
| `degraded` | Database disconnected (critical failure)   |

### Docker Health Check

The Dockerfile includes a built-in health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

### External Monitoring

```bash
# Simple health check
curl -s http://localhost:8000/health | jq '.status'

# Check specific components
curl -s http://localhost:8000/health | jq '.components.database.status'
curl -s http://localhost:8000/health | jq '.components.cache.status'

# Health check with alerting (cron job)
#!/bin/bash
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$STATUS" != "200" ]; then
  echo "ALERT: API health check failed with status $STATUS" | mail -s "API Down" ops@example.com
fi
```

---

## Docker Deployment

### Multi-Stage Dockerfile

The included Dockerfile uses multi-stage builds:

| Stage         | Purpose                                    |
|---------------|--------------------------------------------|
| `base`        | System dependencies (Python, Tesseract)    |
| `builder`     | Install Python packages with build tools   |
| `development` | Dev server with auto-reload                |
| `production`  | Production server with 4 workers           |

### Docker Compose

Create a `docker-compose.yml` for the full stack:

```yaml
version: "3.8"

services:
  backend:
    build:
      context: ./backend
      target: production
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secure_password
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mongodb_data:
```

### Running with Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Restart backend only
docker compose restart backend

# Stop all services
docker compose down
```

---

## Production Settings

### Uvicorn Configuration

| Setting                | Dev Value       | Prod Value    | Description                       |
|------------------------|-----------------|---------------|-----------------------------------|
| `--workers`            | 1 (default)     | 4             | Number of worker processes         |
| `--reload`             | Yes             | No            | Auto-reload on code changes        |
| `--timeout-keep-alive` | 5 (default)     | 65            | Keep-alive timeout (seconds)       |
| `--log-level`          | `debug`         | `info`        | Logging verbosity                  |
| `--access-log`         | Optional        | Yes           | Log all HTTP requests              |
| `--host`               | `127.0.0.1`    | `0.0.0.0`    | Bind address                       |
| `--port`               | `8000`          | `8000`        | Listen port                        |

### Worker Count Formula

```
workers = (2 * CPU_CORES) + 1
```

For a 2-core machine: `workers = 5`. For a 4-core machine: `workers = 9`.

The Dockerfile default is 4 workers.

### Environment Variable Recommendations

| Variable                            | Dev                          | Production                        |
|-------------------------------------|------------------------------|-----------------------------------|
| `DEBUG`                             | `true`                       | `false`                           |
| `CORS_ORIGINS`                      | `http://localhost:5173`      | `https://app.example.com`         |
| `SECRET_KEY`                        | Any string                   | `openssl rand -hex 32`            |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`   | `15`                         | `15`                              |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS`     | `7`                          | `7`                               |
| `CACHE_ENABLED`                     | `true`                       | `true`                            |
| `CACHE_DEFAULT_TTL`                 | `300`                        | `300`                             |

### Process Management

For production without Docker, use a process manager like systemd:

```ini
# /etc/systemd/system/ploan-api.service
[Unit]
Description=Persian Loan API
After=network.target mongodb.service redis.service

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/opt/ploan/backend
Environment="PATH=/opt/ploan/backend/venv/bin"
EnvironmentFile=/opt/ploan/backend/.env
ExecStart=/opt/ploan/backend/venv/bin/uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --timeout-keep-alive 65 \
  --access-log \
  --log-level info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ploan-api
sudo systemctl start ploan-api
sudo systemctl status ploan-api
```

---

## Reverse Proxy Configuration

### Nginx

```nginx
upstream ploan_backend {
    server 127.0.0.1:8000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Proxy settings
    location / {
        proxy_pass http://ploan_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # WebSocket support (for future use)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Rate limit at nginx level (additional layer)
    limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://ploan_backend;
    }
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}
```

---

## Monitoring and Logging

### Log Files

| Log File             | Content                                      |
|----------------------|----------------------------------------------|
| `logs/security.log`  | Security events (JSON format)                |
| stdout/stderr        | Application logs (via loguru)                |

### Log Rotation (security.log)

Configured automatically:
- **Rotation**: Every 10 MB
- **Retention**: 90 days
- **Compression**: ZIP for rotated files

### Application Log Levels

| Level    | When to Use                                    |
|----------|------------------------------------------------|
| DEBUG    | Cache hits/misses, detailed request info       |
| INFO     | Startup, shutdown, successful operations       |
| WARNING  | Redis unavailable, failed login attempts       |
| ERROR    | Database errors, unhandled exceptions          |
| CRITICAL | Application cannot start                        |

### Structured Logging

Security events are logged in JSON format for easy parsing:

```json
{
  "event_type": "failed_login",
  "user": "john_doe",
  "ip": "192.168.1.100",
  "endpoint": "/api/auth/login",
  "correlation_id": "a1b2c3d4-...",
  "timestamp": "2026-02-05T10:00:00+00:00",
  "details": {"reason": "invalid_credentials"}
}
```

---

## Backup and Recovery

### MongoDB Backup

```bash
# Full backup
mongodump --uri="mongodb://localhost:27017" --db=iranian_banks --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017" --db=iranian_banks /backups/20260205/iranian_banks/
```

### Automated Backup Script

```bash
#!/bin/bash
# /opt/ploan/scripts/backup.sh
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
mongodump --uri="mongodb://localhost:27017" --db=iranian_banks --out="$BACKUP_DIR/$DATE"

# Compress
tar -czf "$BACKUP_DIR/$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Clean old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR/$DATE.tar.gz"
```

Add to cron:

```bash
# Daily backup at 2 AM
0 2 * * * /opt/ploan/scripts/backup.sh >> /var/log/ploan-backup.log 2>&1
```

---

## Pre-Deployment Checklist

### Security

- [ ] `SECRET_KEY` is a unique, randomly generated 64-character hex string
- [ ] `DEBUG=false`
- [ ] `CORS_ORIGINS` lists only the exact frontend origins (no wildcards)
- [ ] MongoDB is configured with authentication
- [ ] MongoDB is not exposed to the public internet
- [ ] Redis is configured with a password (if network-accessible)
- [ ] HTTPS is configured (TLS termination at reverse proxy)
- [ ] Security headers are set (X-Content-Type-Options, X-Frame-Options)

### Database

- [ ] MongoDB is running and accessible
- [ ] Bank data has been imported (`scripts/import_data.py`)
- [ ] Database indexes have been created (`scripts/create_indexes.py`)
- [ ] Schema validators have been applied (`scripts/apply_schema_validation.py`)
- [ ] Numeric fields have been added (`scripts/add_numeric_fields.py`)
- [ ] Auth collections are initialized (`scripts/init_auth.py`)
- [ ] Data has been validated (`scripts/validate_existing_data.py`)

### Cache

- [ ] Redis is running (or `CACHE_ENABLED=false` if not using cache)
- [ ] Redis memory limit is configured (`maxmemory 256mb`)
- [ ] Redis eviction policy is set (`maxmemory-policy allkeys-lru`)

### Application

- [ ] All environment variables are set in `.env`
- [ ] Uvicorn is configured with appropriate worker count
- [ ] Health check endpoint returns `"status": "healthy"`
- [ ] Process manager is configured (systemd/Docker)
- [ ] Auto-restart on failure is enabled

### Monitoring

- [ ] Health check monitoring is configured
- [ ] Log rotation is working
- [ ] Security log is being written
- [ ] Backup schedule is configured
- [ ] Alert system is in place for health check failures
