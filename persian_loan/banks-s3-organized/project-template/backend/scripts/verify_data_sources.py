#!/usr/bin/env python3
"""
Comprehensive Data Source Verification Script
Analyzes all data.json and metadata.json files for completeness and consistency.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any, Tuple
from collections import defaultdict
import sys

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

def find_files(root_path: Path, filename: str) -> List[Path]:
    """Find all files with given name, excluding node_modules."""
    files = []
    for file in root_path.rglob(filename):
        if 'node_modules' not in str(file):
            files.append(file)
    return sorted(files)

def load_json(file_path: Path) -> Tuple[bool, Any, str]:
    """Load JSON file and return (success, data, error_message)."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return True, data, ""
    except json.JSONDecodeError as e:
        return False, None, f"JSON decode error: {e}"
    except Exception as e:
        return False, None, f"Error: {e}"

def analyze_data_json(file_path: Path, data: Dict) -> Dict[str, Any]:
    """Analyze a data.json file structure."""
    analysis = {
        'path': str(file_path),
        'has_required_fields': True,
        'missing_fields': [],
        'loan_count': 0,
        'fields_present': set(),
        'issues': []
    }

    # Required fields for bank
    required_fields = ['id', 'nameFA', 'nameEN', 'category']
    for field in required_fields:
        if field not in data:
            analysis['has_required_fields'] = False
            analysis['missing_fields'].append(field)

    # Collect all present fields
    analysis['fields_present'] = list(data.keys())

    # Check loan types
    if 'loanTypes' in data:
        analysis['loan_count'] = len(data['loanTypes'])

        # Check each loan
        for idx, loan in enumerate(data['loanTypes']):
            if 'id' not in loan:
                analysis['issues'].append(f"Loan #{idx} missing 'id' field")
            if 'nameFA' not in loan:
                analysis['issues'].append(f"Loan #{idx} missing 'nameFA' field")
    else:
        analysis['issues'].append("No 'loanTypes' field found")

    # Check for website URL
    if 'website' in data and data['website']:
        analysis['has_website'] = True
        analysis['website_url'] = data['website']
    else:
        analysis['has_website'] = False

    return analysis

def analyze_metadata_json(file_path: Path, data: Dict) -> Dict[str, Any]:
    """Analyze a metadata.json file structure."""
    analysis = {
        'path': str(file_path),
        'has_loans_field': 'loans' in data,
        'loan_ids': data.get('loans', []),
        'loan_count': len(data.get('loans', [])),
        'fields_present': list(data.keys())
    }
    return analysis

def compare_data_metadata(data_analysis: Dict, metadata_analysis: Dict) -> List[str]:
    """Compare data.json and metadata.json for consistency."""
    issues = []

    data_loan_count = data_analysis['loan_count']
    meta_loan_count = metadata_analysis['loan_count']

    if data_loan_count != meta_loan_count:
        issues.append(
            f"Loan count mismatch: data.json has {data_loan_count} loans, "
            f"metadata.json has {meta_loan_count} loan IDs"
        )

    return issues

def main():
    print_header("DATA SOURCE VERIFICATION REPORT")

    # Find root directory
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent.parent.parent

    print(f"Root directory: {root_dir}")

    # Find all data.json files
    print_section("1. DATA FILE INVENTORY")
    data_files = find_files(root_dir, "data.json")
    metadata_files = find_files(root_dir, "metadata.json")

    print(f"Found {len(data_files)} data.json files")
    print(f"Found {len(metadata_files)} metadata.json files")

    # Categorize files
    digital_data = [f for f in data_files if 'digital-banks' in str(f)]
    traditional_data = [f for f in data_files if 'traditional-banks' in str(f)]

    print(f"\nBreakdown:")
    print(f"  - Digital banks: {len(digital_data)}")
    print(f"  - Traditional banks: {len(traditional_data)}")
    print(f"  - Other: {len(data_files) - len(digital_data) - len(traditional_data)}")

    # Analyze each data.json file
    print_section("2. DATA.JSON VALIDATION")

    data_analyses = {}
    all_fields = defaultdict(int)
    total_loans = 0
    valid_files = 0
    invalid_files = 0

    for data_file in data_files:
        success, data, error = load_json(data_file)

        if not success:
            print_error(f"{data_file.parent.name}: {error}")
            invalid_files += 1
            continue

        analysis = analyze_data_json(data_file, data)
        data_analyses[str(data_file)] = analysis

        # Track field usage
        for field in analysis['fields_present']:
            all_fields[field] += 1

        total_loans += analysis['loan_count']

        # Print status
        bank_name = data_file.parent.name
        if analysis['has_required_fields'] and len(analysis['issues']) == 0:
            print_success(f"{bank_name}: {analysis['loan_count']} loans")
            valid_files += 1
        else:
            print_warning(f"{bank_name}: {analysis['loan_count']} loans, {len(analysis['issues'])} issues")
            for issue in analysis['issues']:
                print(f"    - {issue}")
            if analysis['missing_fields']:
                print(f"    - Missing required fields: {', '.join(analysis['missing_fields'])}")

    print(f"\nSummary:")
    print(f"  - Valid files: {valid_files}/{len(data_files)}")
    print(f"  - Invalid files: {invalid_files}/{len(data_files)}")
    print(f"  - Total loans: {total_loans}")

    # Analyze metadata.json files
    print_section("3. METADATA.JSON ANALYSIS")

    metadata_analyses = {}
    banks_with_metadata = set()
    banks_without_metadata = set()

    for data_file in data_files:
        bank_dir = data_file.parent
        metadata_file = bank_dir / "metadata.json"

        if metadata_file.exists():
            banks_with_metadata.add(str(bank_dir))
            success, metadata, error = load_json(metadata_file)

            if success:
                analysis = analyze_metadata_json(metadata_file, metadata)
                metadata_analyses[str(metadata_file)] = analysis

                # Compare with data.json if both exist
                data_analysis = data_analyses.get(str(data_file))
                if data_analysis:
                    issues = compare_data_metadata(data_analysis, analysis)
                    if issues:
                        print_warning(f"{bank_dir.name}:")
                        for issue in issues:
                            print(f"    - {issue}")
                    else:
                        print_success(f"{bank_dir.name}: Consistent")
            else:
                print_error(f"{bank_dir.name}: {error}")
        else:
            banks_without_metadata.add(str(bank_dir))

    print(f"\nMetadata coverage:")
    print(f"  - Banks with metadata.json: {len(banks_with_metadata)}")
    print(f"  - Banks without metadata.json: {len(banks_without_metadata)}")

    if banks_without_metadata:
        print(f"\nBanks missing metadata.json:")
        for bank_dir in sorted(banks_without_metadata):
            print(f"  - {Path(bank_dir).name}")

    # Field usage statistics
    print_section("4. FIELD USAGE STATISTICS")

    print("Most common fields (present in X files):")
    sorted_fields = sorted(all_fields.items(), key=lambda x: x[1], reverse=True)
    for field, count in sorted_fields[:20]:
        percentage = (count / len(data_files)) * 100
        print(f"  - {field:30s}: {count:2d}/{len(data_files)} ({percentage:5.1f}%)")

    # URL extraction
    print_section("5. URL EXTRACTION")

    urls = {}
    for data_file in data_files:
        success, data, _ = load_json(data_file)
        if success and 'website' in data and data['website']:
            bank_name = data.get('nameEN', data_file.parent.name)
            urls[bank_name] = data['website']

    print(f"Found {len(urls)} bank websites:")
    for bank, url in sorted(urls.items()):
        print(f"  - {bank:30s}: {url}")

    # Data structure analysis
    print_section("6. DATA STRUCTURE CONSISTENCY")

    # Check for nested loan files
    nested_loans = []
    for data_file in data_files:
        if '/loans/' in str(data_file):
            nested_loans.append(data_file)

    if nested_loans:
        print_warning(f"Found {len(nested_loans)} nested loan data.json files:")
        for loan_file in nested_loans:
            print(f"  - {loan_file}")
    else:
        print_success("No nested loan data.json files found")

    # Check for orphaned metadata.json
    print("\nChecking for orphaned metadata.json files:")
    orphaned = []
    for metadata_file in metadata_files:
        data_file = metadata_file.parent / "data.json"
        if not data_file.exists():
            orphaned.append(metadata_file)

    if orphaned:
        print_warning(f"Found {len(orphaned)} orphaned metadata.json files:")
        for meta_file in orphaned:
            print(f"  - {meta_file}")
    else:
        print_success("No orphaned metadata.json files found")

    # Supporting files
    print_section("7. SUPPORTING FILES")

    supporting_files = ['index.json', 'migration-map.json', 'vocabulary.json']
    for filename in supporting_files:
        file_path = root_dir / 'banks-s3-organized' / filename
        if file_path.exists():
            print_success(f"{filename} found")
            success, data, error = load_json(file_path)
            if success:
                if isinstance(data, list):
                    print(f"    - Contains {len(data)} entries")
                elif isinstance(data, dict):
                    print(f"    - Contains {len(data)} keys")
            else:
                print_error(f"    - {error}")
        else:
            print_warning(f"{filename} not found")

    # Generate JSON report
    print_section("8. GENERATING REPORT")

    report = {
        'summary': {
            'total_data_files': len(data_files),
            'total_metadata_files': len(metadata_files),
            'valid_data_files': valid_files,
            'invalid_data_files': invalid_files,
            'total_loans': total_loans,
            'digital_banks': len(digital_data),
            'traditional_banks': len(traditional_data),
            'banks_with_metadata': len(banks_with_metadata),
            'banks_without_metadata': len(banks_without_metadata),
        },
        'data_files': [str(f) for f in data_files],
        'metadata_files': [str(f) for f in metadata_files],
        'nested_loans': [str(f) for f in nested_loans],
        'orphaned_metadata': [str(f) for f in orphaned],
        'urls': urls,
        'field_usage': dict(sorted_fields),
        'data_analyses': data_analyses,
        'metadata_analyses': metadata_analyses,
    }

    report_path = script_dir / 'data_source_verification_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print_success(f"Report saved to: {report_path}")

    print_header("VERIFICATION COMPLETE")

    return 0 if invalid_files == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
