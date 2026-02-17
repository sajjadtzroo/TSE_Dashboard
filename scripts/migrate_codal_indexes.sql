-- Migration: Add symbol FK + pg_trgm GIN indexes for codal_announcements
-- Run: psql -U postgres -d tsetmc -f scripts/migrate_codal_indexes.sql

-- 1. Enable pg_trgm extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add unique constraint on securities.symbol
--    First remove duplicates, keeping the newest security_id
DELETE FROM securities a
  USING securities b
  WHERE a.security_id < b.security_id
    AND a.symbol = b.symbol;

ALTER TABLE securities
  ADD CONSTRAINT uq_securities_symbol UNIQUE (symbol);

-- 3. Clean up orphan symbols in codal_announcements that don't exist in securities
UPDATE codal_announcements
   SET symbol = NULL
 WHERE symbol IS NOT NULL
   AND symbol NOT IN (SELECT symbol FROM securities WHERE symbol IS NOT NULL);

-- 4. Add FK from codal_announcements.symbol -> securities.symbol
ALTER TABLE codal_announcements
  ADD CONSTRAINT fk_codal_symbol
  FOREIGN KEY (symbol) REFERENCES securities(symbol) ON DELETE SET NULL;

-- 5. Add pg_trgm GIN indexes for ILIKE search (CONCURRENTLY = no table lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_codal_title_trgm
    ON codal_announcements USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_codal_company_name_trgm
    ON codal_announcements USING gin (company_name gin_trgm_ops);
