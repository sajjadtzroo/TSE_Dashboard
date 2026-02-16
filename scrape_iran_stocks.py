#!/usr/bin/env python3
"""
Iran Stock Market Scraper
Scrapes all companies from databourse.ir/marketwatch
Outputs to JSON file
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def scrape_iran_stocks():
    """Scrape all companies from databourse.ir"""

    print("Fetching data from databourse.ir/marketwatch...")

    url = "https://databourse.ir/marketwatch"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        print(f"Response status: {response.status_code}")
        print("Parsing HTML...")

        soup = BeautifulSoup(response.content, 'html.parser')

        # Find the table containing stock data
        # This may need adjustment based on actual HTML structure
        companies = []

        # Try to find table rows
        # The site likely uses a table or div structure for the stock listings
        rows = soup.find_all('tr')

        if not rows:
            # Try alternative selectors
            rows = soup.find_all('div', class_=re.compile('stock|company|row', re.I))

        print(f"Found {len(rows)} rows")

        for row in rows:
            try:
                # Extract data from each row
                # This structure may need adjustment based on actual HTML
                cells = row.find_all(['td', 'div'])

                if len(cells) >= 6:  # Ensure we have enough data
                    company = {
                        'symbol': clean_text(cells[0].get_text()),
                        'name': clean_text(cells[1].get_text()) if len(cells) > 1 else '',
                        'latest_price': clean_number(cells[2].get_text()) if len(cells) > 2 else None,
                        'closing_price': clean_number(cells[3].get_text()) if len(cells) > 3 else None,
                        'price_change': clean_number(cells[4].get_text()) if len(cells) > 4 else None,
                        'price_change_percent': clean_number(cells[5].get_text()) if len(cells) > 5 else None,
                        'volume': clean_number(cells[6].get_text()) if len(cells) > 6 else None,
                        'value': clean_number(cells[7].get_text()) if len(cells) > 7 else None,
                        'trades_count': clean_number(cells[8].get_text()) if len(cells) > 8 else None,
                    }

                    # Only add if symbol is valid
                    if company['symbol'] and len(company['symbol']) > 0:
                        companies.append(company)

            except Exception as e:
                continue  # Skip problematic rows

        print(f"Extracted {len(companies)} companies")

        # Save to JSON
        output_file = 'iran_stocks.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(companies, f, ensure_ascii=False, indent=2)

        print(f"\n✅ Success! Data saved to: {output_file}")
        print(f"📊 Total companies: {len(companies)}")

        # Print sample
        if companies:
            print("\n📋 Sample data (first 5 companies):")
            for company in companies[:5]:
                print(f"  - {company['symbol']}: {company['name']} - {company['latest_price']}")

        return companies

    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching data: {e}")
        return []
    except Exception as e:
        print(f"❌ Error parsing data: {e}")
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
    print("Iran Stock Market Scraper")
    print("=" * 50)
    print()

    companies = scrape_iran_stocks()

    if companies:
        print(f"\n✅ Successfully scraped {len(companies)} companies!")
        print("📁 Output file: iran_stocks.json")
    else:
        print("\n⚠️ No companies found. The website structure may have changed.")
        print("Please check the HTML structure manually.")

    input("\nPress Enter to exit...")
