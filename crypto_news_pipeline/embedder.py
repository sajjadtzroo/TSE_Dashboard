"""
Embedding module — vectorizes chunk text via OpenAI API or local nomic-embed model.
"""

import logging
import time

from .config import (
    EMBEDDER_TYPE,
    LOCAL_EMBEDDING_BATCH_SIZE,
    LOCAL_EMBEDDING_CACHE,
    LOCAL_EMBEDDING_DIMENSIONS,
    LOCAL_EMBEDDING_MODEL,
    OPENAI_API_KEY,
    OPENAI_EMBEDDING_BATCH_SIZE,
    OPENAI_EMBEDDING_DIMENSIONS,
    OPENAI_EMBEDDING_MODEL,
)

logger = logging.getLogger(__name__)


# ── Base interface ───────────────────────────────────────────────────────────


class BaseEmbedder:
    """Abstract embedder interface."""

    dimensions: int = 0

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    def embed_single(self, text: str) -> list[float]:
        return self.embed([text])[0]


# ── OpenAI embedder ──────────────────────────────────────────────────────────


class OpenAIEmbedder(BaseEmbedder):
    """Embed via OpenAI text-embedding-3-small API."""

    dimensions = OPENAI_EMBEDDING_DIMENSIONS

    def __init__(self):
        import openai

        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY required for OpenAI embedder")
        self._client = openai.OpenAI(api_key=OPENAI_API_KEY)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        all_vectors = []
        batch_size = OPENAI_EMBEDDING_BATCH_SIZE
        start = time.time()

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                resp = self._client.embeddings.create(
                    model=OPENAI_EMBEDDING_MODEL,
                    input=batch,
                )
                vectors = [item.embedding for item in resp.data]
                all_vectors.extend(vectors)
            except Exception as exc:
                logger.error(f"OpenAI embedding batch failed: {exc}")
                # Return zero vectors for failed batch
                all_vectors.extend([[0.0] * self.dimensions] * len(batch))

        elapsed = time.time() - start
        logger.info(f"OpenAI: embedded {len(texts)} texts in {elapsed:.2f}s")
        return all_vectors


# ── Local embedder (nomic-embed) ─────────────────────────────────────────────


class LocalEmbedder(BaseEmbedder):
    """Embed locally using nomic-embed-text-v1 via sentence-transformers."""

    dimensions = LOCAL_EMBEDDING_DIMENSIONS

    def __init__(self):
        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading local embedding model: {LOCAL_EMBEDDING_MODEL}")
        start = time.time()
        self._model = SentenceTransformer(
            LOCAL_EMBEDDING_MODEL,
            cache_folder=LOCAL_EMBEDDING_CACHE,
            trust_remote_code=True,
        )
        logger.info(f"Local embedder loaded in {time.time() - start:.1f}s")

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        start = time.time()
        # nomic-embed requires "search_document: " prefix for documents
        prefixed = [f"search_document: {t}" for t in texts]
        embeddings = self._model.encode(
            prefixed,
            batch_size=LOCAL_EMBEDDING_BATCH_SIZE,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        elapsed = time.time() - start
        logger.info(f"Local: embedded {len(texts)} texts in {elapsed:.2f}s")
        return embeddings.tolist()


# ── Factory ──────────────────────────────────────────────────────────────────

_embedder_cache: BaseEmbedder | None = None


def get_embedder(embedder_type: str | None = None) -> BaseEmbedder:
    """
    Get or create the embedder instance.
    Args:
        embedder_type: "openai" or "local". Defaults to config.EMBEDDER_TYPE.
    """
    global _embedder_cache

    etype = embedder_type or EMBEDDER_TYPE

    # Return cached if same type
    if _embedder_cache is not None:
        expected_class = OpenAIEmbedder if etype == "openai" else LocalEmbedder
        if isinstance(_embedder_cache, expected_class):
            return _embedder_cache

    if etype == "openai":
        _embedder_cache = OpenAIEmbedder()
    elif etype == "local":
        _embedder_cache = LocalEmbedder()
    else:
        raise ValueError(f"Unknown embedder type: {etype}. Use 'openai' or 'local'.")

    return _embedder_cache


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # Quick test
    emb = get_embedder()
    texts = [
        "Bitcoin surges past $100k",
        "Ethereum upgrade scheduled for Q2",
        "Crypto market crash imminent",
    ]
    vectors = emb.embed(texts)
    print(f"Embedder: {type(emb).__name__}")
    print(f"Dimensions: {emb.dimensions}")
    print(f"Vectors: {len(vectors)} x {len(vectors[0]) if vectors else 0}")
    # Print first 5 values of each vector
    for i, v in enumerate(vectors):
        print(f"  [{i}] {v[:5]}...")
