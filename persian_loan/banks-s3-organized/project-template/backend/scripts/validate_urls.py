#!/usr/bin/env python3
"""
URL Validation Script
Tests all bank website URLs for accessibility and generates health report.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
import asyncio
import httpx
from urllib.parse import urlparse

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_section(text: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{text}{Colors.END}")
    print(f"{Colors.CYAN}{'-'*len(text)}{Colors.END}")

def print_success(text: str):
    print(f"{Colors.GREEN}✓{Colors.END} {text}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠{Colors.END} {text}")

def print_error(text: str):
    print(f"{Colors.RED}✗{Colors.END} {text}")

def find_data_files(root_path: Path) -> List[Path]:
    """Find all data.json files, excluding node_modules."""
    files = []
    for file in root_path.rglob("data.json"):
        if 'node_modules' not in str(file):
            files.append(file)
    return sorted(files)

def extract_urls(data_files: List[Path]) -> Dict[str, Dict]:
    """Extract all URLs from data.json files."""
    urls_data = {}

    for data_file in data_files:
        try:
            with open(data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if 'website' in data and data['website']:
                bank_id = data.get('id', data_file.parent.name)
                bank_name = data.get('nameEN', data_file.parent.name)

                urls_data[bank_id] = {
                    'bank_name': bank_name,
                    'bank_name_fa': data.get('nameFA', ''),
                    'url': data['website'],
                    'file_path': str(data_file),
                    'category': data.get('category', 'unknown')
                }
        except Exception as e:
            print_error(f"Error reading {data_file}: {e}")

    return urls_data

async def check_url(bank_id: str, url: str, timeout: int = 10) -> Dict:
    """Check URL accessibility and gather metadata."""
    result = {
        'bank_id': bank_id,
        'url': url,
        'status': 'unknown',
        'status_code': None,
        'response_time_ms': None,
        'final_url': url,
        'redirected': False,
        'redirect_chain': [],
        'ssl_valid': None,
        'error': None,
        'checked_at': datetime.utcnow().isoformat()
    }

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout,
            verify=True
        ) as client:
            start_time = asyncio.get_event_loop().time()

            response = await client.get(url)

            end_time = asyncio.get_event_loop().time()
            result['response_time_ms'] = round((end_time - start_time) * 1000, 2)

            result['status_code'] = response.status_code
            result['final_url'] = str(response.url)

            # Check if redirected
            if str(response.url) != url:
                result['redirected'] = True
                result['redirect_chain'] = [str(r.url) for r in response.history]

            # Determine status
            if 200 <= response.status_code < 300:
                result['status'] = 'success'
            elif 300 <= response.status_code < 400:
                result['status'] = 'redirect'
            elif 400 <= response.status_code < 500:
                result['status'] = 'client_error'
            elif 500 <= response.status_code < 600:
                result['status'] = 'server_error'

            # Check SSL
            if url.startswith('https://'):
                result['ssl_valid'] = True

    except httpx.TimeoutException:
        result['status'] = 'timeout'
        result['error'] = f'Request timed out after {timeout}s'
    except httpx.ConnectError as e:
        result['status'] = 'connection_error'
        result['error'] = f'Connection error: {str(e)}'
    except httpx.SSLError as e:
        result['status'] = 'ssl_error'
        result['error'] = f'SSL error: {str(e)}'
        result['ssl_valid'] = False
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)

    return result

async def check_all_urls(urls_data: Dict[str, Dict]) -> List[Dict]:
    """Check all URLs concurrently."""
    tasks = []
    for bank_id, data in urls_data.items():
        task = check_url(bank_id, data['url'])
        tasks.append(task)

    results = await asyncio.gather(*tasks)
    return results

def generate_report(urls_data: Dict[str, Dict], check_results: List[Dict]) -> Dict:
    """Generate comprehensive URL validation report."""
    # Merge data
    for result in check_results:
        bank_id = result['bank_id']
        if bank_id in urls_data:
            urls_data[bank_id].update(result)

    # Calculate statistics
    total = len(check_results)
    success = sum(1 for r in check_results if r['status'] == 'success')
    redirected = sum(1 for r in check_results if r['redirected'])
    timeout = sum(1 for r in check_results if r['status'] == 'timeout')
    connection_error = sum(1 for r in check_results if r['status'] == 'connection_error')
    ssl_error = sum(1 for r in check_results if r['status'] == 'ssl_error')
    client_error = sum(1 for r in check_results if r['status'] == 'client_error')
    server_error = sum(1 for r in check_results if r['status'] == 'server_error')
    error = sum(1 for r in check_results if r['status'] == 'error')

    # Calculate average response time for successful requests
    successful_times = [r['response_time_ms'] for r in check_results
                       if r['response_time_ms'] is not None]
    avg_response_time = round(sum(successful_times) / len(successful_times), 2) if successful_times else 0

    # Categorize results
    successful_urls = [urls_data[r['bank_id']] for r in check_results if r['status'] == 'success']
    failed_urls = [urls_data[r['bank_id']] for r in check_results if r['status'] != 'success']
    redirected_urls = [urls_data[r['bank_id']] for r in check_results if r['redirected']]

    # Check HTTPS usage
    http_urls = [data for data in urls_data.values() if data['url'].startswith('http://')]
    https_urls = [data for data in urls_data.values() if data['url'].startswith('https://')]

    report = {
        'summary': {
            'total_urls': total,
            'successful': success,
            'failed': total - success,
            'redirected': redirected,
            'timeout': timeout,
            'connection_error': connection_error,
            'ssl_error': ssl_error,
            'client_error': client_error,
            'server_error': server_error,
            'other_error': error,
            'http_urls': len(http_urls),
            'https_urls': len(https_urls),
            'avg_response_time_ms': avg_response_time,
            'success_rate': round((success / total) * 100, 2) if total > 0 else 0
        },
        'successful_urls': successful_urls,
        'failed_urls': failed_urls,
        'redirected_urls': redirected_urls,
        'http_urls': http_urls,
        'all_results': list(urls_data.values()),
        'checked_at': datetime.utcnow().isoformat()
    }

    return report

def print_report(report: Dict):
    """Print formatted report to console."""
    print_section("URL VALIDATION SUMMARY")

    summary = report['summary']
    total = summary['total_urls']

    print(f"Total URLs checked: {total}")
    print(f"Success rate: {summary['success_rate']}%")
    print(f"Average response time: {summary['avg_response_time_ms']}ms")
    print()

    # Status breakdown
    print("Status breakdown:")
    print(f"  {Colors.GREEN}✓{Colors.END} Successful:        {summary['successful']:2d} ({summary['successful']/total*100:5.1f}%)")
    print(f"  {Colors.RED}✗{Colors.END} Failed:            {summary['failed']:2d} ({summary['failed']/total*100:5.1f}%)")
    print(f"  {Colors.YELLOW}↻{Colors.END} Redirected:        {summary['redirected']:2d} ({summary['redirected']/total*100:5.1f}%)")
    print(f"  {Colors.RED}⏱{Colors.END} Timeout:           {summary['timeout']:2d}")
    print(f"  {Colors.RED}🔌{Colors.END} Connection error:  {summary['connection_error']:2d}")
    print(f"  {Colors.RED}🔒{Colors.END} SSL error:         {summary['ssl_error']:2d}")
    print(f"  {Colors.RED}4xx{Colors.END} Client error:     {summary['client_error']:2d}")
    print(f"  {Colors.RED}5xx{Colors.END} Server error:     {summary['server_error']:2d}")
    print()

    # HTTPS usage
    print("Security:")
    print(f"  HTTPS URLs: {summary['https_urls']:2d} ({summary['https_urls']/total*100:5.1f}%)")
    print(f"  HTTP URLs:  {summary['http_urls']:2d} ({summary['http_urls']/total*100:5.1f}%)")
    print()

    # Successful URLs
    if report['successful_urls']:
        print_section("SUCCESSFUL URLS")
        for data in sorted(report['successful_urls'], key=lambda x: x['response_time_ms'] or 0):
            response_time = data.get('response_time_ms', 'N/A')
            status_code = data.get('status_code', 'N/A')
            redirect_indicator = ' (redirected)' if data.get('redirected') else ''
            print(f"  {Colors.GREEN}✓{Colors.END} {data['bank_name']:35s} | {status_code} | {response_time:6}ms | {data['url']}{redirect_indicator}")

    # Failed URLs
    if report['failed_urls']:
        print_section("FAILED URLS")
        for data in report['failed_urls']:
            status = data.get('status', 'unknown')
            error = data.get('error', 'Unknown error')
            print(f"  {Colors.RED}✗{Colors.END} {data['bank_name']:35s} | {status:20s} | {data['url']}")
            print(f"      Error: {error}")

    # HTTP URLs (security warning)
    if report['http_urls']:
        print_section("SECURITY WARNING: HTTP URLS")
        print(f"{Colors.YELLOW}The following URLs use HTTP instead of HTTPS:{Colors.END}")
        for data in report['http_urls']:
            print(f"  {Colors.YELLOW}⚠{Colors.END} {data['bank_name']:35s} | {data['url']}")

    # Redirected URLs
    if report['redirected_urls']:
        print_section("REDIRECTED URLS")
        for data in report['redirected_urls']:
            print(f"  {Colors.YELLOW}↻{Colors.END} {data['bank_name']:35s}")
            print(f"      Original: {data['url']}")
            print(f"      Final:    {data.get('final_url', 'N/A')}")
            if data.get('redirect_chain'):
                print(f"      Chain: {' → '.join(data['redirect_chain'])}")

def main():
    print_header("URL VALIDATION REPORT")

    # Find root directory
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent.parent.parent

    print(f"Root directory: {root_dir}")

    # Find data files
    print_section("1. EXTRACTING URLS")
    data_files = find_data_files(root_dir)
    print(f"Found {len(data_files)} data.json files")

    urls_data = extract_urls(data_files)
    print(f"Extracted {len(urls_data)} bank URLs")

    # Check URLs
    print_section("2. CHECKING URL ACCESSIBILITY")
    print("Testing URLs (this may take a minute)...")

    check_results = asyncio.run(check_all_urls(urls_data))

    # Generate report
    print_section("3. GENERATING REPORT")
    report = generate_report(urls_data, check_results)

    # Print report
    print_report(report)

    # Save JSON report
    report_path = script_dir / 'url_validation_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print_section("REPORT SAVED")
    print_success(f"Detailed report saved to: {report_path}")

    print_header("VALIDATION COMPLETE")

    # Return exit code based on success rate
    success_rate = report['summary']['success_rate']
    if success_rate == 100:
        return 0
    elif success_rate >= 80:
        return 1
    else:
        return 2

if __name__ == '__main__':
    sys.exit(main())
