# DevOps Quick Reference Card

Quick commands and references for the Persian Loan Banks DevOps infrastructure.

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd Persian_Loan
cp .env.example .env

# Start all services
docker-compose up -d

# Install pre-commit hooks
pip install pre-commit
pre-commit install
```

## Docker Commands

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Remove volumes (clean slate)
docker-compose down -v

# Start with admin UI
docker-compose --profile admin up -d
```

### Production

```bash
# Build production images
docker build -t persian-loan-backend:prod \
  --target production \
  ./banks-s3-organized/project-template/backend

docker build -t persian-loan-frontend:prod \
  --target production \
  ./frontend

# Deploy production
docker-compose -f docker-compose.prod.yml up -d
```

## Health Checks

```bash
# Backend health
curl http://localhost:8000/health | jq .

# Frontend (via nginx in production)
curl http://localhost/health

# MongoDB
docker exec -it persian-loan-mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec -it persian-loan-redis redis-cli ping
```

## Testing

### Backend

```bash
cd banks-s3-organized/project-template/backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_banks.py

# Run with verbose output
pytest -v
```

### Frontend

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test

# Run specific test
npm test -- src/components/BankList.test.tsx
```

## Code Quality

### Pre-commit

```bash
# Run all hooks
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files

# Update hooks
pre-commit autoupdate
```

### Backend Linting

```bash
cd banks-s3-organized/project-template/backend

# Ruff linting
ruff check app/
ruff check app/ --fix

# Black formatting
black app/
black app/ --check

# isort import sorting
isort app/
isort app/ --check-only

# MyPy type checking
mypy app/ --ignore-missing-imports
```

### Frontend Linting

```bash
cd frontend

# ESLint
npm run lint
npm run lint -- --fix

# TypeScript check
npx tsc --noEmit

# Prettier
npx prettier --write src/
```

## Monitoring

### Logs

```bash
# Backend logs
tail -f banks-s3-organized/project-template/backend/logs/app_$(date +%Y-%m-%d).log

# Error logs only
tail -f banks-s3-organized/project-template/backend/logs/error_$(date +%Y-%m-%d).log

# Docker logs
docker logs persian-loan-backend -f
docker logs persian-loan-frontend -f
```

### Redis Monitoring

```bash
# Real-time stats
docker exec -it persian-loan-redis redis-cli --stat

# Get info
docker exec -it persian-loan-redis redis-cli INFO

# Monitor commands
docker exec -it persian-loan-redis redis-cli MONITOR

# Check memory
docker exec -it persian-loan-redis redis-cli INFO memory
```

### MongoDB Monitoring

```bash
# Database stats
docker exec -it persian-loan-mongodb mongosh --eval "db.stats()"

# Collection stats
docker exec -it persian-loan-mongodb mongosh --eval "db.banks.stats()"

# Current operations
docker exec -it persian-loan-mongodb mongosh --eval "db.currentOp()"

# Server status
docker exec -it persian-loan-mongodb mongosh --eval "db.serverStatus()"
```

## Database Operations

### MongoDB

```bash
# Connect to MongoDB
docker exec -it persian-loan-mongodb mongosh -u admin -p

# Backup database
docker exec persian-loan-mongodb mongodump \
  --uri="mongodb://admin:password@localhost:27017" \
  --out=/backup

# Restore database
docker exec persian-loan-mongodb mongorestore \
  --uri="mongodb://admin:password@localhost:27017" \
  /backup

# Export collection
docker exec persian-loan-mongodb mongoexport \
  --uri="mongodb://admin:password@localhost:27017/iranian_banks" \
  --collection=banks \
  --out=/backup/banks.json
```

### Redis

```bash
# Connect to Redis
docker exec -it persian-loan-redis redis-cli -a password

# Flush all data
docker exec -it persian-loan-redis redis-cli -a password FLUSHALL

# Get all keys
docker exec -it persian-loan-redis redis-cli -a password KEYS '*'

# Backup
docker exec persian-loan-redis redis-cli -a password SAVE
```

## CI/CD

### GitHub Actions

```bash
# Trigger backend CI
git add banks-s3-organized/project-template/backend/
git commit -m "feat: Update backend"
git push

# Trigger frontend CI
git add frontend/
git commit -m "feat: Update frontend"
git push

# Manual deployment
gh workflow run deploy.yml -f environment=staging
gh workflow run deploy.yml -f environment=production
```

### View Workflow Status

```bash
# List workflows
gh workflow list

# View runs
gh run list

# View specific run
gh run view <run-id>

# Watch run
gh run watch
```

## Troubleshooting

### Port Conflicts

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or stop all Docker containers
docker-compose down
```

### Container Issues

```bash
# View container logs
docker logs <container-name> --tail 100

# Exec into container
docker exec -it <container-name> bash

# Inspect container
docker inspect <container-name>

# Restart container
docker restart <container-name>
```

### Clean Docker

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything
docker system prune -a --volumes
```

### Reset Development Environment

```bash
# Stop all services
docker-compose down -v

# Remove all data
rm -rf banks-s3-organized/project-template/backend/logs/*
rm -rf banks-s3-organized/project-template/backend/htmlcov
rm -rf frontend/dist
rm -rf frontend/coverage

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

## Environment Variables

### Required Variables

```bash
# Database
MONGO_PASSWORD=securepassword123
DATABASE_NAME=iranian_banks

# Redis
REDIS_PASSWORD=redispass123

# Security
JWT_SECRET_KEY=$(openssl rand -hex 32)

# CORS
CORS_ORIGINS=http://localhost:5173
```

### Generate Secrets

```bash
# JWT secret (256-bit)
openssl rand -hex 32

# Random password
openssl rand -base64 32

# UUID
python -c "import uuid; print(uuid.uuid4())"
```

## Performance

### Backend Optimization

```bash
# Start with multiple workers
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000

# Calculate optimal workers
python -c "import os; print((2 * os.cpu_count()) + 1)"
```

### Frontend Build

```bash
cd frontend

# Build for production
npm run build

# Analyze bundle
npm run build -- --mode production

# Preview production build
npm run preview
```

## Security

### Security Scanning

```bash
# Backend security scan
cd banks-s3-organized/project-template/backend
bandit -r app/

# Frontend security scan
cd frontend
npm audit
npm audit fix

# Docker security scan
docker scan persian-loan-backend:latest
```

### Update Dependencies

```bash
# Backend
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt

# Frontend
npm update
npm audit fix
```

## Useful URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:8000 | - |
| API Docs | http://localhost:8000/docs | - |
| Frontend | http://localhost:5173 | - |
| Mongo Express | http://localhost:8081 | admin/admin123 |
| Redis CLI | `docker exec -it persian-loan-redis redis-cli` | redispass123 |

## File Locations

| Item | Location |
|------|----------|
| Backend code | `/banks-s3-organized/project-template/backend/app/` |
| Frontend code | `/frontend/src/` |
| Backend logs | `/banks-s3-organized/project-template/backend/logs/` |
| Backend tests | `/banks-s3-organized/project-template/backend/tests/` |
| Frontend tests | `/frontend/src/**/*.test.tsx` |
| Docker compose | `/docker-compose.yml` |
| CI/CD workflows | `/.github/workflows/` |
| Environment vars | `/.env` |

## Support

For detailed documentation, see:
- **Full DevOps Guide**: `/DEVOPS_SETUP_COMPLETE.md`
- **Monitoring**: `/banks-s3-organized/project-template/backend/docs/MONITORING.md`
- **Environment Setup**: `/docs/ENVIRONMENT_SETUP.md`
- **Backend README**: `/banks-s3-organized/project-template/backend/README.md`
- **Frontend README**: `/frontend/README.md`

## Emergency Procedures

### Rollback Deployment

```bash
# Using Docker tags
docker-compose down
docker pull persian-loan-backend:previous
docker pull persian-loan-frontend:previous
docker-compose up -d
```

### Database Recovery

```bash
# Stop application
docker-compose down

# Restore from backup
docker exec persian-loan-mongodb mongorestore \
  --uri="mongodb://admin:password@localhost:27017" \
  --drop \
  /backup

# Start application
docker-compose up -d
```

### Clear Cache

```bash
# Clear Redis cache
docker exec -it persian-loan-redis redis-cli -a redispass123 FLUSHALL
```

---

**Quick Help**: Run `docker-compose --help` or `docker --help` for more options.
