"""
Sentiment scoring module — FinBERT for formal sources, CryptoBERT for informal.
Handles model routing, batch inference, rescaling, and aggregation.
"""

import logging
import math
import time
from datetime import UTC, datetime

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

from .config import (
    CONFIDENCE_THRESHOLD,
    CRYPTOBERT_CACHE,
    CRYPTOBERT_MODEL,
    DECAY_LAMBDA,
    DEFAULT_SOURCE_WEIGHT,
    FINBERT_CACHE,
    FINBERT_MODEL,
    FINBERT_SOURCES,
    HIGH_NEUTRAL_THRESHOLD,
    SENTIMENT_BATCH_SIZE,
    SOURCE_WEIGHTS,
)

logger = logging.getLogger(__name__)


# ── Device detection ─────────────────────────────────────────────────────────


def _detect_device() -> int:
    """Auto-detect best available device. Returns -1 for CPU, 0 for CUDA."""
    if torch.cuda.is_available():
        logger.info(f"CUDA available: {torch.cuda.get_device_name(0)}")
        return 0
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        logger.info("Apple MPS available")
        return 0  # MPS uses device 0 via pipeline
    logger.info("Using CPU for inference")
    return -1


# ── Rescaling ────────────────────────────────────────────────────────────────


def rescale(pos: float, neg: float, neu: float) -> tuple[float, float]:
    """
    Convert 3-class softmax to (score, confidence).
    score: -1.0 to +1.0
    confidence: 0.0 to 1.0
    """
    if neu > HIGH_NEUTRAL_THRESHOLD:
        return 0.0, 1.0 - neu
    directional = pos - neg
    confidence = 1.0 - neu
    score = directional * confidence
    return score, confidence


# ── Model Router ─────────────────────────────────────────────────────────────


class ModelRouter:
    """
    Lazy-loads FinBERT and CryptoBERT, routes inference by source name.
    Falls back to FinBERT if CryptoBERT fails to load.
    """

    def __init__(self):
        self._finbert = None
        self._cryptobert = None
        self._cryptobert_failed = False
        self._device = _detect_device()

    def _load_finbert(self):
        if self._finbert is not None:
            return self._finbert
        logger.info(f"Loading FinBERT from {FINBERT_MODEL} (cache: {FINBERT_CACHE})")
        start = time.time()
        try:
            tokenizer = AutoTokenizer.from_pretrained(
                FINBERT_MODEL, cache_dir=FINBERT_CACHE
            )
            model = AutoModelForSequenceClassification.from_pretrained(
                FINBERT_MODEL, cache_dir=FINBERT_CACHE
            )
            self._finbert = pipeline(
                "sentiment-analysis",
                model=model,
                tokenizer=tokenizer,
                device=self._device,
                top_k=None,  # return all class scores
                truncation=True,
                max_length=512,
            )
            logger.info(f"FinBERT loaded in {time.time() - start:.1f}s")
        except Exception as exc:
            logger.error(f"Failed to load FinBERT: {exc}")
            raise
        return self._finbert

    def _load_cryptobert(self):
        if self._cryptobert is not None:
            return self._cryptobert
        if self._cryptobert_failed:
            return None
        logger.info(f"Loading CryptoBERT from {CRYPTOBERT_MODEL} (cache: {CRYPTOBERT_CACHE})")
        start = time.time()
        try:
            tokenizer = AutoTokenizer.from_pretrained(
                CRYPTOBERT_MODEL, cache_dir=CRYPTOBERT_CACHE
            )
            model = AutoModelForSequenceClassification.from_pretrained(
                CRYPTOBERT_MODEL, cache_dir=CRYPTOBERT_CACHE
            )
            self._cryptobert = pipeline(
                "sentiment-analysis",
                model=model,
                tokenizer=tokenizer,
                device=self._device,
                top_k=None,
                truncation=True,
                max_length=512,
            )
            logger.info(f"CryptoBERT loaded in {time.time() - start:.1f}s")
        except Exception as exc:
            logger.warning(f"CryptoBERT failed to load, falling back to FinBERT: {exc}")
            self._cryptobert_failed = True
            return None
        return self._cryptobert

    def get_pipeline(self, source: str) -> tuple:
        """
        Return (pipeline, model_name) for the given source.
        FinBERT for formal sources, CryptoBERT for others.
        """
        if source in FINBERT_SOURCES:
            return self._load_finbert(), "finbert"

        crypto_pipe = self._load_cryptobert()
        if crypto_pipe is not None:
            return crypto_pipe, "cryptobert"

        # Fallback to FinBERT
        return self._load_finbert(), "finbert"

    def close(self):
        """Free model memory."""
        self._finbert = None
        self._cryptobert = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


# Module-level router (lazy — no models loaded until first use)
_router = ModelRouter()


# ── Label normalization ──────────────────────────────────────────────────────

# FinBERT labels: "positive", "negative", "neutral"
# CryptoBERT labels: "Bullish" (positive), "Bearish" (negative), "Neutral"
_LABEL_MAP = {
    "positive": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "bullish": "positive",
    "bearish": "negative",
}


def _normalize_scores(raw_output: list[dict]) -> tuple[float, float, float]:
    """
    Convert model output [{label, score}, ...] to (positive, negative, neutral).
    """
    scores = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
    for item in raw_output:
        label = _LABEL_MAP.get(item["label"].lower(), "neutral")
        scores[label] = item["score"]
    return scores["positive"], scores["negative"], scores["neutral"]


# ── Batch scoring ────────────────────────────────────────────────────────────


def score_chunks(
    chunks: list[dict],
    batch_size: int = SENTIMENT_BATCH_SIZE,
) -> list[dict]:
    """
    Score a list of chunk dicts with sentiment.
    Enriches each chunk in-place with sentiment fields and returns the list.
    """
    if not chunks:
        return chunks

    # Group chunks by model
    finbert_indices = []
    crypto_indices = []
    for i, chunk in enumerate(chunks):
        if chunk["source"] in FINBERT_SOURCES:
            finbert_indices.append(i)
        else:
            crypto_indices.append(i)

    # Score each group
    for indices, model_hint in [(finbert_indices, "finbert"), (crypto_indices, "crypto")]:
        if not indices:
            continue

        source = chunks[indices[0]]["source"]
        pipe, model_name = _router.get_pipeline(source)

        # Batch inference
        texts = [chunks[i]["chunk_text"] for i in indices]
        start = time.time()
        all_results = []

        for batch_start in range(0, len(texts), batch_size):
            batch = texts[batch_start : batch_start + batch_size]
            results = pipe(batch)
            all_results.extend(results)

        elapsed = time.time() - start
        logger.info(
            f"Scored {len(indices)} chunks with {model_name} in {elapsed:.2f}s "
            f"({elapsed / max(len(indices), 1) * 1000:.0f}ms/chunk)"
        )

        # Enrich chunk dicts
        for idx, raw_out in zip(indices, all_results):
            chunk = chunks[idx]
            pos, neg, neu = _normalize_scores(raw_out)
            score, confidence = rescale(pos, neg, neu)
            source_weight = SOURCE_WEIGHTS.get(chunk["source"], DEFAULT_SOURCE_WEIGHT)

            chunk["raw_positive"] = round(pos, 4)
            chunk["raw_negative"] = round(neg, 4)
            chunk["raw_neutral"] = round(neu, 4)
            chunk["sentiment_score"] = round(score, 4)
            chunk["confidence"] = round(confidence, 4)
            chunk["low_confidence"] = confidence < CONFIDENCE_THRESHOLD
            chunk["model_used"] = model_name
            chunk["source_weight"] = source_weight
            chunk["weighted_score"] = round(score * source_weight * confidence, 4)

    return chunks


# ── Article-level aggregation ────────────────────────────────────────────────


def aggregate_article(scored_chunks: list[dict]) -> dict:
    """
    Aggregate chunk-level scores into a single article score.
    Later chunks weighted more (conclusions carry more signal).

    Args:
        scored_chunks: chunks from the same article, already scored.

    Returns:
        dict with article-level sentiment summary.
    """
    if not scored_chunks:
        return {
            "article_score": 0.0,
            "article_confidence": 0.0,
            "n_chunks": 0,
            "chunk_scores": [],
        }

    total_chunks = scored_chunks[0].get("total_chunks", len(scored_chunks))
    weighted_sum = 0.0
    weight_total = 0.0
    confidence_sum = 0.0

    for chunk in scored_chunks:
        i = chunk.get("chunk_index", 0)
        # Later chunks weighted slightly more
        position_weight = 0.8 + (0.2 * i / max(total_chunks - 1, 1))
        score = chunk.get("sentiment_score", 0.0)

        weighted_sum += score * position_weight
        weight_total += position_weight
        confidence_sum += chunk.get("confidence", 0.0)

    article_score = weighted_sum / weight_total if weight_total > 0 else 0.0
    article_confidence = confidence_sum / len(scored_chunks)

    return {
        "article_score": round(article_score, 4),
        "article_confidence": round(article_confidence, 4),
        "n_chunks": len(scored_chunks),
        "url": scored_chunks[0].get("url", ""),
        "title": scored_chunks[0].get("title", ""),
        "source": scored_chunks[0].get("source", ""),
        "chunk_scores": [
            {
                "chunk_index": c["chunk_index"],
                "sentiment_score": c.get("sentiment_score", 0.0),
                "confidence": c.get("confidence", 0.0),
                "weighted_score": c.get("weighted_score", 0.0),
            }
            for c in scored_chunks
        ],
    }


# ── Coin-level aggregation ───────────────────────────────────────────────────


def compute_coin_sentiment(
    chunks: list[dict],
    coin: str,
    window_hours: int = 4,
) -> dict:
    """
    Compute aggregated sentiment signal for a specific coin.

    Args:
        chunks: pre-filtered list of scored chunks mentioning the coin
        coin: canonical ticker (e.g. "BTC")
        window_hours: time window for context (used in output, decay applied here)

    Returns:
        dict with coin sentiment signal.
    """
    if not chunks:
        return {
            "coin": coin,
            "score": 0.0,
            "confidence": 0.0,
            "n_articles": 0,
            "window_hours": window_hours,
            "signal_strength": "weak",
        }

    now = datetime.now(UTC)
    weighted_sum = 0.0
    weight_total = 0.0
    confidence_sum = 0.0
    seen_urls = set()

    for chunk in chunks:
        pub = chunk.get("published_at")
        if isinstance(pub, str):
            try:
                pub = datetime.fromisoformat(pub.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pub = now

        hours_ago = max((now - pub).total_seconds() / 3600, 0)
        recency_weight = math.exp(-DECAY_LAMBDA * hours_ago)

        w_score = chunk.get("weighted_score", 0.0)
        weighted_sum += w_score * recency_weight
        weight_total += recency_weight
        confidence_sum += chunk.get("confidence", 0.0)
        seen_urls.add(chunk.get("url", ""))

    n_articles = len(seen_urls)
    avg_confidence = confidence_sum / len(chunks) if chunks else 0.0
    final_score = weighted_sum / weight_total if weight_total > 0 else 0.0

    # Signal strength
    if n_articles >= 5 and avg_confidence >= 0.70:
        strength = "strong"
    elif n_articles >= 2 and avg_confidence >= 0.50:
        strength = "moderate"
    else:
        strength = "weak"

    return {
        "coin": coin,
        "score": round(final_score, 4),
        "confidence": round(avg_confidence, 4),
        "n_articles": n_articles,
        "window_hours": window_hours,
        "signal_strength": strength,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Test with sample chunks
    sample_chunks = [
        {
            "chunk_text": "Bitcoin surged past $100,000 today, marking a new all-time high as institutional adoption accelerates.",
            "chunk_index": 0,
            "total_chunks": 2,
            "url": "https://example.com/btc-surge",
            "url_hash": "test1",
            "title": "Bitcoin Hits $100k",
            "source": "coindesk",
            "source_tier": 1,
            "published_at": datetime.now(UTC),
            "coins_mentioned": ["BTC"],
            "cryptopanic_sentiment": "positive",
        },
        {
            "chunk_text": "Analysts expect the rally to continue, with ETF inflows reaching record levels.",
            "chunk_index": 1,
            "total_chunks": 2,
            "url": "https://example.com/btc-surge",
            "url_hash": "test1",
            "title": "Bitcoin Hits $100k",
            "source": "coindesk",
            "source_tier": 1,
            "published_at": datetime.now(UTC),
            "coins_mentioned": ["BTC"],
            "cryptopanic_sentiment": "positive",
        },
        {
            "chunk_text": "crypto is mooning hard, BTC to the moon, bears getting rekt lmao",
            "chunk_index": 0,
            "total_chunks": 1,
            "url": "https://example.com/crypto-moon",
            "url_hash": "test2",
            "title": "Crypto Mooning",
            "source": "cryptopanic",
            "source_tier": 1,
            "published_at": datetime.now(UTC),
            "coins_mentioned": ["BTC"],
            "cryptopanic_sentiment": "positive",
        },
        {
            "chunk_text": "Market crash imminent as whale dumps 10,000 BTC on exchanges. Fear and uncertainty grip traders.",
            "chunk_index": 0,
            "total_chunks": 1,
            "url": "https://example.com/crash",
            "url_hash": "test3",
            "title": "Whale Dump",
            "source": "decrypt",
            "source_tier": 1,
            "published_at": datetime.now(UTC),
            "coins_mentioned": ["BTC"],
            "cryptopanic_sentiment": "negative",
        },
        {
            "chunk_text": "Ethereum developers announced the next protocol upgrade scheduled for Q2.",
            "chunk_index": 0,
            "total_chunks": 1,
            "url": "https://example.com/eth-upgrade",
            "url_hash": "test4",
            "title": "ETH Upgrade",
            "source": "cointelegraph",
            "source_tier": 1,
            "published_at": datetime.now(UTC),
            "coins_mentioned": ["ETH"],
            "cryptopanic_sentiment": None,
        },
    ]

    print("=== Scoring chunks ===")
    scored = score_chunks(sample_chunks)
    for c in scored:
        print(
            f"[{c['model_used']}] {c['source']}: "
            f"score={c['sentiment_score']:+.3f} "
            f"conf={c['confidence']:.3f} "
            f"weighted={c['weighted_score']:+.4f} "
            f"{'⚠ LOW' if c['low_confidence'] else ''}"
        )

    print("\n=== Article aggregation ===")
    # Group by URL
    from itertools import groupby
    sorted_chunks = sorted(scored, key=lambda x: x["url"])
    for url, group in groupby(sorted_chunks, key=lambda x: x["url"]):
        agg = aggregate_article(list(group))
        print(f"{agg['title']}: score={agg['article_score']:+.4f} conf={agg['article_confidence']:.3f}")

    print("\n=== Coin sentiment (BTC) ===")
    btc_chunks = [c for c in scored if "BTC" in c.get("coins_mentioned", [])]
    signal = compute_coin_sentiment(btc_chunks, "BTC", window_hours=4)
    print(signal)
