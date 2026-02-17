"""
Router Agent — classifies user intent to dispatch to specialized agents.
Uses a fast/cheap model for classification (~50 tokens, ~300ms).
"""
import json
import logging
from enum import Enum

from openai import OpenAI

logger = logging.getLogger(__name__)


class AgentIntent(str, Enum):
    MARKET_DATA = "market_data"
    DOCUMENT_QA = "document_qa"
    TECHNICAL_ANALYSIS = "technical_analysis"
    COMPARISON = "comparison"
    LOAN_ADVISOR = "loan_advisor"
    GENERAL = "general"


_ROUTER_SYSTEM_PROMPT = """You are a query classifier for a Tehran Stock Exchange assistant.
Given a user message, classify it into exactly ONE intent category.

Categories:
- market_data: Questions about stock prices, indices, volume, market cap, order books, gold, currency, crypto, ETF NAV, sector stocks, client type data, shareholders
- document_qa: Questions about financial reports, Codal documents, annual reports, earnings, balance sheets, disclosures, board decisions, PDFs
- technical_analysis: Questions about technical analysis, trends, support/resistance, RSI, MACD, moving averages, candlestick patterns, Bollinger bands
- comparison: Questions comparing multiple stocks, ranking, screening, filtering, "best", "top", same-sector comparisons
- loan_advisor: Questions about loans, banking products, installments, interest rates, guarantors, bank comparisons for loans
- general: Greetings, meta questions, ambiguous queries, or anything that doesn't fit above

Respond ONLY with valid JSON: {"intent": "<category>", "confidence": <0.0-1.0>}"""


def classify_intent(
    client: OpenAI,
    user_message: str,
    model: str = "openai/gpt-4o-mini",
) -> tuple[str, float]:
    """
    Classify a user message into an AgentIntent.

    Returns:
        (intent_name, confidence) — e.g. ("market_data", 0.95)
    """
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _ROUTER_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=50,
            temperature=0.0,
        )
        raw = resp.choices[0].message.content.strip()
        # Try to parse JSON from the response
        # Handle cases where model wraps in markdown code block
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        parsed = json.loads(raw)
        intent = parsed.get("intent", "general")
        confidence = float(parsed.get("confidence", 0.0))

        # Validate intent
        valid_intents = {e.value for e in AgentIntent}
        if intent not in valid_intents:
            logger.warning(f"Router returned unknown intent '{intent}', falling back to general")
            return AgentIntent.GENERAL.value, 0.0

        # Low confidence fallback
        if confidence < 0.3:
            logger.info(f"Router low confidence ({confidence}) for '{intent}', using general")
            return AgentIntent.GENERAL.value, confidence

        logger.info(f"Router classified intent: {intent} (confidence={confidence})")
        return intent, confidence

    except Exception as e:
        logger.warning(f"Router classification failed: {e}, falling back to general")
        return AgentIntent.GENERAL.value, 0.0
