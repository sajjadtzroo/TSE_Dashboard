#!/usr/bin/env python3
"""
Schema Comparison Script
Compares Pydantic backend schemas with TypeScript frontend types.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set, Any
from collections import defaultdict

# Color codes
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

def parse_pydantic_schema(file_path: Path) -> Dict[str, Dict[str, Any]]:
    """Parse Pydantic schema file and extract field definitions."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    schemas = {}
    current_class = None
    current_fields = {}

    # Parse Python classes
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Match class definition
        class_match = re.match(r'^class (\w+)\(', line)
        if class_match:
            if current_class and current_fields:
                schemas[current_class] = current_fields
            current_class = class_match.group(1)
            current_fields = {}
            continue

        # Match field definitions
        field_match = re.match(r'\s+(\w+):\s*(.+?)(?:\s*=|$)', line)
        if field_match and current_class:
            field_name = field_match.group(1)
            field_type = field_match.group(2).strip()

            # Clean up type annotations
            field_type = field_type.replace('Optional[', '').replace(']', '')
            field_type = field_type.replace('List[', 'Array<').replace(']', '>')
            field_type = field_type.replace('Dict[', 'Record<').replace(']', '>')

            is_optional = 'Optional' in field_match.group(2) or '= None' in line or '| None' in line

            current_fields[field_name] = {
                'type': field_type,
                'optional': is_optional,
                'raw': field_match.group(2)
            }

    # Add last class
    if current_class and current_fields:
        schemas[current_class] = current_fields

    return schemas

def parse_typescript_types(file_path: Path) -> Dict[str, Dict[str, Any]]:
    """Parse TypeScript type definitions."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    types = {}
    current_interface = None
    current_fields = {}

    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]

        # Match interface/type definition
        interface_match = re.match(r'^export (?:interface|type) (\w+)', line)
        if interface_match:
            if current_interface and current_fields:
                types[current_interface] = current_fields
            current_interface = interface_match.group(1)
            current_fields = {}
            i += 1
            continue

        # Match field definitions
        field_match = re.match(r'\s+(\w+)(\?)?:\s*(.+?);?\s*(?://|$)', line)
        if field_match and current_interface:
            field_name = field_match.group(1)
            is_optional = field_match.group(2) == '?'
            field_type = field_match.group(3).strip()

            current_fields[field_name] = {
                'type': field_type,
                'optional': is_optional,
                'raw': field_type
            }

        i += 1

    # Add last interface
    if current_interface and current_fields:
        types[current_interface] = current_fields

    return types

def normalize_type(type_str: str) -> str:
    """Normalize type names for comparison."""
    # Map Python types to TypeScript equivalents
    type_map = {
        'str': 'string',
        'int': 'number',
        'float': 'number',
        'bool': 'boolean',
        'Any': 'any',
        'dict': 'object',
        'list': 'array'
    }

    normalized = type_str.lower()
    for py_type, ts_type in type_map.items():
        normalized = normalized.replace(py_type.lower(), ts_type)

    return normalized

def compare_schemas(pydantic_schemas: Dict, typescript_types: Dict) -> Dict:
    """Compare Pydantic and TypeScript schemas."""
    results = {
        'matched': [],
        'mismatches': [],
        'missing_in_typescript': [],
        'missing_in_pydantic': [],
        'type_differences': []
    }

    # Find matching schema pairs
    schema_pairs = [
        ('LoanTypeSchema', 'LoanType'),
        ('BankCreate', 'Bank'),
        ('BankResponse', 'Bank'),
    ]

    for py_class, ts_interface in schema_pairs:
        if py_class not in pydantic_schemas:
            results['missing_in_pydantic'].append(py_class)
            continue

        if ts_interface not in typescript_types:
            results['missing_in_typescript'].append(ts_interface)
            continue

        py_fields = pydantic_schemas[py_class]
        ts_fields = typescript_types[ts_interface]

        # Compare fields
        py_field_names = set(py_fields.keys())
        ts_field_names = set(ts_fields.keys())

        # Fields only in Python
        only_python = py_field_names - ts_field_names
        # Fields only in TypeScript
        only_typescript = ts_field_names - py_field_names
        # Common fields
        common_fields = py_field_names & ts_field_names

        comparison = {
            'pydantic_class': py_class,
            'typescript_interface': ts_interface,
            'only_in_python': list(only_python),
            'only_in_typescript': list(only_typescript),
            'common_fields': len(common_fields),
            'type_mismatches': []
        }

        # Check type compatibility for common fields
        for field in common_fields:
            py_field = py_fields[field]
            ts_field = ts_fields[field]

            py_type_norm = normalize_type(py_field['type'])
            ts_type_norm = normalize_type(ts_field['type'])

            # Check for type differences
            if py_type_norm != ts_type_norm:
                # Special case: number fields stored as strings
                if 'string' in ts_type_norm and 'number' in py_type_norm:
                    comparison['type_mismatches'].append({
                        'field': field,
                        'pydantic': py_field['type'],
                        'typescript': ts_field['type'],
                        'issue': 'CRITICAL: Numeric field stored as string'
                    })
                else:
                    comparison['type_mismatches'].append({
                        'field': field,
                        'pydantic': py_field['type'],
                        'typescript': ts_field['type'],
                        'issue': 'Type mismatch'
                    })

            # Check optional consistency
            if py_field['optional'] != ts_field['optional']:
                comparison['type_mismatches'].append({
                    'field': field,
                    'pydantic': f"{'Optional' if py_field['optional'] else 'Required'}",
                    'typescript': f"{'Optional (?)' if ts_field['optional'] else 'Required'}",
                    'issue': 'Optionality mismatch'
                })

        results['mismatches'].append(comparison)

    return results

def print_comparison_results(results: Dict):
    """Print formatted comparison results."""

    for comparison in results['mismatches']:
        py_class = comparison['pydantic_class']
        ts_interface = comparison['typescript_interface']

        print_section(f"Comparing {py_class} (Python) ↔ {ts_interface} (TypeScript)")

        print(f"\nCommon fields: {comparison['common_fields']}")

        # Fields only in Python
        if comparison['only_in_python']:
            print(f"\n{Colors.YELLOW}Fields only in Pydantic:{Colors.END}")
            for field in sorted(comparison['only_in_python']):
                print(f"  - {field}")

        # Fields only in TypeScript
        if comparison['only_in_typescript']:
            print(f"\n{Colors.YELLOW}Fields only in TypeScript:{Colors.END}")
            for field in sorted(comparison['only_in_typescript']):
                print(f"  - {field}")

        # Type mismatches
        if comparison['type_mismatches']:
            print(f"\n{Colors.RED}Type/Optionality Issues:{Colors.END}")
            for mismatch in comparison['type_mismatches']:
                print(f"\n  Field: {Colors.BOLD}{mismatch['field']}{Colors.END}")
                print(f"    Pydantic:   {mismatch['pydantic']}")
                print(f"    TypeScript: {mismatch['typescript']}")
                print(f"    {Colors.YELLOW}Issue: {mismatch['issue']}{Colors.END}")

def analyze_actual_data(data_files: List[Path]) -> Dict[str, Dict]:
    """Analyze actual data.json files to see field usage."""
    field_stats = defaultdict(lambda: {
        'count': 0,
        'types': set(),
        'sample_values': []
    })

    total_banks = 0
    total_loans = 0

    for data_file in data_files:
        try:
            with open(data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            total_banks += 1

            # Analyze bank fields
            for field, value in data.items():
                if field != 'loanTypes':
                    field_stats[f'Bank.{field}']['count'] += 1
                    field_stats[f'Bank.{field}']['types'].add(type(value).__name__)
                    if len(field_stats[f'Bank.{field}']['sample_values']) < 3 and value:
                        field_stats[f'Bank.{field}']['sample_values'].append(str(value)[:100])

            # Analyze loan fields
            if 'loanTypes' in data:
                for loan in data['loanTypes']:
                    total_loans += 1
                    for field, value in loan.items():
                        field_stats[f'LoanType.{field}']['count'] += 1
                        field_stats[f'LoanType.{field}']['types'].add(type(value).__name__)
                        if len(field_stats[f'LoanType.{field}']['sample_values']) < 3 and value:
                            field_stats[f'LoanType.{field}']['sample_values'].append(str(value)[:100])

        except Exception as e:
            print_error(f"Error analyzing {data_file}: {e}")

    return {
        'total_banks': total_banks,
        'total_loans': total_loans,
        'field_stats': {k: {
            'count': v['count'],
            'types': list(v['types']),
            'sample_values': v['sample_values']
        } for k, v in field_stats.items()}
    }

def main():
    print_header("SCHEMA COMPARISON REPORT")

    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    project_root = backend_dir.parent.parent.parent

    # Paths to schema files
    pydantic_path = backend_dir / 'app' / 'modules' / 'banks' / 'schemas.py'
    typescript_path = project_root / 'Persian_Loan' / 'frontend' / 'src' / 'types' / 'index.ts'

    # Alternative path if first doesn't exist
    if not typescript_path.exists():
        typescript_path = backend_dir.parent / 'frontend' / 'src' / 'types' / 'index.ts'

    print(f"Pydantic schemas: {pydantic_path}")
    print(f"TypeScript types: {typescript_path}")

    # Parse schemas
    print_section("1. PARSING SCHEMAS")

    if not pydantic_path.exists():
        print_error(f"Pydantic schema file not found: {pydantic_path}")
        return 1

    if not typescript_path.exists():
        print_error(f"TypeScript types file not found: {typescript_path}")
        return 1

    pydantic_schemas = parse_pydantic_schema(pydantic_path)
    print_success(f"Parsed {len(pydantic_schemas)} Pydantic schemas")

    typescript_types = parse_typescript_types(typescript_path)
    print_success(f"Parsed {len(typescript_types)} TypeScript interfaces/types")

    # Compare schemas
    print_section("2. COMPARING SCHEMAS")
    results = compare_schemas(pydantic_schemas, typescript_types)
    print_comparison_results(results)

    # Analyze actual data
    print_section("3. ACTUAL DATA ANALYSIS")
    data_files = []
    banks_dir = project_root / 'banks-s3-organized'
    for pattern in ['digital-banks/*/data.json', 'traditional-banks/*/data.json']:
        data_files.extend(banks_dir.glob(pattern))

    print(f"Analyzing {len(data_files)} data files...")
    data_analysis = analyze_actual_data(data_files)

    print(f"\nData statistics:")
    print(f"  - Total banks: {data_analysis['total_banks']}")
    print(f"  - Total loans: {data_analysis['total_loans']}")
    print(f"  - Unique fields found: {len(data_analysis['field_stats'])}")

    # Save report
    print_section("4. GENERATING REPORT")

    report = {
        'comparison': results,
        'data_analysis': data_analysis,
        'pydantic_schemas': {k: {field: {**v, 'type': str(v['type'])} for field, v in fields.items()}
                            for k, fields in pydantic_schemas.items()},
        'typescript_types': typescript_types
    }

    report_path = script_dir / 'schema_comparison_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print_success(f"Report saved to: {report_path}")

    print_header("COMPARISON COMPLETE")

    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
