-- Migration 001: Add missing indexes for query performance
-- Run with: psql $DATABASE_URL -f migrations/001_add_indexes.sql

-- Options: composite index for chain queries filtering by underlying + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_options_underlying_date
  ON options (underlying, date);

-- Codal: composite index for symbol + date_publish filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_codal_symbol_date_publish
  ON codal_announcements (symbol, date_publish);

-- IME Physical: index for symbol-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ime_physical_symbol
  ON ime_physical_trades (symbol);

-- Shareholders: index for cross-security shareholder lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shareholders_shareholder_id
  ON shareholders (shareholder_id);

-- pgvector: HNSW index for cosine similarity search on document_chunks
-- Requires: CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
