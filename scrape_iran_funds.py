#!/usr/bin/env python3
"""
Iran Investment Funds Scraper
Scrapes all funds from databourse.ir/funds
Outputs to JSON file
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def scrape_iran_funds():
    """Scrape all investment funds from databourse.ir"""

    print("Fetching data from databourse.ir/funds...")

    url = "https://databourse.ir/funds"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        print(f"Response status: {response.status_code}")
        print("Parsing HTML...")

        soup = BeautifulSoup(response.content, 'html.parser')

        # Find all table rows
        funds = []
        rows = soup.find_all('tr')

        print(f"Found {len(rows)} rows")

        for row in rows:
            try:
                cells = row.find_all(['td', 'div'])

                if len(cells) >= 6:
                    fund = {
                        'name': clean_text(cells[0].get_text()),
                        'fund_type': clean_text(cells[1].get_text()) if len(cells) > 1 else '',
                        'nav': clean_number(cells[2].get_text()) if len(cells) > 2 else None,
                        'issue_price': clean_number(cells[3].get_text()) if len(cells) > 3 else None,
                        'cancellation_price': clean_number(cells[4].get_text()) if len(cells) > 4 else None,
                        'statistical_nav': clean_number(cells[5].get_text()) if len(cells) > 5 else None,
                        'one_year_return': clean_number(cells[6].get_text()) if len(cells) > 6 else None,
                        'efficiency': clean_number(cells[7].get_text()) if len(cells) > 7 else None,
                        'last_update': clean_text(cells[8].get_text()) if len(cells) > 8 else '',
                    }

                    # Only add if name is valid
                    if fund['name'] and len(fund['name']) > 2:
                        funds.append(fund)

            except Exception as e:
                continue

        print(f"Extracted {len(funds)} funds")

        # Save to JSON
        output_file = 'iran_funds.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(funds, f, ensure_ascii=False, indent=2)

        print(f"Success! Data saved to: {output_file}")
        print(f"Total funds: {len(funds)}")

        # Print sample
        if funds:
            print("\nSample data (first 5 funds):")
            for fund in funds[:5]:
                print(f"  - {fund['name']}: NAV={fund['nav']}, Type={fund['fund_type']}")

        return funds

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return []
    except Exception as e:
        print(f"Error parsing data: {e}")
        return []

def clean_text(text):
    """Clean and normalize text"""
    if not text:
        return ""
    return text.strip().replace('\n', ' ').replace('\r', '').replace('\t', ' ')

def clean_number(text):
    """Extract number from text"""
    if not text:
        return None

    # Remove commas and non-numeric characters except dots and minus
    cleaned = re.sub(r'[^\d.\-]', '', text.replace(',', ''))

    try:
        if '.' in cleaned:
            return float(cleaned)
        else:
            return int(cleaned) if cleaned else None
    except ValueError:
        return None

if __name__ == "__main__":
    print("=" * 50)
    print("Iran Investment Funds Scraper")
    print("=" * 50)
    print()

    funds = scrape_iran_funds()

    if funds:
        print(f"\nSuccessfully scraped {len(funds)} funds!")
        print("Output file: iran_funds.json")
    else:
        print("\nNo funds found. The website structure may have changed.")

    # Don't pause, just finish
