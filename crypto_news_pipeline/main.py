"""
CLI entry point for the crypto news pipeline.

Usage:
  python -m crypto_news_pipeline.main --run-once
  python -m crypto_news_pipeline.main --watch
  python -m crypto_news_pipeline.main --query "Bitcoin ETF approval"
  python -m crypto_news_pipeline.main --coin BTC --hours 4
"""

import argparse
import json
import logging
import sys

from .config import LOG_LEVEL, POLL_INTERVAL_MINUTES


def setup_logging(level: str = LOG_LEVEL):
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def cmd_run_once(args):
    from .pipeline import run_pipeline

    stats = run_pipeline(tiers=args.sources, embedder_type=args.embedder)
    print(json.dumps(stats, indent=2, default=str))
    if stats["errors"]:
        sys.exit(1)


def cmd_watch(args):
    from apscheduler.schedulers.blocking import BlockingScheduler

    from .pipeline import run_pipeline

    scheduler = BlockingScheduler()
    interval = args.interval or POLL_INTERVAL_MINUTES

    def job():
        logging.getLogger(__name__).info("Pipeline run triggered by scheduler")
        run_pipeline(tiers=args.sources, embedder_type=args.embedder)

    # Run immediately, then on interval
    scheduler.add_job(job, "interval", minutes=interval, next_run_time=None)
    print(f"Watching every {interval} minutes. Press Ctrl+C to stop.")

    # Run first pass immediately
    job()

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("\nStopped.")


def cmd_query(args):
    from .embedder import get_embedder
    from .store import NewsStore

    store = NewsStore()
    embedder = get_embedder(args.embedder)
    results = store.query(args.query, embedder, top_k=args.top_k)

    if not results:
        print("No results found.")
        return

    for i, r in enumerate(results, 1):
        score_str = f"{r['sentiment_score']:+.3f}" if r.get("sentiment_score") is not None else "N/A"
        print(f"\n--- Result {i} ---")
        print(f"Source: {r['source']} | Score: {score_str} | Coins: {r['coins_mentioned']}")
        print(f"Title: {r['title']}")
        print(f"Published: {r['published_at']}")
        print(f"Text: {r['chunk_text'][:300]}...")


def cmd_coin(args):
    from .store import NewsStore

    store = NewsStore()
    signal = store.compute_coin_sentiment(args.coin.upper(), window_hours=args.hours)
    print(json.dumps(signal, indent=2, default=str))


def main():
    parser = argparse.ArgumentParser(
        description="Crypto news scraping, sentiment scoring, and vectorization pipeline"
    )
    parser.add_argument("--log-level", default=LOG_LEVEL, help="Log level")

    sub = parser.add_subparsers(dest="command")

    # run-once
    p_run = sub.add_parser("run-once", help="Single pipeline pass, then exit")
    p_run.add_argument("--sources", default="tier1", choices=["tier1", "tier2", "all"])
    p_run.add_argument("--embedder", default=None, choices=["openai", "local"])

    # watch
    p_watch = sub.add_parser("watch", help="Continuous polling loop")
    p_watch.add_argument("--sources", default="tier1", choices=["tier1", "tier2", "all"])
    p_watch.add_argument("--embedder", default=None, choices=["openai", "local"])
    p_watch.add_argument("--interval", type=int, default=None, help="Poll interval (minutes)")

    # query
    p_query = sub.add_parser("query", help="Semantic search")
    p_query.add_argument("query", type=str, help="Search text")
    p_query.add_argument("--top-k", type=int, default=5)
    p_query.add_argument("--embedder", default=None, choices=["openai", "local"])

    # coin
    p_coin = sub.add_parser("coin", help="Coin sentiment signal")
    p_coin.add_argument("coin", type=str, help="Ticker symbol (e.g. BTC)")
    p_coin.add_argument("--hours", type=int, default=4, help="Time window in hours")

    args = parser.parse_args()
    setup_logging(args.log_level)

    if args.command == "run-once":
        cmd_run_once(args)
    elif args.command == "watch":
        cmd_watch(args)
    elif args.command == "query":
        cmd_query(args)
    elif args.command == "coin":
        cmd_coin(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
