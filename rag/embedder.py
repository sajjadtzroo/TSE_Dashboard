"""
Embedding Generator — OpenAI text-embedding-3-small via OpenRouter.
Adapted from PDF_to_Vector reference project.
"""
import logging

import numpy as np
from openai import OpenAI

from config.settings import OPENROUTER_API_KEY, EMBEDDING_MODEL, EMBEDDING_BATCH_SIZE

logger = logging.getLogger(__name__)

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set. Add it to .env file.")
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    return _client


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
        batch = texts[i:i + EMBEDDING_BATCH_SIZE]
        resp = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch,
        )
        batch_embeddings = [item.embedding for item in resp.data]
        all_embeddings.extend(batch_embeddings)

        if len(texts) > EMBEDDING_BATCH_SIZE:
            logger.info(f"Embedded batch {i // EMBEDDING_BATCH_SIZE + 1}/"
                        f"{(len(texts) - 1) // EMBEDDING_BATCH_SIZE + 1}")

    return np.array(all_embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Generate embedding for a single query text."""
    client = _get_client()
    resp = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query],
    )
    return np.array(resp.data[0].embedding, dtype=np.float32)
