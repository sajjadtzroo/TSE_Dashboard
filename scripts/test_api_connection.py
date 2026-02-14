"""Test direct connection to TSETMC API"""
import requests
import json

print("="*80)
print("Testing TSETMC API Connection")
print("="*80)

# Test 1: Market Watch endpoint
print("\n1. Testing Market Watch endpoint...")
url = 'http://tsetmc.com/api/ClosingPrice/GetClosingPriceDailyAllInst'

try:
    print(f"   URL: {url}")
    response = requests.get(url, timeout=30)
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        instruments = data.get('closingPriceDaily', [])
        print(f"   ✓ SUCCESS! Received {len(instruments)} instruments")

        if instruments:
            print(f"\n   Sample instrument:")
            sample = instruments[0]
            print(f"   - InsCode: {sample.get('insCode')}")
            print(f"   - Symbol: {sample.get('lVal18AFC')}")
            print(f"   - Price: {sample.get('pClosing')}")
            print(f"   - Volume: {sample.get('qTotTran5J')}")
    else:
        print(f"   ✗ Error: Status {response.status_code}")
        print(f"   Response: {response.text[:500]}")

except requests.exceptions.Timeout:
    print("   ✗ Timeout: API is not responding")
except requests.exceptions.ConnectionError:
    print("   ✗ Connection Error: Cannot reach TSETMC")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 2: Client Type endpoint
print("\n2. Testing Client Type endpoint...")
url2 = 'http://tsetmc.com/api/ClientType/GetClientTypeAll'

try:
    print(f"   URL: {url2}")
    response = requests.get(url2, timeout=30)
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        client_data = data.get('clientType', [])
        print(f"   ✓ SUCCESS! Received {len(client_data)} records")
    else:
        print(f"   ✗ Error: Status {response.status_code}")

except Exception as e:
    print(f"   ✗ Error: {e}")

print("\n" + "="*80)
print("API Connection Test Complete")
print("="*80)
