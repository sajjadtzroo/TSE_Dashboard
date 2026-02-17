"""
Test all API endpoints for banks and loans.
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"


def test_endpoint(method, path, description, params=None):
    """Test a single endpoint and print results."""
    url = f"{API_URL}{path}"
    print(f"\n{'='*60}")
    print(f"📍 {method} {path}")
    print(f"   {description}")
    print(f"{'='*60}")

    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=params, timeout=10)
        else:
            print(f"❌ Unknown method: {method}")
            return None

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            # Handle different response formats
            if isinstance(data, list):
                print(f"✅ Response: Array with {len(data)} items")
                if data and len(data) > 0:
                    print(f"   First item keys: {list(data[0].keys())[:5]}...")
                    # Show sample
                    if "nameFA" in data[0]:
                        for item in data[:3]:
                            print(f"   - {item.get('nameEN', item.get('id'))}: {item.get('nameFA')}")
                        if len(data) > 3:
                            print(f"   ... and {len(data) - 3} more")
            elif isinstance(data, dict):
                if "loans" in data:
                    print(f"✅ Response: Object with {data.get('total', len(data.get('loans', [])))} loans")
                    for loan in data.get("loans", [])[:3]:
                        print(f"   - {loan.get('loanNameFA', loan.get('nameFA', 'N/A'))}")
                elif "loanTypes" in data:
                    print(f"✅ Response: Bank detail with {len(data.get('loanTypes', []))} loan types")
                    print(f"   Bank: {data.get('nameFA')} ({data.get('nameEN')})")
                    print(f"   Category: {data.get('category')}")
                else:
                    print(f"✅ Response: Object with keys: {list(data.keys())[:5]}")
            else:
                print(f"✅ Response: {type(data).__name__}")

            return data
        else:
            print(f"❌ Error: {response.text[:200]}")
            return None

    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Server not running?")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def main():
    print("\n" + "="*60)
    print("🏦 IRANIAN BANKS LOAN DASHBOARD - API ENDPOINT TESTS")
    print("="*60)

    # Health check
    print(f"\n📍 GET {BASE_URL}/health")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"   Status: {r.json()}")
    except Exception as e:
        print(f"   ❌ Server not reachable: {e}")
        return

    # Banks endpoints
    print("\n\n" + "="*60)
    print("🏦 BANKS ENDPOINTS")
    print("="*60)

    test_endpoint("GET", "/banks/", "Get all banks")
    test_endpoint("GET", "/banks/digital", "Get digital banks only")
    test_endpoint("GET", "/banks/traditional", "Get traditional banks only")
    test_endpoint("GET", "/banks/blue-bank", "Get specific bank (Blue Bank)")
    test_endpoint("GET", "/banks/bankino", "Get specific bank (Bankino)")
    test_endpoint("GET", "/banks/blue-bank/loans", "Get loans for Blue Bank")
    test_endpoint("GET", "/banks/weepod/loans", "Get loans for Weepod")

    # Loans endpoints
    print("\n\n" + "="*60)
    print("💰 LOANS ENDPOINTS")
    print("="*60)

    test_endpoint("GET", "/loans/", "Get all loans")
    test_endpoint("GET", "/loans/no-guarantor", "Get loans without guarantor")
    test_endpoint("GET", "/loans/by-method/points-based", "Get points-based loans")
    test_endpoint("GET", "/loans/by-method/average-based", "Get average-based loans")
    test_endpoint("GET", "/loans/by-method/step-based", "Get step-based loans")
    test_endpoint("GET", "/loans/compare", "Compare loans",
                  params={"loan_ids": "blue-bank:personal,bankino:vamino-10m"})

    # Analytics endpoints
    print("\n\n" + "="*60)
    print("📊 ANALYTICS ENDPOINTS")
    print("="*60)

    test_endpoint("GET", "/analytics/summary", "Get summary statistics")
    test_endpoint("GET", "/analytics/by-category", "Get stats by category")
    test_endpoint("GET", "/analytics/by-method", "Get stats by calculation method")

    # Summary
    print("\n\n" + "="*60)
    print("✅ API ENDPOINT TESTS COMPLETE")
    print("="*60)


if __name__ == "__main__":
    main()
