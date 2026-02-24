-- Creates the streaming replication user.
-- Runs automatically on first DB initialisation (docker-entrypoint-initdb.d).
-- The password is overridden by POSTGRES_REPLICATION_PASSWORD in docker-compose.yml
-- via the replica entrypoint; keeping a default here ensures the user exists even
-- in bare `docker run` scenarios.
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicapass';
