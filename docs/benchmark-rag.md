# RAG Pipeline Benchmark

> **Date**: 2026-02-23 | **Type**: Architecture analysis & latency estimation | **No load tests** — chat hits external LLM APIs

---

## Overview

The TSE Dashboard implements a multi-agent RAG (Retrieval Augmented Generation) system for financial Q&A. The pipeline covers document ingestion, hybrid vector search, intent-based routing, and multi-turn tool-calling conversations.

---

## Architecture Diagram

```
User Query
    │
    ▼
┌──────────────┐     ┌─────────────────┐
│ Router        │────►│ Redis Cache     │  10-min TTL
│ gpt-4o-mini  │     │ (intent cache)  │
│ ~300ms        │     └─────────────────┘
└──────┬───────┘
       │ intent + confidence
       ▼
┌──────────────┐     ┌─────────────────┐
│ Agent Select  │────►│ 9 Specialized   │
│ get_agent()   │     │ Agents (cached) │
│ functools     │     └─────────────────┘
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│           Tool-Calling Loop          │
│  Max 5 rounds × N tools per round   │
│  gemini-2.0-flash via OpenRouter     │
│                                      │
│  ┌─────────┐  ┌──────────┐          │
│  │ DB Tools │  │ Search   │          │
│  │ (15 mkt) │  │ (pgvec)  │          │
│  │ (7 loan) │  │ (BM25)   │          │
│  │ (5 cryp) │  │ (hybrid) │          │
│  └─────────┘  └──────────┘          │
│  ┌─────────┐  ┌──────────┐          │
│  │ Tech    │  │ CFA      │          │
│  │ Analysis│  │ Portfolio │          │
│  └─────────┘  └──────────┘          │
└──────────────┬───────────────────────┘
               │
               ▼
         Final Response
    { answer, sources, tools_used, model }
```

---

## Component Analysis

### 1. Intent Router

| Setting | Value |
|---------|-------|
| Model | `openai/gpt-4o-mini` (via OpenRouter) |
| Temperature | 0.0 (deterministic) |
| Max tokens | 50 (JSON-only response) |
| Cache TTL | 600s (10 min) in Redis |
| Cache key | Full MD5 hash of context |
| Confidence threshold | 0.5 |
| Context window | Last 3 turns, max 500 chars of latest message |

**Intent Categories** (9):
`market_data`, `document_qa`, `technical_analysis`, `comparison`, `loan_advisor`, `crypto`, `cfa_finance`, `portfolio_advisor`, `general`

**Keyword Boost**: 70+ CFA terms and 20+ portfolio terms override router confidence when keyword match > threshold.

**Estimated Latency**: ~300ms (cached: ~1ms)

---

### 2. Agent System

| Setting | Value |
|---------|-------|
| Total agents | 9 specialized + general fallback |
| Chat model | `google/gemini-2.0-flash-001` (via OpenRouter) |
| Temperature | 0.3 |
| Max tokens | 3,000 per response |
| Max tool rounds | 5 |
| Tool timeout | 30s per tool |
| Thread pool | 4 workers |
| Message window | ~12,000 tokens |

**Agent Specializations**:

| Agent | Tool Count | Primary Tools |
|-------|-----------|---------------|
| `market_data` | 15 | Prices, indices, ETFs, sectors, order book, client type |
| `document_qa` | 2 | Semantic search over Codal/PDF documents |
| `technical_analysis` | 2 | RSI, MACD, support/resistance |
| `comparison` | 4 | Stock screening, peer ranking |
| `loan_advisor` | 7 | Bank products, installments, guarantors |
| `crypto` | 5 | Prices, market cap, top gainers, dominance |
| `cfa_finance` | 1 | CFA curriculum vector search |
| `portfolio_advisor` | 2 | Risk profiling, asset allocation |
| `general` | all | Full tool set for catch-all queries |

---

### 3. Tool Inventory (39 Total)

| Module | Tools | Examples |
|--------|-------|---------|
| `market.py` | 15 | `get_stock_price`, `get_market_indices`, `get_ohlcv_data`, `get_order_book`, `get_client_type`, `get_shareholders` |
| `loans.py` | 7 | `compare_bank_loans`, `get_loan_products`, `calculate_installments`, `list_guarantor_types` |
| `crypto.py` | 5 | `get_crypto_prices`, `get_market_cap`, `get_top_gainers`, `get_market_dominance` |
| `comparison.py` | 4 | `screen_stocks`, `compare_peers`, `rank_by_metric` |
| `documents.py` | 2 | `search_documents`, `full_text_search` |
| `portfolio.py` | 2 | `risk_profile_assessment`, `asset_allocation` |
| `technical.py` | 2 | `get_technical_indicators`, `get_chart_patterns` |
| `cfa.py` | 1 | `search_cfa_documents` |
| `web.py` | 1 | `web_search` (Tavily API) |

---

### 4. Vector Search

| Setting | Value |
|---------|-------|
| Search mode | Hybrid (BM25 + pgvector cosine) |
| Fusion algorithm | Reciprocal Rank Fusion (RRF) |
| RRF k parameter | 60 |
| Embedding model | `text-embedding-3-small` (OpenAI) |
| Embedding dimensions | 1536 |
| Top K | 5 (configurable) |
| Reranker | Enabled (MiniLM-6-v2 cross-encoder, default on) |
| Query expansion | Synonym dictionary (40+ financial terms, EN+FA) |

**Hybrid Search Flow**:
```
Query → Embed (text-embedding-3-small)
     → BM25 full-text search (PostgreSQL ts_vector)
     → pgvector cosine similarity search
     → RRF score = 1/(60 + rank_vec) + 1/(60 + rank_bm25)
     → Deduplicate adjacent chunks
     → Return top K results
```

**pgvector Tuning**: `ivfflat.probes = 10` set via SQLAlchemy connection event listener on both sync and async engines, improving recall for IVFFlat indexes.

**Language Awareness**: English queries use PostgreSQL `english` text search config; Persian/mixed queries use `simple` config.

---

### 5. Document Ingestion Pipeline

```
PDF → Download (3 concurrent) → Extract text + TOC
    → Chunk (1000 chars, 200 overlap) → Embed (batch 100)
    → Store (pgvector) → Status: embedded
```

| Stage | Configuration |
|-------|--------------|
| Download concurrency | 3 |
| Extraction batch | 10 documents |
| Chunk size | 1,000 characters |
| Chunk overlap | 200 characters |
| Splitter | RecursiveCharacterTextSplitter (Persian-aware separators) |
| Embedding batch | 100 texts per API call |
| Storage | pgvector in PostgreSQL |

**Document Status Flow**: `pending` → `downloaded` → `extracting` → `extracted` → `embedding` → `embedded`

---

### 6. Embedding & Caching

| Setting | Value |
|---------|-------|
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Batch size | 100 texts |
| API timeout | 30s |
| Max retries | 3 |
| Cache TTL | 86,400s (24 hours) in Redis |
| Cache key | Full MD5 hash |

---

## Latency Estimates

### Single Query End-to-End

| Stage | Estimated Latency | Notes |
|-------|-------------------|-------|
| Router classification | 300ms (cold) / 1ms (cached) | gpt-4o-mini, 50 tokens |
| Agent selection | <1ms | In-process functools cache |
| Tool dispatch (1st round) | 200-2,000ms | Depends on tool (DB query vs embedding) |
| LLM reasoning per round | 500-1,500ms | gemini-2.0-flash, 3K max tokens |
| Tool dispatch (2nd round) | 200-2,000ms | If agent needs additional data |
| Final answer generation | 500-1,500ms | Streaming if SSE enabled |
| **Total (1 tool round)** | **1,000-3,500ms** | Typical for simple queries |
| **Total (2-3 tool rounds)** | **3,000-8,000ms** | Complex multi-step queries |
| **Total (max 5 rounds)** | **5,000-15,000ms** | Edge case, deep research |

### Breakdown by Tool Type

| Tool Category | Typical Latency | Bottleneck |
|---------------|-----------------|------------|
| Database queries (market, loans) | 1-50ms | PostgreSQL index scan |
| Vector search (documents, CFA) | 50-200ms | Embedding API + pgvector |
| Technical analysis | 100-500ms | OHLCV data fetch + calculation |
| Web search (Tavily) | 500-2,000ms | External API call |
| Stock screening | 100-300ms | Multi-table join + filter |

---

## Caching Layers

| Layer | Scope | TTL | Storage |
|-------|-------|-----|---------|
| Router intent | Intent classification | 10 min | Redis |
| Query embedding | Vector representation | 24 hours | Redis |
| Search results | Full search response | 5 min (trading) / 30 min (off-hours) | Redis |
| Agent instances | Agent configuration | Infinite (in-process) | functools.cache |

| Tool results | Frequently called tools | 30-300s (per tool) | Redis |

**Dynamic TTL Strategy**: Search cache uses shorter TTL during trading hours (300s) and longer off-hours (1800s), matching the market data cache behavior. Tool result caching covers 14 tools with TTLs tuned per-tool (30s for order book, 300s for static data like bank listings).

---

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/chat` | POST | optional | Multi-turn chat (router + agent) |
| `/api/chat/stream` | POST | optional | SSE streaming chat |
| `/api/chat/models` | GET | public | List available LLM models |
| `/api/chat/sessions` | GET/POST | viewer | Session management |
| `/api/rag/search` | POST | viewer | Semantic search with caching |
| `/api/rag/upload` | POST | analyst | Document upload (PDF/TXT/DOCX, max 50 MB) |
| `/api/rag/process` | POST | analyst | Trigger ingestion pipeline |
| `/api/rag/status` | GET | public | Pipeline statistics |
| `/api/rag/documents` | GET | viewer | List documents |

### Available Chat Models (6)

| Model | Provider | Notes |
|-------|----------|-------|
| Gemini 2.5 Flash | Google | Default |
| Gemini 2.0 Flash | Google | Fallback |
| GPT-4o | OpenAI | Premium |
| GPT-4o Mini | OpenAI | Fast/cheap |
| Claude Sonnet 4 | Anthropic | High quality |
| Gemini 2.5 Pro | Google | Premium |

---

## Error Handling & Resilience

| Mechanism | Implementation |
|-----------|---------------|
| Sanitization | Strips DB URLs, API keys, tokens before user response |
| Tool timeout | 30s per tool; returns error message if exceeded |
| Round limit | Max 5 tool rounds; returns partial answer after limit |
| Message pruning | Keeps system prompt + recent turns within 12K token budget |
| Search fallback | Hybrid → pure vector on failure |
| Embedding fallback | Batch → per-document on failure |
| Router fallback | Returns `general` intent on classification error |

---

## Scoring

| Criteria | Score | Notes |
|----------|-------|-------|
| Architecture design | 9/10 | Clean router → agent → tool pattern with specialization |
| Tool coverage | 9/10 | 39 tools across 9 domains — comprehensive |
| Search quality | 8.5/10 | Hybrid BM25 + pgvector with RRF + reranker enabled; bilingual support; pgvector tuned |
| Caching strategy | 8.5/10 | 4-layer caching (router, embedding, search results, tool results); 14 tools cached with per-tool TTLs |
| Error handling | 8/10 | Graceful fallbacks at every stage; sanitization is thorough |
| Latency | 7/10 | 1-8s typical — acceptable for chat but limited by LLM API latency |
| Scalability | 7/10 | Single OpenRouter API key; no request queuing or backpressure |
| Streaming | 8/10 | SSE progress callbacks for real-time UI updates |
| Test coverage | 7.5/10 | RAG eval suite with 50 golden queries across 10 intents; keyword boost + routing accuracy tests |

### Overall RAG Grade: **B+ (8.1/10)**

The RAG system is well-architected with clean separation of concerns (router → agent → tools). The hybrid search with RRF fusion and cross-encoder reranking provides quality results. Multi-layer caching (router intent, embeddings, search results, tool results) minimizes redundant API calls and DB queries. Main limitations are external LLM API latency and single-point-of-failure on the OpenRouter API key.

---

## Recommendations

1. **Add request queuing**: Implement semaphore or queue for concurrent LLM API calls to prevent rate limiting
2. **Streaming for tool rounds**: Currently only the final answer is streamed — consider streaming intermediate results
3. **Observability**: Add Prometheus metrics for router latency, tool execution time, and cache hit rates per agent type
4. **Expand eval suite**: Add end-to-end RAG quality tests (answer relevance, faithfulness) beyond routing accuracy

### Completed Improvements (2026-02-24)

- Enabled MiniLM-6-v2 cross-encoder reranker (was configured but benchmark incorrectly reported as disabled)
- Extended tool result caching from 6 to 14 tools with per-tool TTLs (30-300s)
- Added search result caching with dynamic TTL (300s trading / 1800s off-hours)
- Tuned pgvector with `ivfflat.probes = 10` on both sync and async engines
- Fixed MD5 hash truncation across router, embedder, and tool cache keys (full 32-char hexdigest)
- Built RAG evaluation suite: 50 golden queries, routing accuracy tests, keyword boost coverage
