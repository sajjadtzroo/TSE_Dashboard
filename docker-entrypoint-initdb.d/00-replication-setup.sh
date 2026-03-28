#!/bin/bash
# Creates the replication user and grants pg_hba access for streaming replication.
# Runs once on first DB initialization (initdb.d scripts are skipped if data dir exists).
set -e

REPLICATION_PASSWORD="${POSTGRES_REPLICATION_PASSWORD:?POSTGRES_REPLICATION_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
EOSQL

# Allow replication connections only from Docker internal network (172.16.0.0/12)
cat >> "$PGDATA/pg_hba.conf" <<-EOF

# Streaming replication — allow from Docker internal network only
host  replication  replicator  172.16.0.0/12  scram-sha-256
EOF

pg_ctl reload -D "$PGDATA"
echo "Replication user and pg_hba entry created."
