"""
AI enrichment service for news articles.
Uses OpenRouter LLM for sentiment analysis, impact scoring, symbol extraction,
and generates embeddings via rag.embedder.
"""

import json
import logging

from openai import OpenAI

from config.settings import NEWS_ENRICHMENT_MODEL, OPENROUTER_API_KEY

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
            timeout=30,
            max_retries=2,
        )
    return _client


_ENRICHMENT_PROMPT = """You are a financial news analyst. Analyze the following news article and return a JSON object with these fields:

- sentiment: one of "positive", "negative", "neutral"
- sentiment_score: float from -1.0 (most negative) to +1.0 (most positive)
- impact_score: integer 0-100 indicating how impactful this news is for financial markets
- related_symbols: list of stock/crypto symbols mentioned or implied (Persian for TSE stocks, English for crypto, e.g. ["فولاد", "BTC"])
- category: one of "stock", "crypto", "commodity", "economy", "general"
- tags: list of 2-5 short keyword tags describing the topic

Respond ONLY with valid JSON, no markdown or explanation.

Article:
Title: {title}
Body: {body}
Source: {source} ({source_type})
Language: {language}"""


def enrich_article(article, session) -> None:
    """Enrich a single NewsArticle with sentiment, impact, symbols via LLM.

    Updates the article fields in-place and commits the session.
    """
    client = _get_client()

    body_text = (article.body or "")[:2000]
    prompt = _ENRICHMENT_PROMPT.format(
        title=article.title,
        body=body_text,
        source=article.source,
        source_type=article.source_type,
        language=article.language,
    )

    try:
        resp = client.chat.completions.create(
            model=NEWS_ENRICHMENT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.0,
        )
        raw = resp.choices[0].message.content.strip()

        # Extract JSON from response (handle markdown code blocks)
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)

        # Update article fields
        article.sentiment_label = data.get("sentiment", "neutral")
        article.sentiment_score = max(-1.0, min(1.0, float(data.get("sentiment_score", 0.0))))
        article.impact_score = max(0, min(100, int(data.get("impact_score", 0))))
        article.related_symbols = data.get("related_symbols", [])
        article.category = data.get("category", "general")
        article.tags = data.get("tags", [])

        logger.info(
            f"Enriched article {article.id}: sentiment={article.sentiment_label}, "
            f"impact={article.impact_score}"
        )

    except Exception as e:
        logger.error(f"LLM enrichment failed for article {article.id}: {e}")
        # Set defaults so article is still usable
        article.sentiment_label = "neutral"
        article.sentiment_score = 0.0
        article.impact_score = 0
        article.category = article.category or "general"

    # Generate embedding from title + body
    try:
        from rag.embedder import embed_texts

        text_for_embedding = f"{article.title}\n{body_text}"
        embeddings = embed_texts([text_for_embedding])
        article.embedding = embeddings[0].tolist()
    except Exception as e:
        logger.error(f"Embedding generation failed for article {article.id}: {e}")

    session.commit()


def enrich_batch(articles, session) -> int:
    """Enrich multiple articles sequentially.

    Returns:
        Number of successfully enriched articles.
    """
    success_count = 0
    for article in articles:
        try:
            enrich_article(article, session)
            success_count += 1
        except Exception as e:
            logger.error(f"Failed to enrich article {article.id}: {e}")
    logger.info(f"Batch enrichment complete: {success_count}/{len(articles)} succeeded")
    return success_count
