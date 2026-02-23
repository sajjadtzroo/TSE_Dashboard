#!/bin/bash
# Creates the replication user and grants pg_hba access for streaming replication.
# Runs once on first DB initialization (initdb.d scripts are skipped if data dir exists).
set -e

REPLICATION_PASSWORD="${POSTGRES_REPLICATION_PASSWORD:-replicapass}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
EOSQL

# Allow replication connections from any host in the Docker network
cat >> "$PGDATA/pg_hba.conf" <<-EOF

# Streaming replication — allow from Docker internal network
host  replication  replicator  0.0.0.0/0  scram-sha-256
EOF

pg_ctl reload -D "$PGDATA"
echo "Replication user and pg_hba entry created."
