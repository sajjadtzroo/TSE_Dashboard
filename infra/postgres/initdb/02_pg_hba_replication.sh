#!/bin/bash
# Appends a pg_hba.conf entry that allows streaming replication from any
# Docker bridge network (172.16.0.0/12 covers Docker's default range).
# Runs automatically on first DB initialisation via docker-entrypoint-initdb.d.
set -e

HBA="$PGDATA/pg_hba.conf"

if ! grep -q "replicator.*172\." "$HBA" 2>/dev/null; then
  echo "host    replication     replicator      172.16.0.0/12           scram-sha-256" >> "$HBA"
  echo "[initdb] Appended replication pg_hba entry for 172.16.0.0/12"
fi
