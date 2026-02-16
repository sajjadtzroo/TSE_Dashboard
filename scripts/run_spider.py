"""
Utility script to manually run spiders
"""
import sys
import subprocess
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def run_spider(spider_name, args=None):
    """
    Run a spider with optional arguments

    Args:
        spider_name: Name of spider to run
        args: Additional spider arguments
    """
    cmd = ['python', '-m', 'scrapy', 'crawl', spider_name]

    if args:
        # Add spider arguments
        for key, value in args.items():
            cmd.extend(['-a', f'{key}={value}'])

    print(f"Running: {' '.join(cmd)}")
    print("="*80)

    subprocess.run(cmd, cwd=str(project_root))


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Run TSETMC spiders manually')
    parser.add_argument(
        'spider',
        choices=['market_watch', 'instrument_details', 'history_backfill', 'all'],
        help='Spider to run (or "all" to run all spiders)'
    )

    args = parser.parse_args()

    if args.spider == 'all':
        print("Running all spiders...")
        print("\n1. Market Watch Spider")
        run_spider('market_watch')

        print("\n2. Instrument Details Spider")
        run_spider('instrument_details')

        print("\n3. History Backfill Spider")
        run_spider('history_backfill')
    else:
        run_spider(args.spider)


if __name__ == '__main__':
    main()
