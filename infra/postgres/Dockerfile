# pgvector/pgvector:pg16 = postgres:16-bookworm + pgvector pre-installed
# We install TimescaleDB on top via the official Debian packages
FROM pgvector/pgvector:pg16

RUN apt-get update \
    && apt-get install -y --no-install-recommends gnupg wget ca-certificates \
    && update-ca-certificates \
    && wget --no-check-certificate -qO- https://packagecloud.io/timescale/timescaledb/gpgkey \
       | gpg --dearmor -o /usr/share/keyrings/timescaledb.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/timescaledb.gpg] \
       https://packagecloud.io/timescale/timescaledb/debian/ bookworm main" \
       > /etc/apt/sources.list.d/timescaledb.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends timescaledb-2-postgresql-16 \
    && rm -rf /var/lib/apt/lists/*

# Init scripts — run automatically by the official postgres entrypoint on first start
COPY initdb/ /docker-entrypoint-initdb.d/
