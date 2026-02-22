FROM timescale/timescaledb:latest-pg16

# Install pgvector on top of TimescaleDB's PostgreSQL 16
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*
