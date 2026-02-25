"""
Embedding Generator — OpenAI text-embedding-3-small via OpenRouter.
Adapted from PDF_to_Vector reference project.
"""

import hashlib
import json
import logging

import numpy as np
from openai import OpenAI

from config.settings import (
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_MAX_RETRIES,
    EMBEDDING_MODEL,
    EMBEDDING_TIMEOUT,
    OPENROUTER_API_KEY,
)
from rag.metrics import rag_metrics

logger = logging.getLogger(__name__)

_client = None

_EMBED_CACHE_TTL = 86400  # 24 hours


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set. Add it to .env file.")
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            timeout=EMBEDDING_TIMEOUT,
            max_retries=EMBEDDING_MAX_RETRIES,
        )
    return _client


def _cache_key(query: str) -> str:
    """Build a Redis key for a query embedding."""
    h = hashlib.md5(query.encode()).hexdigest()
    return f"tse:cache:rag:embed:{h}"


def embed_texts(texts: list[str]) -> np.ndarray:
    """
    Generate embeddings for a list of texts.

    Checks Redis cache for each text first — only uncached texts are sent to the
    embedding API. New embeddings are cached for 24h to avoid redundant API calls
    during re-ingestion.

    Args:
        texts: list of text strings

    Returns:
        numpy array of shape (len(texts), 1536)
    """
    # Try to load cached embeddings
    try:
        from api.cache import cache_manager
        cache_available = cache_manager and cache_manager.available
    except Exception:
        cache_available = False

    cached_embeddings: dict[int, list[float]] = {}
    uncached_indices: list[int] = []
    uncached_texts: list[str] = []

    if cache_available:
        for idx, t in enumerate(texts):
            key = _cache_key(t)
            raw = cache_manager.get_raw(key)
            if raw is not None:
                cached_embeddings[idx] = json.loads(raw)
            else:
                uncached_indices.append(idx)
                uncached_texts.append(t)
        if cached_embeddings:
            logger.info(
                f"Embedding cache: {len(cached_embeddings)} hits, "
                f"{len(uncached_texts)} misses out of {len(texts)}"
            )
            rag_metrics.embedding_cache.labels(result="hit").inc(len(cached_embeddings))
            rag_metrics.embedding_cache.labels(result="miss").inc(len(uncached_texts))
    else:
        uncached_indices = list(range(len(texts)))
        uncached_texts = list(texts)

    # Call API only for uncached texts
    api_embeddings: list[list[float]] = []
    if uncached_texts:
        client = _get_client()
        for i in range(0, len(uncached_texts), EMBEDDING_BATCH_SIZE):
            batch = uncached_texts[i : i + EMBEDDING_BATCH_SIZE]
            rag_metrics.embedding_batch_size.observe(len(batch))
            resp = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch,
            )
            batch_embeddings = [
                item.embedding for item in sorted(resp.data, key=lambda x: x.index)
            ]
            api_embeddings.extend(batch_embeddings)

            if len(uncached_texts) > EMBEDDING_BATCH_SIZE:
                logger.info(
                    f"Embedded batch {i // EMBEDDING_BATCH_SIZE + 1}/"
                    f"{(len(uncached_texts) - 1) // EMBEDDING_BATCH_SIZE + 1}"
                )

        # Cache newly fetched embeddings
        if cache_available:
            for rel_idx, emb in enumerate(api_embeddings):
                orig_idx = uncached_indices[rel_idx]
                try:
                    cache_manager.set_raw(
                        _cache_key(texts[orig_idx]),
                        json.dumps(emb),
                        _EMBED_CACHE_TTL,
                    )
                except Exception:
                    pass

    # Reassemble in original order
    all_embeddings: list[list[float]] = [None] * len(texts)  # type: ignore[list-item]
    for idx, emb in cached_embeddings.items():
        all_embeddings[idx] = emb
    for rel_idx, emb in enumerate(api_embeddings):
        all_embeddings[uncached_indices[rel_idx]] = emb

    return np.array(all_embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Generate embedding for a single query text.

    Results are cached in Redis for 24h to avoid redundant API calls.
    """
    from api.cache import cache_manager

    # Try Redis cache first
    key = _cache_key(query)
    cached = cache_manager.get_raw(key)
    if cached is not None:
        logger.debug("Embedding cache hit")
        rag_metrics.embedding_cache.labels(result="hit").inc()
        return np.array(json.loads(cached), dtype=np.float32)

    # Cache miss — call API
    rag_metrics.embedding_cache.labels(result="miss").inc()
    client = _get_client()
    resp = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query],
    )
    embedding = np.array(resp.data[0].embedding, dtype=np.float32)

    # Store in Redis
    cache_manager.set_raw(
        _cache_key(query),
        json.dumps(embedding.tolist()),
        _EMBED_CACHE_TTL,
    )

    return embedding
