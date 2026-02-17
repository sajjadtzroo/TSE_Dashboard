# Docker Deployment Guide

## Overview

This project uses Docker and Docker Compose for containerized deployment. Two configurations are provided:

- **`docker-compose.yml`** - Development environment with hot-reload
- **`docker-compose.prod.yml`** - Production environment with optimizations

## Prerequisites

- Docker Engine 20.10+
- Docker Compose V2+
- 4GB+ available RAM
- 10GB+ available disk space

## Quick Start

### Development Environment

```bash
# Copy environment variables
cp .env.example .env

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Services:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MongoDB: localhost:27017

### Production Environment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down
```

## Service Profiles

### Admin Profile (Mongo Express)

Database admin UI for development:

```bash
docker compose --profile admin up -d
```

Access: http://localhost:8081

**Credentials:**
- Username: admin
- Password: admin123 (changeable in .env)

### Cache Profile (Redis)

Enable Redis caching:

```bash
docker compose --profile cache up -d
```

## Common Commands

### View Service Status

```bash
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Rebuild Services

```bash
# Rebuild all
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend
```

### Execute Commands in Containers

```bash
# Backend shell
docker compose exec backend bash

# Frontend shell
docker compose exec frontend sh

# MongoDB shell
docker compose exec mongodb mongosh -u admin -p securepassword123
```

### Database Operations

```bash
# Backup MongoDB
docker compose exec mongodb mongodump \
  --username=admin \
  --password=securepassword123 \
  --out=/tmp/backup

# Restore MongoDB
docker compose exec mongodb mongorestore \
  --username=admin \
  --password=securepassword123 \
  /tmp/backup
```

### Clean Up

```bash
# Stop and remove containers, networks
docker compose down

# Remove containers, networks, and volumes (⚠️  DATA LOSS)
docker compose down -v

# Remove all (containers, networks, volumes, images)
docker compose down -v --rmi all
```

## Environment Variables

See `.env.example` for all available variables.

**Key Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_PASSWORD` | MongoDB root password | securepassword123 |
| `DATABASE_NAME` | Database name | iranian_banks |
| `BACKEND_PORT` | Backend API port | 8000 |
| `FRONTEND_PORT` | Frontend port | 5173 (dev) / 80 (prod) |
| `DEBUG` | Enable debug mode | true |
| `CORS_ORIGINS` | Allowed CORS origins | localhost URLs |

## Health Checks

All services include health checks:

```bash
# Check service health
docker compose ps

# Manual health check
curl http://localhost:8000/health  # Backend
curl http://localhost:5173/health  # Frontend (prod only)
```

## Resource Limits

### Development

- MongoDB: 2 CPU, 2GB RAM
- Backend: 1 CPU, 1GB RAM
- Frontend: 1 CPU, 1GB RAM

### Production

- MongoDB: 4 CPU, 4GB RAM
- Backend: 2 CPU, 2GB RAM
- Frontend: 1 CPU, 512MB RAM

Adjust in docker-compose files under `deploy.resources`.

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8000

# Or change port in .env
BACKEND_PORT=8001
```

### Container Won't Start

```bash
# View detailed logs
docker compose logs backend

# Check container status
docker compose ps
docker inspect <container-name>
```

### Database Connection Issues

```bash
# Verify MongoDB is running
docker compose ps mongodb

# Check MongoDB logs
docker compose logs mongodb

# Test connection
docker compose exec mongodb mongosh \
  -u admin -p securepassword123 \
  --eval "db.adminCommand('ping')"
```

### Out of Memory

```bash
# Check Docker resource usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings → Resources → Memory
```

### Permission Issues

```bash
# Reset ownership (Linux)
sudo chown -R $USER:$USER .

# Reset file permissions
chmod -R 755 backend frontend
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Update all passwords in `.env`
- [ ] Set `DEBUG=false`
- [ ] Configure proper `CORS_ORIGINS`
- [ ] Use HTTPS URLs
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Test health checks
- [ ] Load test application

### Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Build images
docker compose -f docker-compose.prod.yml build

# 3. Start services
docker compose -f docker-compose.prod.yml up -d

# 4. Verify health
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8000/health
```

### Monitoring

```bash
# Monitor resource usage
docker stats

# Monitor logs
docker compose -f docker-compose.prod.yml logs -f \
  | grep -i error
```

### Updates

```bash
# Zero-downtime update strategy
# 1. Pull new images
docker compose -f docker-compose.prod.yml pull

# 2. Recreate containers
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend

# 3. Verify
docker compose -f docker-compose.prod.yml ps
```

## Security Best Practices

1. **Never commit `.env` to version control**
2. **Use strong passwords** (16+ characters)
3. **Bind to localhost** in production (127.0.0.1)
4. **Run services as non-root** (configured in Dockerfiles)
5. **Keep images updated** regularly
6. **Use Docker secrets** for sensitive data
7. **Enable firewall** and restrict ports
8. **Implement rate limiting** in production
9. **Regular security audits**
10. **Monitor logs** for suspicious activity

## Performance Optimization

### Build Cache

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker compose build
```

### Multi-stage Builds

Both Dockerfiles use multi-stage builds to minimize image size:

- Backend: ~200MB (vs ~500MB single-stage)
- Frontend: ~25MB (vs ~1GB single-stage)

### Volume Performance

Use `delegated` mode for better performance on macOS:

```yaml
volumes:
  - ./backend/app:/app/app:delegated
```

## Backup Strategy

### Automated Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

docker compose exec -T mongodb mongodump \
  --username=admin \
  --password=${MONGO_PASSWORD} \
  --archive=/tmp/db.archive

docker compose cp mongodb:/tmp/db.archive $BACKUP_DIR/
EOF

chmod +x backup.sh

# Schedule with cron
# 0 2 * * * /path/to/backup.sh
```

### Restore from Backup

```bash
docker compose cp backups/latest/db.archive mongodb:/tmp/
docker compose exec mongodb mongorestore \
  --username=admin \
  --password=${MONGO_PASSWORD} \
  --archive=/tmp/db.archive
```

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review health checks: `docker compose ps`
- Consult documentation: `/docs` endpoint
- GitHub Issues: [Repository URL]
