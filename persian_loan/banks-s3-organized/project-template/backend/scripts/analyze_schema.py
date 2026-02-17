"""
Analyze schema and data structure across all bank data files.
"""

import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Set


def collect_all_fields(obj: Any, prefix: str = "") -> Set[str]:
    """Recursively collect all field paths in an object."""
    fields = set()

    if isinstance(obj, dict):
        for key, value in obj.items():
            field_path = f"{prefix}.{key}" if prefix else key
            fields.add(field_path)
            fields.update(collect_all_fields(value, field_path))
    elif isinstance(obj, list) and obj:
        # Just check the first item for structure
        fields.update(collect_all_fields(obj[0], f"{prefix}[]"))

    return fields


def analyze_data(data_dir: Path) -> Dict[str, Any]:
    """Analyze all data files and collect schema information."""

    analysis = {
        "banks": [],
        "all_bank_fields": set(),
        "all_loan_fields": set(),
        "field_usage": defaultdict(int),
        "loan_categories": defaultdict(int),
        "loan_types_by_bank": {},
        "interest_rates": [],
        "max_amounts": [],
        "guarantor_stats": {"required": 0, "not_required": 0, "conditional": 0}
    }

    digital_dir = data_dir / "digital-banks"
    traditional_dir = data_dir / "traditional-banks"

    for dir_path in [digital_dir, traditional_dir]:
        if not dir_path.exists():
            continue

        for bank_dir in dir_path.iterdir():
            if not bank_dir.is_dir():
                continue

            data_file = bank_dir / "data.json"
            if not data_file.exists():
                continue

            with open(data_file, encoding="utf-8") as f:
                data = json.load(f)

            # Collect bank info
            bank_info = {
                "id": data.get("id"),
                "nameFA": data.get("nameFA"),
                "nameEN": data.get("nameEN"),
                "category": data.get("category"),
                "type": data.get("type"),
                "loansCount": len(data.get("loanTypes", [])),
            }
            analysis["banks"].append(bank_info)

            # Collect all fields
            analysis["all_bank_fields"].update(collect_all_fields(data))

            # Analyze loan types
            loan_names = []
            for loan in data.get("loanTypes", []):
                analysis["all_loan_fields"].update(collect_all_fields(loan))

                loan_names.append(loan.get("nameFA", loan.get("id")))

                # Category stats
                category = loan.get("category", "unknown")
                analysis["loan_categories"][category] += 1

                # Interest rate
                if loan.get("interestRate"):
                    analysis["interest_rates"].append({
                        "bank": data.get("nameFA"),
                        "loan": loan.get("nameFA"),
                        "rate": loan.get("interestRate")
                    })

                # Max amount
                if loan.get("maxAmount"):
                    analysis["max_amounts"].append({
                        "bank": data.get("nameFA"),
                        "loan": loan.get("nameFA"),
                        "amount": loan.get("maxAmount")
                    })

                # Guarantor stats
                guarantor = loan.get("guarantor")
                if guarantor is True:
                    analysis["guarantor_stats"]["required"] += 1
                elif guarantor is False:
                    analysis["guarantor_stats"]["not_required"] += 1
                else:
                    analysis["guarantor_stats"]["conditional"] += 1

            analysis["loan_types_by_bank"][data.get("id")] = loan_names

    # Convert sets to sorted lists for JSON serialization
    analysis["all_bank_fields"] = sorted(analysis["all_bank_fields"])
    analysis["all_loan_fields"] = sorted(analysis["all_loan_fields"])
    analysis["loan_categories"] = dict(analysis["loan_categories"])

    return analysis


def print_analysis(analysis: Dict[str, Any]):
    """Print the analysis report."""

    print("\n" + "=" * 70)
    print("SCHEMA AND DATA STRUCTURE ANALYSIS")
    print("=" * 70)

    # Banks summary
    print("\n📊 BANKS SUMMARY")
    print("-" * 70)
    print(f"{'ID':<20} {'Name (FA)':<25} {'Category':<20} {'Loans'}")
    print("-" * 70)
    for bank in sorted(analysis["banks"], key=lambda x: x["category"]):
        print(f"{bank['id']:<20} {bank['nameFA']:<25} {bank['category']:<20} {bank['loansCount']}")

    # Loan categories
    print("\n📁 LOAN CATEGORIES")
    print("-" * 70)
    for category, count in sorted(analysis["loan_categories"].items(), key=lambda x: -x[1]):
        print(f"  {category:<30} {count} loans")

    # Guarantor statistics
    print("\n🔐 GUARANTOR REQUIREMENTS")
    print("-" * 70)
    stats = analysis["guarantor_stats"]
    total = stats["required"] + stats["not_required"] + stats["conditional"]
    print(f"  No guarantor needed:  {stats['not_required']} ({stats['not_required']*100//total}%)")
    print(f"  Guarantor required:   {stats['required']} ({stats['required']*100//total}%)")
    print(f"  Conditional:          {stats['conditional']} ({stats['conditional']*100//total}%)")

    # Bank fields schema
    print("\n📋 BANK DOCUMENT FIELDS (MongoDB Schema)")
    print("-" * 70)
    root_fields = [f for f in analysis["all_bank_fields"] if "." not in f and "[]" not in f]
    for field in sorted(root_fields):
        print(f"  - {field}")

    # Loan fields schema
    print("\n📋 LOAN TYPE FIELDS (Nested in loanTypes[])")
    print("-" * 70)
    loan_fields = [f.replace("loanTypes[].", "") for f in analysis["all_loan_fields"]
                   if f.startswith("loanTypes[].") and f.count(".") == 1]
    for field in sorted(set(loan_fields)):
        print(f"  - {field}")

    # Loans by bank
    print("\n🏦 LOANS BY BANK")
    print("-" * 70)
    for bank_id, loans in sorted(analysis["loan_types_by_bank"].items()):
        print(f"\n  {bank_id}:")
        for loan in loans:
            print(f"    • {loan}")

    print("\n" + "=" * 70)
    print("✅ Schema analysis complete!")
    print("=" * 70)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Analyze bank data schema")
    parser.add_argument(
        "--data-dir",
        type=str,
        default="../../../",
        help="Path to banks-s3-organized directory"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    args = parser.parse_args()

    data_path = Path(args.data_dir).resolve()

    if not data_path.exists():
        print(f"Error: Data directory not found: {data_path}")
        exit(1)

    analysis = analyze_data(data_path)

    if args.json:
        # Remove non-serializable items
        output = {
            "banks": analysis["banks"],
            "all_bank_fields": analysis["all_bank_fields"],
            "all_loan_fields": analysis["all_loan_fields"],
            "loan_categories": analysis["loan_categories"],
            "guarantor_stats": analysis["guarantor_stats"],
            "loan_types_by_bank": analysis["loan_types_by_bank"],
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        print_analysis(analysis)
