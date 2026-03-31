"""
Pipeline orchestration — fetch → dedup → clean → score → embed → store.
Each step is timed and logged. One failing source never kills the pipeline.
"""

import logging
import time
from itertools import groupby

from .cleaner import process_articles
from .embedder import get_embedder
from .fetcher import fetch_all_sources
from .sentiment import aggregate_article, score_chunks
from .store import NewsStore

logger = logging.getLogger(__name__)


def run_pipeline(
    tiers: str = "tier1",
    embedder_type: str | None = None,
    store: NewsStore | None = None,
) -> dict:
    """
    Execute the full news pipeline end-to-end.

    Args:
        tiers: "tier1", "tier2", or "all"
        embedder_type: "openai" or "local" (defaults to config)
        store: optional pre-initialized NewsStore

    Returns:
        dict with pipeline run stats.
    """
    stats = {
        "articles_fetched": 0,
        "articles_new": 0,
        "chunks_created": 0,
        "chunks_scored": 0,
        "chunks_embedded": 0,
        "chunks_stored": 0,
        "errors": [],
    }
    pipeline_start = time.time()

    # ── Initialize store ─────────────────────────────────────────────────
    if store is None:
        store = NewsStore()
    store.init()

    # ── Step 1: Fetch ────────────────────────────────────────────────────
    step_start = time.time()
    seen_hashes = store.get_seen_hashes()
    logger.info(f"Database has {len(seen_hashes)} existing articles")

    try:
        articles = fetch_all_sources(tiers=tiers, seen_hashes=seen_hashes)
    except Exception as exc:
        logger.error(f"Fetch failed entirely: {exc}")
        stats["errors"].append(f"fetch: {exc}")
        return stats

    stats["articles_fetched"] = len(articles)
    logger.info(f"Step 1 FETCH: {len(articles)} articles in {time.time() - step_start:.1f}s")

    if not articles:
        logger.info("No new articles — pipeline done")
        return stats

    # ── Step 2: Store raw articles in MinIO + DB ─────────────────────────
    step_start = time.time()
    new_articles = []
    for article in articles:
        try:
            record = store.upsert_article(article, article.get("raw_text", ""))
            if record is not None:
                new_articles.append(article)
        except Exception as exc:
            logger.error(f"Article upsert failed: {exc}")
            stats["errors"].append(f"upsert article: {exc}")

    stats["articles_new"] = len(new_articles)
    logger.info(
        f"Step 2 STORE RAW: {len(new_articles)} new articles "
        f"in {time.time() - step_start:.1f}s"
    )

    if not new_articles:
        logger.info("All articles already processed — pipeline done")
        return stats

    # ── Step 3: Clean & Chunk ────────────────────────────────────────────
    step_start = time.time()
    try:
        chunks = process_articles(new_articles)
    except Exception as exc:
        logger.error(f"Cleaning failed: {exc}")
        stats["errors"].append(f"clean: {exc}")
        return stats

    stats["chunks_created"] = len(chunks)
    logger.info(f"Step 3 CLEAN: {len(chunks)} chunks in {time.time() - step_start:.1f}s")

    if not chunks:
        logger.info("No chunks produced — pipeline done")
        return stats

    # ── Step 4: Sentiment scoring ────────────────────────────────────────
    step_start = time.time()
    try:
        scored_chunks = score_chunks(chunks)
        stats["chunks_scored"] = len(scored_chunks)
    except Exception as exc:
        logger.error(f"Sentiment scoring failed: {exc}")
        stats["errors"].append(f"sentiment: {exc}")
        # Continue without sentiment — chunks still have text and metadata
        scored_chunks = chunks

    logger.info(f"Step 4 SENTIMENT: {len(scored_chunks)} chunks in {time.time() - step_start:.1f}s")

    # ── Step 5: Embed ────────────────────────────────────────────────────
    step_start = time.time()
    vectors = None
    try:
        embedder = get_embedder(embedder_type)
        texts = [c["chunk_text"] for c in scored_chunks]
        vectors = embedder.embed(texts)
        stats["chunks_embedded"] = len(vectors)
    except Exception as exc:
        logger.error(f"Embedding failed: {exc}")
        stats["errors"].append(f"embed: {exc}")
        # Continue without embeddings

    logger.info(
        f"Step 5 EMBED: {len(vectors) if vectors else 0} vectors "
        f"in {time.time() - step_start:.1f}s"
    )

    # ── Step 6: Store chunks + embeddings ────────────────────────────────
    step_start = time.time()
    try:
        inserted = store.upsert_chunks(scored_chunks, vectors)
        stats["chunks_stored"] = inserted
    except Exception as exc:
        logger.error(f"Chunk storage failed: {exc}")
        stats["errors"].append(f"store chunks: {exc}")

    logger.info(f"Step 6 STORE: {stats['chunks_stored']} chunks in {time.time() - step_start:.1f}s")

    # ── Step 7: Article-level aggregation ────────────────────────────────
    step_start = time.time()
    try:
        sorted_chunks = sorted(scored_chunks, key=lambda c: c["url_hash"])
        for url_hash, group in groupby(sorted_chunks, key=lambda c: c["url_hash"]):
            article_chunks = list(group)
            agg = aggregate_article(article_chunks)
            store.update_article_sentiment(url_hash, agg)
    except Exception as exc:
        logger.error(f"Article aggregation failed: {exc}")
        stats["errors"].append(f"aggregate: {exc}")

    logger.info(f"Step 7 AGGREGATE: done in {time.time() - step_start:.1f}s")

    # ── Done ─────────────────────────────────────────────────────────────
    total_time = time.time() - pipeline_start
    logger.info(
        f"Pipeline complete in {total_time:.1f}s — "
        f"{stats['articles_new']} articles, "
        f"{stats['chunks_stored']} chunks stored, "
        f"{len(stats['errors'])} errors"
    )
    return stats
