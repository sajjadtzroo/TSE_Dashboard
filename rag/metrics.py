"""
RAG Pipeline Prometheus Metrics.

Provides histograms and counters for router, tool execution, search, LLM rounds,
and embedding operations. Metrics are exposed via the existing /metrics endpoint
set up by prometheus-fastapi-instrumentator.

Usage:
    from rag.metrics import rag_metrics
    with rag_metrics.router_latency.time():
        ...
    rag_metrics.router_cache.labels(hit="true").inc()
"""

import logging

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter, Histogram

    # ── Router metrics ────────────────────────────────────────────────────
    ROUTER_LATENCY = Histogram(
        "rag_router_latency_seconds",
        "Intent classification latency",
        buckets=(0.01, 0.05, 0.1, 0.3, 0.5, 1.0, 2.0),
    )
    ROUTER_CACHE = Counter(
        "rag_router_cache_total",
        "Router cache hits and misses",
        ["result"],  # hit / miss
    )
    ROUTER_INTENT = Counter(
        "rag_router_intent_total",
        "Intent classifications by category",
        ["intent"],
    )
    ROUTER_KEYWORD_BOOST = Counter(
        "rag_router_keyword_boost_total",
        "Keyword boost overrides",
        ["from_intent", "to_intent"],
    )

    # ── Tool execution metrics ────────────────────────────────────────────
    TOOL_LATENCY = Histogram(
        "rag_tool_latency_seconds",
        "Tool execution latency per tool",
        ["tool_name"],
        buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0),
    )
    TOOL_CACHE = Counter(
        "rag_tool_cache_total",
        "Tool cache hits and misses",
        ["tool_name", "result"],  # hit / miss
    )
    TOOL_ERRORS = Counter(
        "rag_tool_errors_total",
        "Tool execution errors",
        ["tool_name"],
    )

    # ── Search metrics ────────────────────────────────────────────────────
    SEARCH_LATENCY = Histogram(
        "rag_search_latency_seconds",
        "Search latency by mode",
        ["mode"],  # hybrid / vector / reranker
        buckets=(0.01, 0.05, 0.1, 0.3, 0.5, 1.0, 2.0, 5.0),
    )
    SEARCH_CACHE = Counter(
        "rag_search_cache_total",
        "Search result cache hits and misses",
        ["result"],  # hit / miss
    )
    SEARCH_RESULTS = Histogram(
        "rag_search_results_count",
        "Number of search results returned",
        buckets=(0, 1, 2, 3, 5, 10, 20),
    )

    # ── LLM metrics ──────────────────────────────────────────────────────
    LLM_LATENCY = Histogram(
        "rag_llm_latency_seconds",
        "LLM API call latency per round",
        ["agent"],
        buckets=(0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 15.0),
    )
    LLM_ROUNDS = Histogram(
        "rag_llm_rounds_total",
        "Tool-calling rounds per request",
        ["agent"],
        buckets=(1, 2, 3, 4, 5),
    )

    # ── Embedding metrics ────────────────────────────────────────────────
    EMBEDDING_LATENCY = Histogram(
        "rag_embedding_latency_seconds",
        "Embedding API call latency",
        buckets=(0.05, 0.1, 0.3, 0.5, 1.0, 2.0, 5.0),
    )
    EMBEDDING_CACHE = Counter(
        "rag_embedding_cache_total",
        "Embedding cache hits and misses",
        ["result"],  # hit / miss
    )
    EMBEDDING_BATCH_SIZE_METRIC = Histogram(
        "rag_embedding_batch_size",
        "Texts per embedding API call",
        buckets=(1, 10, 50, 100, 200, 500),
    )

    _METRICS_AVAILABLE = True
    logger.info("RAG Prometheus metrics registered")

except ImportError:
    _METRICS_AVAILABLE = False
    logger.info("prometheus_client not installed, RAG metrics disabled")


class _NoOpTimer:
    """No-op context manager when Prometheus is unavailable."""
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass


class _NoOpMetric:
    """No-op stand-in for Prometheus metrics when unavailable."""
    def labels(self, **kwargs):
        return self
    def inc(self, amount=1):
        pass
    def observe(self, value):
        pass
    def time(self):
        return _NoOpTimer()


class RAGMetrics:
    """Facade providing RAG metrics — falls back to no-ops if Prometheus unavailable."""

    def __init__(self):
        noop = _NoOpMetric()
        if _METRICS_AVAILABLE:
            self.router_latency = ROUTER_LATENCY
            self.router_cache = ROUTER_CACHE
            self.router_intent = ROUTER_INTENT
            self.router_keyword_boost = ROUTER_KEYWORD_BOOST
            self.tool_latency = TOOL_LATENCY
            self.tool_cache = TOOL_CACHE
            self.tool_errors = TOOL_ERRORS
            self.search_latency = SEARCH_LATENCY
            self.search_cache = SEARCH_CACHE
            self.search_results = SEARCH_RESULTS
            self.llm_latency = LLM_LATENCY
            self.llm_rounds = LLM_ROUNDS
            self.embedding_latency = EMBEDDING_LATENCY
            self.embedding_cache = EMBEDDING_CACHE
            self.embedding_batch_size = EMBEDDING_BATCH_SIZE_METRIC
        else:
            self.router_latency = noop
            self.router_cache = noop
            self.router_intent = noop
            self.router_keyword_boost = noop
            self.tool_latency = noop
            self.tool_cache = noop
            self.tool_errors = noop
            self.search_latency = noop
            self.search_cache = noop
            self.search_results = noop
            self.llm_latency = noop
            self.llm_rounds = noop
            self.embedding_latency = noop
            self.embedding_cache = noop
            self.embedding_batch_size = noop


rag_metrics = RAGMetrics()
