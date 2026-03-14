"""
RAG Pipeline Orchestrator — scan, download, extract, chunk, embed, store.
"""

import hashlib
import json as _json
import logging
import re
import time
from pathlib import Path

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from config.settings import HYBRID_SEARCH_ENABLED, RERANKER_ENABLED, RRF_K
from rag.metrics import rag_metrics
from database.models import DocumentChunk, PDFDocument
from rag.chunker import create_chunks
from rag.downloader import download_pending, scan_new_announcements
from rag.embedder import embed_query, embed_texts, normalize_persian
from rag.extractor import extract_text, extract_toc, get_page_count

logger = logging.getLogger(__name__)


def _extract_one(doc: PDFDocument, session: Session) -> int:
    """Extract text from a single downloaded PDF and create chunks.

    Returns 1 on success, 0 on failure. Sets doc.status accordingly.
    """
    doc.status = "extracting"
    session.flush()

    try:
        pages = extract_text(doc.file_path)
        if not pages:
            doc.status = "failed"
            doc.error_message = "No text extracted from PDF"
            return 0

        doc.page_count = get_page_count(doc.file_path)
        toc = extract_toc(doc.file_path)
        chunks = create_chunks(pages, source_file=Path(doc.file_path).name, toc=toc)
        if not chunks:
            doc.status = "failed"
            doc.error_message = "No chunks created from text"
            return 0

        for chunk_data in chunks:
            session.add(
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["text"],
                    content_tokens=len(chunk_data["text"]) // 4,
                    page_numbers=chunk_data["page_numbers"],
                    section_title=chunk_data.get("section_title"),
                )
            )

        doc.status = "extracted"
        logger.info(f"Extracted doc {doc.id}: {len(chunks)} chunks")
        return 1

    except Exception as e:
        doc.status = "failed"
        doc.error_message = f"Extraction error: {e}"
        logger.error(f"Extraction failed for doc {doc.id}: {e}")
        return 0


def _embed_one(doc: PDFDocument, session: Session) -> int:
    """Generate and store embeddings for a single extracted document.

    Returns 1 on success, 0 on failure. Sets doc.status accordingly.
    """
    doc.status = "embedding"
    session.flush()

    try:
        chunks = (
            session.query(DocumentChunk)
            .filter(DocumentChunk.document_id == doc.id)
            .order_by(DocumentChunk.chunk_index)
            .all()
        )
        if not chunks:
            doc.status = "failed"
            doc.error_message = "No chunks found for embedding"
            return 0

        texts = [c.content for c in chunks]
        embeddings = embed_texts(texts)
        for chunk, emb in zip(chunks, embeddings, strict=True):
            chunk.embedding = emb.tolist()

        doc.status = "embedded"
        logger.info(f"Embedded doc {doc.id}: {len(chunks)} chunks")
        return 1

    except Exception as e:
        doc.status = "failed"
        doc.error_message = f"Embedding error: {e}"
        logger.error(f"Embedding failed for doc {doc.id}: {e}")
        return 0


def _extract_documents(session: Session, batch_size: int = 10) -> int:
    """Extract text from downloaded PDFs."""
    docs = (
        session.query(PDFDocument)
        .filter(PDFDocument.status == "downloaded")
        .order_by(PDFDocument.id)
        .limit(batch_size)
        .all()
    )
    if not docs:
        return 0

    count = sum(_extract_one(doc, session) for doc in docs)
    session.flush()
    logger.info(f"Extracted {count}/{len(docs)} documents")
    return count


def _embed_documents(session: Session, batch_size: int = 5) -> int:
    """Generate and store embeddings for extracted documents.

    Batches all chunks across documents into a single embed_texts() call
    for efficiency. Falls back to per-document embedding on failure.
    """
    docs = (
        session.query(PDFDocument)
        .filter(PDFDocument.status == "extracted")
        .order_by(PDFDocument.id)
        .limit(batch_size)
        .all()
    )
    if not docs:
        return 0

    # Collect all chunks across documents for batch embedding
    doc_chunks_map: list[tuple[PDFDocument, list[DocumentChunk]]] = []
    all_texts: list[str] = []

    for doc in docs:
        chunks = (
            session.query(DocumentChunk)
            .filter(DocumentChunk.document_id == doc.id)
            .order_by(DocumentChunk.chunk_index)
            .all()
        )
        if not chunks:
            doc.status = "failed"
            doc.error_message = "No chunks found for embedding"
            continue
        doc_chunks_map.append((doc, chunks))
        all_texts.extend(c.content for c in chunks)

    if not all_texts:
        session.flush()
        return 0

    # Try batch embedding all at once
    try:
        for doc, _ in doc_chunks_map:
            doc.status = "embedding"
        session.flush()

        all_embeddings = embed_texts(all_texts)
        logger.info(f"Batch embedded {len(all_texts)} chunks across {len(doc_chunks_map)} docs")

        idx = 0
        for doc, chunks in doc_chunks_map:
            for chunk in chunks:
                chunk.embedding = all_embeddings[idx].tolist()
                idx += 1
            doc.status = "embedded"

        session.flush()
        return len(doc_chunks_map)

    except Exception as e:
        logger.warning(f"Batch embedding failed, falling back to per-document: {e}")
        # Reset statuses and fall back
        for doc, _ in doc_chunks_map:
            doc.status = "extracted"
        session.flush()

        count = sum(_embed_one(doc, session) for doc, _ in doc_chunks_map)
        session.flush()
        logger.info(f"Embedded {count}/{len(doc_chunks_map)} documents (per-doc fallback)")
        return count


def process_new_documents(session: Session, batch_size: int = 100) -> dict:
    """
    Full pipeline: scan -> download -> extract -> chunk -> embed -> store.
    Returns stats dict.
    """
    stats = {"scanned": 0, "downloaded": 0, "extracted": 0, "embedded": 0}

    # 1. Scan for new announcements
    new_docs = scan_new_announcements(session, batch_size=batch_size)
    stats["scanned"] = len(new_docs)
    session.commit()

    # 2. Download pending PDFs
    stats["downloaded"] = download_pending(session, batch_size=batch_size)
    session.commit()

    # 3. Extract text and create chunks
    stats["extracted"] = _extract_documents(session, batch_size=batch_size)
    session.commit()

    # 4. Generate embeddings
    stats["embedded"] = _embed_documents(session, batch_size=batch_size)
    session.commit()

    logger.info(f"Pipeline complete: {stats}")
    return stats


def process_single_document(session: Session, doc_id: int) -> dict:
    """Process a single document through extract -> chunk -> embed pipeline.

    Used by the upload endpoint to process a newly uploaded document.
    """
    doc = session.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        logger.error(f"Document {doc_id} not found")
        return {"status": "error", "message": "Document not found"}

    stats = {"extracted": 0, "embedded": 0}

    if doc.status == "downloaded":
        stats["extracted"] = _extract_one(doc, session)
        session.commit()
        if doc.status == "failed":
            return {"status": "failed", "message": doc.error_message}

    if doc.status == "extracted":
        stats["embedded"] = _embed_one(doc, session)
        session.commit()
        if doc.status == "failed":
            return {"status": "failed", "message": doc.error_message}

    return {"status": doc.status, "stats": stats}


# ── Persian/English language detection ─────────────────────────────────────

_PERSIAN_RE = re.compile(r"[\u0600-\u06FF]")


def _detect_persian(text_str: str) -> bool:
    """Return True if text contains Persian/Arabic characters."""
    return bool(_PERSIAN_RE.search(text_str))


def _ts_config(query: str) -> str:
    """Choose PostgreSQL text search config based on query language.

    Uses 'english' for Latin-only queries (enables stemming) and
    'simple' for Persian (PostgreSQL has no built-in Persian config).
    """
    if _detect_persian(query):
        return "simple"
    return "english"


# ── Financial synonym expansion ───────────────────────────────────────────

_FINANCIAL_SYNONYMS: dict[str, list[str]] = {
    # Persian synonyms
    "\u0633\u0648\u062f": ["\u062f\u0631\u0622\u0645\u062f", "\u0628\u0627\u0632\u062f\u0647", "\u0639\u0627\u06cc\u062f\u06cc", "\u0633\u0648\u062f \u062e\u0627\u0644\u0635"],  # سود -> درآمد, بازده, عایدی, سود خالص
    "\u0632\u06cc\u0627\u0646": ["\u0636\u0631\u0631", "\u062e\u0633\u0627\u0631\u062a", "\u06a9\u0627\u0647\u0634 \u0627\u0631\u0632\u0634"],  # زیان -> ضرر, خسارت, کاهش ارزش
    "\u062f\u0631\u0622\u0645\u062f": ["\u0641\u0631\u0648\u0634", "\u062f\u0631\u0622\u0645\u062f \u0639\u0645\u0644\u06cc\u0627\u062a\u06cc", "\u06af\u0631\u062f\u0634 \u0645\u0627\u0644\u06cc"],  # درآمد -> فروش, درآمد عملیاتی, گردش مالی
    "\u0647\u0632\u06cc\u0646\u0647": ["\u0628\u0647\u0627\u06cc \u062a\u0645\u0627\u0645 \u0634\u062f\u0647", "\u0645\u062e\u0627\u0631\u062c", "\u0647\u0632\u06cc\u0646\u0647 \u0639\u0645\u0644\u06cc\u0627\u062a\u06cc"],  # هزینه -> بهای تمام شده, مخارج
    "\u062f\u0627\u0631\u0627\u06cc\u06cc": ["\u0627\u0645\u0648\u0627\u0644", "\u062f\u0627\u0631\u0627\u06cc\u06cc \u062b\u0627\u0628\u062a", "\u0627\u0642\u0644\u0627\u0645 \u062f\u0627\u0631\u0627\u06cc\u06cc"],  # دارایی -> اموال, دارایی ثابت
    "\u0628\u062f\u0647\u06cc": ["\u062a\u0639\u0647\u062f\u0627\u062a", "\u0628\u062f\u0647\u06cc \u062c\u0627\u0631\u06cc", "\u0648\u0627\u0645"],  # بدهی -> تعهدات, بدهی جاری, وام
    "\u0633\u0647\u0627\u0645": ["\u0633\u0647\u0645", "\u0627\u0648\u0631\u0627\u0642 \u0628\u0647\u0627\u062f\u0627\u0631", "\u0633\u0631\u0645\u0627\u06cc\u0647"],  # سهام -> سهم, اوراق بهادار, سرمایه
    "\u0633\u0648\u062f \u0647\u0631 \u0633\u0647\u0645": ["EPS", "\u0633\u0648\u062f \u062e\u0627\u0644\u0635 \u0647\u0631 \u0633\u0647\u0645"],  # سود هر سهم -> EPS
    "\u062a\u0642\u0633\u06cc\u0645 \u0633\u0648\u062f": ["DPS", "\u0633\u0648\u062f \u0646\u0642\u062f\u06cc", "\u0633\u0648\u062f \u062a\u0642\u0633\u06cc\u0645\u06cc"],  # تقسیم سود -> DPS
    "\u062a\u0631\u0627\u0632\u0646\u0627\u0645\u0647": ["\u0635\u0648\u0631\u062a \u0648\u0636\u0639\u06cc\u062a \u0645\u0627\u0644\u06cc", "\u062a\u0631\u0627\u0632 \u0645\u0627\u0644\u06cc"],  # ترازنامه -> صورت وضعیت مالی
    "\u0635\u0648\u0631\u062a \u0633\u0648\u062f \u0648 \u0632\u06cc\u0627\u0646": ["\u0635\u0648\u0631\u062a \u062f\u0631\u0622\u0645\u062f", "\u0639\u0645\u0644\u06a9\u0631\u062f \u0645\u0627\u0644\u06cc"],  # صورت سود و زیان
    "\u062c\u0631\u06cc\u0627\u0646 \u0646\u0642\u062f\u06cc": ["\u0635\u0648\u0631\u062a \u062c\u0631\u06cc\u0627\u0646 \u0648\u062c\u0648\u0647 \u0646\u0642\u062f", "\u06af\u0631\u062f\u0634 \u0648\u062c\u0648\u0647 \u0646\u0642\u062f"],  # جریان نقدی
    "\u0628\u0627\u0632\u0627\u0631": ["\u0628\u0648\u0631\u0633", "\u0641\u0631\u0627\u0628\u0648\u0631\u0633"],  # بازار -> بورس, فرابورس
    "\u0627\u0641\u0632\u0627\u06cc\u0634 \u0633\u0631\u0645\u0627\u06cc\u0647": ["\u0627\u0641\u0632\u0627\u06cc\u0634 \u0633\u0631\u0645\u0627\u06cc\u0647 \u0627\u0632 \u0645\u062d\u0644", "\u062d\u0642 \u062a\u0642\u062f\u0645"],  # افزایش سرمایه
    "\u0645\u062c\u0645\u0639": ["\u0645\u062c\u0645\u0639 \u0639\u0645\u0648\u0645\u06cc", "\u0645\u062c\u0645\u0639 \u0639\u0627\u062f\u06cc", "\u0645\u062c\u0645\u0639 \u0641\u0648\u0642 \u0627\u0644\u0639\u0627\u062f\u0647"],  # مجمع -> مجمع عمومی
    # English synonyms
    "profit": ["earnings", "income", "net income", "bottom line"],
    "loss": ["deficit", "write-down", "impairment"],
    "revenue": ["sales", "turnover", "top line"],
    "expense": ["cost", "expenditure", "COGS"],
    "asset": ["property", "holdings", "fixed assets"],
    "liability": ["debt", "obligation", "payable"],
    "equity": ["shareholder equity", "net worth", "book value"],
    "dividend": ["payout", "distribution", "DPS"],
    "P/E": ["price-to-earnings", "PE ratio", "price earnings"],
    "EPS": ["earnings per share", "net income per share"],
    "cash flow": ["operating cash flow", "free cash flow", "FCF"],
    "balance sheet": ["statement of financial position"],
    "income statement": ["profit and loss", "P&L"],
    "ROE": ["return on equity"],
    "ROA": ["return on assets"],
    "EBITDA": ["operating profit", "operating income"],
}


def _expand_query(query: str) -> str:
    """Expand a BM25 query with financial synonyms. No API call — pure dictionary lookup."""
    additions = []
    query_lower = query.lower()
    for term, synonyms in _FINANCIAL_SYNONYMS.items():
        if term.lower() in query_lower or term in query:
            additions.extend(synonyms[:2])  # limit to 2 synonyms per match
    if additions:
        return query + " " + " ".join(additions)
    return query


# ── Cross-encoder reranking ───────────────────────────────────────────────

_reranker_model = None


def _get_reranker():
    """Lazy-load the cross-encoder model."""
    global _reranker_model
    if _reranker_model is None:
        try:
            from sentence_transformers import CrossEncoder
            _reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            logger.info("Cross-encoder reranker loaded")
        except ImportError:
            logger.warning("sentence-transformers not installed, reranking disabled")
            return None
        except Exception as e:
            logger.warning(f"Failed to load reranker model: {e}")
            return None
    return _reranker_model


def _rerank_results(query: str, results: list[dict], top_k: int) -> list[dict]:
    """Rerank search results using a cross-encoder model."""
    if not results or not RERANKER_ENABLED:
        return results[:top_k]

    model = _get_reranker()
    if model is None:
        return results[:top_k]

    try:
        pairs = [(query, r["content"][:512]) for r in results]
        scores = model.predict(pairs)
        for r, score in zip(results, scores):
            r["rerank_score"] = float(score)
        results.sort(key=lambda r: r.get("rerank_score", 0), reverse=True)
        logger.debug(f"Reranked {len(results)} results")
    except Exception as e:
        logger.warning(f"Reranking failed, returning original order: {e}")

    return results[:top_k]


def _hybrid_search(
    session: Session,
    query: str,
    query_embedding: list,
    top_k: int = 5,
    symbol: str = None,
    doc_category: str = None,
    k: int = None,
) -> list[dict]:
    """Hybrid BM25 + vector search using Reciprocal Rank Fusion (RRF).

    Uses CTEs for vector and BM25 ranking, then fuses with RRF formula:
        score = 1/(k + rank_vector) + COALESCE(1/(k + rank_bm25), 0)

    Language-aware: uses 'english' ts_config for Latin queries (enables stemming)
    and 'simple' for Persian. Also expands queries with financial synonyms.
    """
    if k is None:
        k = RRF_K

    query = normalize_persian(query)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
    ts_cfg = _ts_config(query)
    bm25_query = _expand_query(query)

    symbol_filter = "AND pd.symbol = :symbol" if symbol else ""
    category_filter = "AND pd.doc_category = :doc_category" if doc_category else ""
    base_filter = (
        "pd.status = 'embedded' AND dc.embedding IS NOT NULL "
        f"{symbol_filter} {category_filter}"
    )

    sql = text(f"""
        WITH vector_ranked AS (
            SELECT
                dc.id, dc.content, dc.page_numbers, dc.chunk_index,
                pd.id AS document_id, pd.title, pd.symbol, pd.source_url,
                pd.doc_category,
                1 - (dc.embedding <=> CAST(:embedding AS vector)) AS similarity,
                ROW_NUMBER() OVER (
                    ORDER BY dc.embedding <=> CAST(:embedding AS vector)
                ) AS rank_v
            FROM document_chunks dc
            JOIN pdf_documents pd ON dc.document_id = pd.id
            WHERE {base_filter}
            ORDER BY dc.embedding <=> CAST(:embedding AS vector)
            LIMIT :vector_limit
        ),
        bm25_ranked AS (
            SELECT
                dc.id,
                ts_rank_cd(
                    to_tsvector(:ts_cfg, dc.content),
                    plainto_tsquery(:ts_cfg, :bm25_query)
                ) AS bm25_score,
                ROW_NUMBER() OVER (
                    ORDER BY ts_rank_cd(
                        to_tsvector(:ts_cfg, dc.content),
                        plainto_tsquery(:ts_cfg, :bm25_query)
                    ) DESC
                ) AS rank_b
            FROM document_chunks dc
            JOIN pdf_documents pd ON dc.document_id = pd.id
            WHERE {base_filter}
              AND ts_rank_cd(
                  to_tsvector(:ts_cfg, dc.content),
                  plainto_tsquery(:ts_cfg, :bm25_query)
              ) > 0
            ORDER BY bm25_score DESC
            LIMIT :bm25_limit
        )
        SELECT
            v.id, v.content, v.page_numbers, v.chunk_index,
            v.document_id, v.title, v.symbol, v.source_url,
            v.doc_category, v.similarity,
            (1.0 / (:k + v.rank_v)) + COALESCE(1.0 / (:k + b.rank_b), 0) AS rrf_score
        FROM vector_ranked v
        LEFT JOIN bm25_ranked b ON v.id = b.id
        ORDER BY rrf_score DESC
        LIMIT :top_k
    """)

    params = {
        "embedding": embedding_str,
        "query": query,
        "bm25_query": bm25_query,
        "ts_cfg": ts_cfg,
        "k": k,
        "top_k": top_k,
        "vector_limit": top_k * 4,
        "bm25_limit": top_k * 4,
    }
    if symbol:
        params["symbol"] = symbol
    if doc_category:
        params["doc_category"] = doc_category

    rows = session.execute(sql, params).fetchall()

    return [
        {
            "chunk_id": row.id,
            "content": row.content,
            "page_numbers": row.page_numbers,
            "chunk_index": row.chunk_index,
            "document_id": row.document_id,
            "title": row.title,
            "symbol": row.symbol,
            "source_url": row.source_url,
            "doc_category": row.doc_category,
            "similarity": float(row.similarity) if row.similarity else 0,
        }
        for row in rows
    ]


def _deduplicate_adjacent_chunks(results: list[dict]) -> list[dict]:
    """Remove lower-similarity chunks that are adjacent (chunk_index diff <= 1)
    from the same document, keeping the higher-similarity one."""
    if not results:
        return results

    keep = []
    seen = set()

    for r in results:
        key = (r["document_id"], r["chunk_index"])
        if key in seen:
            continue

        # Check if an adjacent chunk from the same doc is already kept
        duplicate = False
        for kept in keep:
            if kept["document_id"] == r["document_id"]:
                if abs(kept["chunk_index"] - r["chunk_index"]) <= 1:
                    # Keep the one with higher similarity (already in keep list)
                    duplicate = True
                    break

        if not duplicate:
            keep.append(r)
            seen.add(key)

    return keep


_SEARCH_CACHE_TTL_TRADING = 300    # 5 min during trading hours
_SEARCH_CACHE_TTL_OFF = 1800       # 30 min off-hours


def _search_cache_key(query: str, top_k: int, symbol: str | None, doc_category: str | None) -> str:
    """Build a deterministic Redis key for a search result."""
    raw = f"{query}|{top_k}|{symbol or ''}|{doc_category or ''}"
    h = hashlib.md5(raw.encode()).hexdigest()
    return f"tse:cache:rag:search:{h}"


def _get_search_cache_ttl() -> int:
    """Return appropriate TTL based on trading hours."""
    try:
        from api.cache import cache_manager
        if cache_manager and hasattr(cache_manager, '_is_trading_hours'):
            return _SEARCH_CACHE_TTL_TRADING if cache_manager._is_trading_hours() else _SEARCH_CACHE_TTL_OFF
    except Exception:
        pass
    return _SEARCH_CACHE_TTL_OFF


def _get_cached_search(key: str) -> list[dict] | None:
    """Try to fetch cached search results from Redis."""
    try:
        from api.cache import cache_manager
        cached = cache_manager.get_raw(key)
        if cached is not None:
            logger.debug("Search cache hit")
            return _json.loads(cached)
    except Exception:
        pass
    return None


def _set_cached_search(key: str, results: list[dict]) -> None:
    """Cache search results in Redis."""
    if not results:
        return
    try:
        from api.cache import cache_manager
        cache_manager.set_raw(key, _json.dumps(results), _get_search_cache_ttl())
    except Exception:
        pass


def search(
    session: Session,
    query: str,
    top_k: int = 5,
    symbol: str = None,
    doc_category: str = None,
    hybrid: bool | None = None,
) -> list[dict]:
    """
    Semantic search over document chunks using pgvector cosine distance.
    Supports optional hybrid BM25+vector search with RRF fusion.
    Results are cached in Redis with dynamic TTL (shorter during trading hours).

    Args:
        doc_category: Optional filter by document category (e.g. 'cfa', 'codal').
        hybrid: Force hybrid search on/off. None uses HYBRID_SEARCH_ENABLED setting.

    Returns list of {content, similarity, title, symbol, page_numbers, source_url, document_id, doc_category}.
    """
    query = normalize_persian(query)
    # Check search result cache
    cache_key = _search_cache_key(query, top_k, symbol, doc_category)
    cached = _get_cached_search(cache_key)
    if cached is not None:
        rag_metrics.search_cache.labels(result="hit").inc()
        return cached

    rag_metrics.search_cache.labels(result="miss").inc()

    t_embed = time.monotonic()
    query_embedding = embed_query(query)
    rag_metrics.embedding_latency.observe(time.monotonic() - t_embed)

    use_hybrid = hybrid if hybrid is not None else HYBRID_SEARCH_ENABLED

    if use_hybrid:
        try:
            t_search = time.monotonic()
            results = _hybrid_search(
                session,
                query,
                query_embedding.tolist(),
                top_k=top_k * 2,  # fetch extra for dedup
                symbol=symbol,
                doc_category=doc_category,
            )
            rag_metrics.search_latency.labels(mode="hybrid").observe(
                time.monotonic() - t_search
            )
            results = _deduplicate_adjacent_chunks(results)

            t_rerank = time.monotonic()
            results = _rerank_results(query, results, top_k)
            if RERANKER_ENABLED:
                rag_metrics.search_latency.labels(mode="reranker").observe(
                    time.monotonic() - t_rerank
                )

            rag_metrics.search_results.observe(len(results))
            if results:
                _set_cached_search(cache_key, results)
                return results
            logger.info("Hybrid search returned no results, falling back to vector-only")
        except Exception as e:
            logger.warning(f"Hybrid search failed, falling back to vector-only: {e}")

    # Pure vector search fallback
    t_vec = time.monotonic()
    embedding_str = "[" + ",".join(str(x) for x in query_embedding.tolist()) + "]"

    symbol_filter = "AND pd.symbol = :symbol" if symbol else ""
    category_filter = "AND pd.doc_category = :doc_category" if doc_category else ""
    sql = text(
        "SELECT "
        "  dc.id, dc.content, dc.page_numbers, dc.chunk_index, "
        "  pd.id AS document_id, pd.title, pd.symbol, pd.source_url, "
        "  pd.doc_category, "
        "  1 - (dc.embedding <=> CAST(:embedding AS vector)) AS similarity "
        "FROM document_chunks dc "
        "JOIN pdf_documents pd ON dc.document_id = pd.id "
        "WHERE pd.status = 'embedded' "
        "  AND dc.embedding IS NOT NULL "
        f"  {symbol_filter} "
        f"  {category_filter} "
        "ORDER BY dc.embedding <=> CAST(:embedding AS vector) "
        "LIMIT :top_k"
    )

    params = {"embedding": embedding_str, "top_k": top_k}
    if symbol:
        params["symbol"] = symbol
    if doc_category:
        params["doc_category"] = doc_category

    rows = session.execute(sql, params).fetchall()
    rag_metrics.search_latency.labels(mode="vector").observe(time.monotonic() - t_vec)

    results = []
    for row in rows:
        results.append(
            {
                "chunk_id": row.id,
                "content": row.content,
                "page_numbers": row.page_numbers,
                "chunk_index": row.chunk_index,
                "document_id": row.document_id,
                "title": row.title,
                "symbol": row.symbol,
                "source_url": row.source_url,
                "doc_category": row.doc_category,
                "similarity": float(row.similarity) if row.similarity else 0,
            }
        )

    rag_metrics.search_results.observe(len(results))
    _set_cached_search(cache_key, results)
    return results


def get_status(session: Session) -> dict:
    """Get pipeline statistics."""
    total = session.query(func.count(PDFDocument.id)).scalar() or 0
    by_status = dict(
        session.query(PDFDocument.status, func.count(PDFDocument.id))
        .group_by(PDFDocument.status)
        .all()
    )
    total_chunks = session.query(func.count(DocumentChunk.id)).scalar() or 0
    chunks_with_embedding = (
        session.query(func.count(DocumentChunk.id))
        .filter(DocumentChunk.embedding.isnot(None))
        .scalar()
        or 0
    )

    return {
        "total_documents": total,
        "pending": by_status.get("pending", 0),
        "downloading": by_status.get("downloading", 0),
        "downloaded": by_status.get("downloaded", 0),
        "extracting": by_status.get("extracting", 0),
        "extracted": by_status.get("extracted", 0),
        "embedding": by_status.get("embedding", 0),
        "embedded": by_status.get("embedded", 0),
        "failed": by_status.get("failed", 0),
        "total_chunks": total_chunks,
        "chunks_with_embedding": chunks_with_embedding,
    }
