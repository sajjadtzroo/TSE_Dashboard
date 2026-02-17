# Stage 1 — Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2 — Python runtime
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt requirements-dashboard.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dashboard.txt

COPY api/ ./api/
COPY config/ ./config/
COPY database/ ./database/
COPY rag/ ./rag/
COPY scheduler/ ./scheduler/
COPY tsetmc_scraper/ ./tsetmc_scraper/
COPY scripts/ ./scripts/
COPY scrapy.cfg iran_stocks.json iran_funds.json ./

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p data logs

EXPOSE 8000

CMD ["python", "api/main.py"]
