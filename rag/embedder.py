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
    h = hashlib.md5(query.encode()).hexdigest()[:16]
    return f"tse:cache:rag:embed:{h}"


def embed_texts(texts: list[str]) -> np.ndarray:
    """
    Generate embeddings for a list of texts.

    Args:
        texts: list of text strings

    Returns:
        numpy array of shape (len(texts), 1536)
    """
    client = _get_client()
    all_embeddings = []

    for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[i : i + EMBEDDING_BATCH_SIZE]
        resp = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch,
        )
        batch_embeddings = [
            item.embedding for item in sorted(resp.data, key=lambda x: x.index)
        ]
        all_embeddings.extend(batch_embeddings)

        if len(texts) > EMBEDDING_BATCH_SIZE:
            logger.info(
                f"Embedded batch {i // EMBEDDING_BATCH_SIZE + 1}/"
                f"{(len(texts) - 1) // EMBEDDING_BATCH_SIZE + 1}"
            )

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
        return np.array(json.loads(cached), dtype=np.float32)

    # Cache miss — call API
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
