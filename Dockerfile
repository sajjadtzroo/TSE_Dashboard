# ═════════════════════════════════════════════════════════════════════════════
# Stage 1a: Build main React frontend
# ═════════════════════════════════════════════════════════════════════════════
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ .
RUN npm run build


# ═════════════════════════════════════════════════════════════════════════════
# Stage 2: Python base (shared dependencies)
# ═════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim AS python-base

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

COPY requirements.txt requirements-dashboard.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dashboard.txt

# Copy application code
COPY api/ ./api/
COPY config/ ./config/
COPY database/ ./database/
COPY rag/ ./rag/
COPY scheduler/ ./scheduler/
COPY services/ ./services/
COPY tsetmc_scraper/ ./tsetmc_scraper/
COPY scripts/ ./scripts/
# COPY persian_loan/ ./persian_loan/
COPY alembic.ini scrapy.cfg iran_stocks.json iran_funds.json ./
COPY alembic/ ./alembic/

RUN mkdir -p data logs && chown -R appuser:appuser /app


# ═════════════════════════════════════════════════════════════════════════════
# Stage 3: API service (Gunicorn + Uvicorn workers)
# ═════════════════════════════════════════════════════════════════════════════
FROM python-base AS api

# Copy frontend dist for fallback SPA serving (when SERVE_STATIC=true)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

USER appuser
EXPOSE 8000

# Workers: (2 × CPU_CORES) + 1 formula; override via GUNICORN_WORKERS env var
# Default 8 suits a 4-core host; scale with APP_CPU_LIMIT / APP_REPLICAS
CMD ["sh", "-c", "exec gunicorn api.main:app \
     --worker-class uvicorn.workers.UvicornWorker \
     --workers ${GUNICORN_WORKERS:-8} \
     --worker-connections ${GUNICORN_WORKER_CONNECTIONS:-1000} \
     --bind 0.0.0.0:8000 \
     --max-requests ${GUNICORN_MAX_REQUESTS:-1200} \
     --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER:-100} \
     --timeout ${GUNICORN_TIMEOUT:-120} \
     --graceful-timeout 30 \
     --keep-alive 5 \
     --access-logfile -"]


# ═════════════════════════════════════════════════════════════════════════════
# Stage 4: Scheduler service (single instance, runs APScheduler + Scrapy)
# ═════════════════════════════════════════════════════════════════════════════
FROM python-base AS scheduler

USER appuser
CMD ["python", "-m", "scheduler.scheduler"]


# ═════════════════════════════════════════════════════════════════════════════
# Stage 5: Tick Ingestor (real-time BrsAPI → TimescaleDB poller)
# ═════════════════════════════════════════════════════════════════════════════
FROM python-base AS tick_ingestor

USER appuser
EXPOSE 9091

CMD ["python", "-m", "services.tick_ingestor"]


# ═════════════════════════════════════════════════════════════════════════════
# Stage 6: Nginx with built frontend
# ═════════════════════════════════════════════════════════════════════════════
FROM nginx:1.25-alpine AS nginx

COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
