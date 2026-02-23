#!/bin/bash
# Initializes a PostgreSQL streaming replica via pg_basebackup, then starts
# the server in hot-standby mode under the postgres system user.
# pg_basebackup is skipped on subsequent starts (PG_VERSION already present).
set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PRIMARY_HOST="${PRIMARY_HOST:-db}"
REPLICATION_USER="${REPLICATION_USER:-replicator}"
REPLICATION_PASSWORD="${POSTGRES_REPLICATION_PASSWORD:-replicapass}"

echo "[replica] Waiting for primary at ${PRIMARY_HOST}:5432 …"
until pg_isready -h "$PRIMARY_HOST" -p 5432 -q 2>/dev/null; do
  sleep 2
done
echo "[replica] Primary is ready."

mkdir -p "$PGDATA"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[replica] PGDATA empty — running pg_basebackup …"
  # Ensure postgres user owns the directory before pg_basebackup writes to it
  chown postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"

  PGPASSWORD="$REPLICATION_PASSWORD" gosu postgres pg_basebackup \
    -h "$PRIMARY_HOST" \
    -U "$REPLICATION_USER" \
    -D "$PGDATA" \
    --checkpoint=fast \
    -Xs -R -P

  echo "[replica] pg_basebackup complete."
else
  echo "[replica] PGDATA exists — skipping pg_basebackup."
fi

# Always ensure correct ownership before handing off to the server
chown -R postgres:postgres "$PGDATA"

echo "[replica] Starting PostgreSQL in hot-standby mode …"
exec gosu postgres postgres -c config_file=/etc/postgresql/postgresql-replica.conf
