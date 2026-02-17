# Environment Setup Guide

Complete guide for setting up development and production environments for the Persian Loan Banks application.

## Table of Contents

- [Development Environment](#development-environment)
- [Production Environment](#production-environment)
- [Environment Variables Reference](#environment-variables-reference)
- [Secret Management](#secret-management)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Performance Tuning](#performance-tuning)

## Development Environment

### Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18 or higher
- **Docker**: 24.0 or higher
- **Docker Compose**: 2.20 or higher
- **Git**: 2.40 or higher

### Quick Start (Docker)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Persian_Loan
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Verify services**:
   ```bash
   # Backend health check
   curl http://localhost:8000/health

   # Frontend
   open http://localhost:5173

   # Mongo Express (admin UI)
   open http://localhost:8081
   ```

### Local Development (No Docker)

#### Backend Setup

1. **Navigate to backend**:
   ```bash
   cd banks-s3-organized/project-template/backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env file
   ```

5. **Run MongoDB locally** (or use Docker):
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=securepassword123 \
     mongo:7.0
   ```

6. **Run Redis locally** (or use Docker):
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 --name redis \
     redis:7-alpine redis-server --requirepass redispass123
   ```

7. **Start backend**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to frontend**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Create environment file**:
   ```bash
   cp .env.development .env
   # Edit .env file
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Pre-commit Hooks Setup

1. **Install pre-commit**:
   ```bash
   pip install pre-commit
   ```

2. **Install hooks**:
   ```bash
   pre-commit install
   ```

3. **Run hooks manually**:
   ```bash
   pre-commit run --all-files
   ```

## Production Environment

### Production Checklist

- [ ] Set `DEBUG=false`
- [ ] Use strong `JWT_SECRET_KEY` (32+ characters)
- [ ] Configure `CORS_ORIGINS` with production domains only
- [ ] Set secure database passwords
- [ ] Enable HTTPS/TLS
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up error tracking (Sentry)
- [ ] Enable database authentication
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Configure resource limits
- [ ] Set up health check monitoring
- [ ] Configure CDN for frontend assets

### Production Deployment (Docker)

1. **Create production environment file**:
   ```bash
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Build production images**:
   ```bash
   # Backend
   docker build -t persian-loan-backend:latest \
     --target production \
     ./banks-s3-organized/project-template/backend

   # Frontend
   docker build -t persian-loan-frontend:latest \
     --target production \
     ./frontend
   ```

3. **Deploy with docker-compose**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify deployment**:
   ```bash
   # Health checks
   curl https://api.yourdomain.com/health
   curl https://yourdomain.com/health
   ```

### Production Environment Variables

```bash
# Production .env
NODE_ENV=production
DEBUG=false

# Database
MONGO_PASSWORD=<strong-password-here>
DATABASE_NAME=iranian_banks

# Redis
REDIS_PASSWORD=<strong-password-here>

# Security
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
CORS_ORIGINS=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Monitoring (optional)
SENTRY_DSN=<your-sentry-dsn>
```

## Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URL` | Yes | - | MongoDB connection string |
| `DATABASE_NAME` | Yes | `iranian_banks` | Database name |
| `REDIS_URL` | Yes | - | Redis connection string |
| `REDIS_PASSWORD` | Yes | - | Redis password |
| `JWT_SECRET_KEY` | Yes | - | Secret key for JWT tokens |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Token expiration time |
| `DEBUG` | No | `false` | Enable debug mode |
| `CORS_ORIGINS` | Yes | - | Allowed CORS origins (comma-separated) |
| `API_PREFIX` | No | `/api` | API route prefix |
| `RATE_LIMIT_PER_MINUTE` | No | `100` | Rate limit per minute |
| `APP_NAME` | No | `Persian Loan Banks API` | Application name |
| `APP_VERSION` | No | `1.0.0` | Application version |
| `SENTRY_DSN` | No | - | Sentry error tracking DSN |
| `LOG_LEVEL` | No | `INFO` | Logging level |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |
| `NODE_ENV` | No | `development` | Environment mode |

### Infrastructure Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_PORT` | No | `27017` | MongoDB port |
| `REDIS_PORT` | No | `6379` | Redis port |
| `BACKEND_PORT` | No | `8000` | Backend port |
| `FRONTEND_PORT` | No | `5173` | Frontend port |
| `MONGO_EXPRESS_PORT` | No | `8081` | Mongo Express port |

## Secret Management

### Development

Use `.env` files (not committed to git):

```bash
# .env
JWT_SECRET_KEY=dev-secret-key-not-for-production
MONGO_PASSWORD=dev-password-123
REDIS_PASSWORD=dev-redis-pass
```

### Production

#### Option 1: Environment Variables

Set environment variables directly in production environment:

```bash
# Docker
docker run -e JWT_SECRET_KEY=$JWT_SECRET_KEY ...

# Kubernetes
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=$JWT_SECRET_KEY \
  --from-literal=mongo-password=$MONGO_PASSWORD
```

#### Option 2: Secret Management Services

Use dedicated secret management:

- **AWS Secrets Manager**
- **Azure Key Vault**
- **Google Secret Manager**
- **HashiCorp Vault**

Example with AWS Secrets Manager:

```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

secrets = get_secret('persian-loan-banks/prod')
JWT_SECRET_KEY = secrets['jwt_secret_key']
```

#### Option 3: Docker Secrets

Use Docker Swarm secrets:

```yaml
# docker-compose.yml
secrets:
  jwt_secret:
    external: true
  mongo_password:
    external: true

services:
  backend:
    secrets:
      - jwt_secret
      - mongo_password
```

### Best Practices

1. **Never commit secrets** to version control
2. **Rotate secrets regularly** (every 90 days)
3. **Use strong passwords** (32+ characters, random)
4. **Separate secrets** per environment
5. **Encrypt secrets at rest**
6. **Limit access** to secrets (principle of least privilege)
7. **Audit secret access**
8. **Use different secrets** for each environment

### Generating Secrets

```bash
# Generate JWT secret (256-bit)
openssl rand -hex 32

# Generate secure password
openssl rand -base64 32

# Generate UUID
python -c "import uuid; print(uuid.uuid4())"
```

## Database Configuration

### MongoDB Connection Pooling

```python
# app/core/database.py
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(
    settings.MONGODB_URL,
    maxPoolSize=50,          # Max connections in pool
    minPoolSize=10,          # Min connections in pool
    maxIdleTimeMS=30000,     # Max idle time (30s)
    waitQueueTimeoutMS=5000, # Wait timeout (5s)
    serverSelectionTimeoutMS=5000,  # Server selection timeout (5s)
)
```

### MongoDB Performance Settings

```yaml
# MongoDB configuration
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4  # Adjust based on available RAM
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

net:
  maxIncomingConnections: 100
```

### Database Indexes

Ensure these indexes are created:

```javascript
// Banks collection
db.banks.createIndex({ bank_id: 1 }, { unique: true })
db.banks.createIndex({ name: 1 })
db.banks.createIndex({ type: 1 })
db.banks.createIndex({ created_at: -1 })

// Loans collection
db.loans.createIndex({ loan_id: 1 }, { unique: true })
db.loans.createIndex({ bank_id: 1 })
db.loans.createIndex({ interest_rate: 1 })
db.loans.createIndex({ max_amount: 1 })
db.loans.createIndex({ loan_type: 1 })
db.loans.createIndex({ created_at: -1 })

// Compound indexes
db.loans.createIndex({ bank_id: 1, loan_type: 1 })
db.loans.createIndex({ interest_rate: 1, max_amount: 1 })
```

## Redis Configuration

### Redis Connection Settings

```python
# app/core/cache.py
from redis.asyncio import Redis

redis_client = Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    db=0,
    decode_responses=True,
    max_connections=50,
    socket_connect_timeout=5,
    socket_keepalive=True,
    health_check_interval=30,
)
```

### Redis Performance Tuning

```conf
# redis.conf

# Memory settings
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (for development)
save 900 1
save 300 10
save 60 10000

# AOF persistence (production)
appendonly yes
appendfsync everysec

# Connection settings
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Performance
slowlog-log-slower-than 10000
slowlog-max-len 128
```

### Redis Cache Strategy

```python
# Cache TTL settings
CACHE_TTL = {
    'banks_list': 300,      # 5 minutes
    'bank_detail': 600,     # 10 minutes
    'loans_list': 180,      # 3 minutes
    'loan_detail': 300,     # 5 minutes
    'analytics': 600,       # 10 minutes
    'comparison': 300,      # 5 minutes
}
```

## Performance Tuning

### Backend Performance

1. **Uvicorn Workers**:
   ```bash
   # Production
   uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000

   # Calculate workers: (2 x CPU cores) + 1
   workers = (2 * os.cpu_count()) + 1
   ```

2. **Database Connection Pool**:
   ```python
   # Tune based on workers
   max_pool_size = workers * 10
   min_pool_size = workers * 2
   ```

3. **Redis Connection Pool**:
   ```python
   max_connections = workers * 10
   ```

### Frontend Performance

1. **Build Optimization**:
   ```javascript
   // vite.config.ts
   export default defineConfig({
     build: {
       target: 'esnext',
       minify: 'terser',
       terserOptions: {
         compress: {
           drop_console: true,
         },
       },
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             mui: ['@mui/material', '@mui/icons-material'],
           },
         },
       },
     },
   })
   ```

2. **Nginx Caching**:
   ```nginx
   # Static assets caching
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### Resource Limits

#### Docker Compose

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

#### Kubernetes

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

## Monitoring Setup

### Health Check Endpoints

- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:5173/health` (via nginx)
- MongoDB: `mongosh --eval "db.adminCommand('ping')"`
- Redis: `redis-cli ping`

### Log Locations

- Backend logs: `./banks-s3-organized/project-template/backend/logs/`
- Nginx logs: `/var/log/nginx/`
- MongoDB logs: `/var/log/mongodb/`
- Redis logs: `/var/log/redis/`

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Find process using port
   lsof -i :8000
   # Kill process
   kill -9 <PID>
   ```

2. **Docker permission denied**:
   ```bash
   sudo usermod -aG docker $USER
   # Logout and login again
   ```

3. **MongoDB connection failed**:
   ```bash
   # Check MongoDB is running
   docker ps | grep mongodb
   # Check connection string
   mongosh "mongodb://admin:password@localhost:27017"
   ```

4. **Redis connection failed**:
   ```bash
   # Check Redis is running
   docker ps | grep redis
   # Test connection
   redis-cli -a password ping
   ```

## Quick Reference

### Development Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build

# Run tests
cd banks-s3-organized/project-template/backend && pytest
cd frontend && npm test
```

### Production Commands

```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Health checks
curl https://api.yourdomain.com/health

# View logs
docker logs persian-loan-backend -f

# Backup database
mongodump --uri="mongodb://admin:password@localhost:27017" --out=backup/

# Restore database
mongorestore --uri="mongodb://admin:password@localhost:27017" backup/
```

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
