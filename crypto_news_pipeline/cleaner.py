"""
Text cleaner and chunker — transforms raw articles into scored-ready chunks.
Strips HTML/boilerplate, splits into overlapping token-based chunks,
extracts mentioned coins.
"""

import logging
import re
import unicodedata

import tiktoken

from .config import (
    AMBIGUOUS_TICKERS,
    CHUNK_OVERLAP_TOKENS,
    CHUNK_SIZE_TOKENS,
    COIN_TICKERS,
    MIN_CHUNK_TOKENS,
    TIKTOKEN_ENCODING,
)

logger = logging.getLogger(__name__)

# Compile encoder once
_encoder = tiktoken.get_encoding(TIKTOKEN_ENCODING)

# Precompile coin matching patterns
# For ambiguous tickers (DOT, NEAR, etc.): only match standalone uppercase
_ambiguous_pattern = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in AMBIGUOUS_TICKERS) + r")\b"
)
# For all coins: case-insensitive match for full names, case-sensitive for tickers
_coin_names_lower = {}
for key, ticker in COIN_TICKERS.items():
    _coin_names_lower[key.lower()] = ticker


# ── Text cleaning ────────────────────────────────────────────────────────────


def clean_text(raw_text: str) -> str:
    """Strip HTML, ads, boilerplate, normalize whitespace."""
    if not raw_text:
        return ""

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", raw_text)

    # Remove zero-width and control characters (keep newlines)
    text = "".join(
        ch for ch in text
        if ch == "\n" or (not unicodedata.category(ch).startswith("C"))
    )

    # Remove common boilerplate phrases
    boilerplate = [
        r"subscribe to our newsletter.*",
        r"sign up for.*newsletter",
        r"read more:.*",
        r"related:.*",
        r"also read:.*",
        r"advertisement\s*",
        r"sponsored\s*",
        r"follow us on.*",
        r"share this article.*",
        r"click here.*",
    ]
    for pattern in boilerplate:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)

    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = text.strip()

    return text


# ── Token-based chunking ────────────────────────────────────────────────────


def count_tokens(text: str) -> int:
    """Count tokens using tiktoken."""
    return len(_encoder.encode(text))


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE_TOKENS,
    overlap: int = CHUNK_OVERLAP_TOKENS,
) -> list[str]:
    """
    Split text into overlapping chunks of ~chunk_size tokens.
    Returns list of chunk strings.
    """
    tokens = _encoder.encode(text)
    if len(tokens) <= chunk_size:
        return [text] if len(tokens) >= MIN_CHUNK_TOKENS else []

    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]

        # Decode back to text
        chunk_str = _encoder.decode(chunk_tokens)
        if len(chunk_tokens) >= MIN_CHUNK_TOKENS:
            chunks.append(chunk_str)

        # Advance by (chunk_size - overlap)
        start += chunk_size - overlap

    return chunks


# ── Coin mention extraction ──────────────────────────────────────────────────


def extract_coins(text: str) -> list[str]:
    """
    Find crypto coin mentions in text.
    Returns deduplicated list of canonical tickers (e.g. ["BTC", "ETH"]).
    """
    found = set()
    words = re.findall(r"\b\w+\b", text)

    for word in words:
        upper = word.upper()
        lower = word.lower()

        # Check if it's a known coin name/ticker
        if lower in _coin_names_lower:
            ticker = _coin_names_lower[lower]
            # For ambiguous tickers, require exact uppercase match
            if ticker in AMBIGUOUS_TICKERS:
                if word == upper and len(word) <= 5:
                    found.add(ticker)
            else:
                found.add(ticker)

    return sorted(found)


# ── Article → Chunks pipeline ────────────────────────────────────────────────


def process_article(article: dict) -> list[dict]:
    """
    Clean, chunk, and enrich a raw article dict.

    Input: raw article from fetcher.py
    Output: list of chunk dicts ready for sentiment scoring
    """
    raw_text = article.get("raw_text", "")
    cleaned = clean_text(raw_text)

    if not cleaned:
        logger.debug(f"Empty text after cleaning: {article.get('url', '')}")
        return []

    chunks = chunk_text(cleaned)
    if not chunks:
        logger.debug(f"No chunks above minimum size: {article.get('url', '')}")
        return []

    total_chunks = len(chunks)
    result = []

    for i, chunk_str in enumerate(chunks):
        coins = extract_coins(chunk_str)
        result.append({
            "chunk_text": chunk_str,
            "chunk_index": i,
            "total_chunks": total_chunks,
            "url": article["url"],
            "url_hash": article["url_hash"],
            "title": article["title"],
            "source": article["source"],
            "source_tier": article["source_tier"],
            "published_at": article["published_at"],
            "coins_mentioned": coins,
            "cryptopanic_sentiment": article.get("cryptopanic_sentiment"),
        })

    logger.debug(
        f"Processed {article.get('url', '')}: "
        f"{len(cleaned)} chars → {total_chunks} chunks"
    )
    return result


def process_articles(articles: list[dict]) -> list[dict]:
    """Process a batch of raw articles into chunks."""
    all_chunks = []
    for article in articles:
        try:
            chunks = process_article(article)
            all_chunks.extend(chunks)
        except Exception as exc:
            logger.error(
                f"Failed to process article {article.get('url', '?')}: {exc}",
                exc_info=True,
            )
    logger.info(f"Cleaned {len(articles)} articles → {len(all_chunks)} chunks")
    return all_chunks


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # Quick test with sample text
    sample = {
        "url": "https://example.com/test",
        "url_hash": "abc123",
        "title": "Bitcoin surges past $100k as Ethereum follows",
        "raw_text": (
            "Bitcoin surged past $100,000 today, marking a new all-time high. "
            "Ethereum also saw significant gains, climbing above $4,000. "
            "Analysts at CoinDesk suggest that SOL and AVAX could follow "
            "the rally, with Solana showing strong on-chain metrics. "
            "Meanwhile, DOGE and SHIB saw muted action. " * 10
        ),
        "source": "cointelegraph",
        "source_tier": 1,
        "published_at": "2024-01-15T10:00:00Z",
        "cryptopanic_sentiment": None,
    }
    chunks = process_article(sample)
    for c in chunks:
        print(f"Chunk {c['chunk_index']}/{c['total_chunks']}: "
              f"{count_tokens(c['chunk_text'])} tokens, "
              f"coins={c['coins_mentioned']}")
        print(f"  {c['chunk_text'][:100]}...")
        print()
