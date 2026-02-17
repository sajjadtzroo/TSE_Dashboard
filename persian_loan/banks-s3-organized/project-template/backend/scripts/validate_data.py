"""
Validate all bank data.json files for MongoDB compatibility and schema consistency.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Required fields for banks
REQUIRED_BANK_FIELDS = ["id", "nameFA", "nameEN", "category"]

# Required fields for loan types
REQUIRED_LOAN_FIELDS = ["id", "nameFA", "nameEN"]

# Valid categories
VALID_CATEGORIES = ["digital-banks", "traditional-banks"]

# Valid bank types
VALID_TYPES = ["neobank", "private", "public", "state-owned", None]


def validate_json_file(file_path: Path) -> Tuple[bool, List[str]]:
    """Validate a single JSON file."""
    errors = []

    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"]
    except Exception as e:
        return False, [f"Error reading file: {e}"]

    # Check required bank fields
    for field in REQUIRED_BANK_FIELDS:
        if field not in data:
            errors.append(f"Missing required field: {field}")

    # Check category validity
    if data.get("category") not in VALID_CATEGORIES:
        errors.append(f"Invalid category: {data.get('category')}. Must be one of {VALID_CATEGORIES}")

    # Check type validity
    if "type" in data and data["type"] not in VALID_TYPES:
        errors.append(f"Invalid type: {data.get('type')}. Must be one of {VALID_TYPES}")

    # Check loanTypes array
    if "loanTypes" in data:
        if not isinstance(data["loanTypes"], list):
            errors.append("loanTypes must be an array")
        else:
            for i, loan in enumerate(data["loanTypes"]):
                for field in REQUIRED_LOAN_FIELDS:
                    if field not in loan:
                        errors.append(f"loanTypes[{i}] missing required field: {field}")

                # Check guarantor is boolean if present
                if "guarantor" in loan and not isinstance(loan["guarantor"], bool) and loan["guarantor"] not in [True, False, "بسته به مبلغ", "برای مبالغ بالا"]:
                    if not isinstance(loan["guarantor"], str):
                        errors.append(f"loanTypes[{i}] guarantor should be boolean or string, got: {type(loan['guarantor'])}")

    # Check loans array matches loanTypes
    if "loans" in data and "loanTypes" in data:
        loan_ids = [lt.get("id") for lt in data.get("loanTypes", [])]
        for loan_id in data.get("loans", []):
            if loan_id not in loan_ids:
                errors.append(f"loans array contains '{loan_id}' but it's not in loanTypes")

    # Check loansCount matches
    if "loansCount" in data and "loanTypes" in data:
        actual_count = len(data.get("loanTypes", []))
        declared_count = data.get("loansCount", 0)
        if actual_count != declared_count:
            errors.append(f"loansCount ({declared_count}) doesn't match actual loanTypes count ({actual_count})")

    # Check for MongoDB problematic fields (keys starting with $)
    def check_dollar_keys(obj: Any, path: str = "") -> List[str]:
        issues = []
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key.startswith("$"):
                    issues.append(f"Key starting with '$' at {path}.{key}")
                issues.extend(check_dollar_keys(value, f"{path}.{key}"))
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                issues.extend(check_dollar_keys(item, f"{path}[{i}]"))
        return issues

    dollar_issues = check_dollar_keys(data, "root")
    errors.extend(dollar_issues)

    return len(errors) == 0, errors


def validate_all_data(data_dir: Path) -> Dict[str, Any]:
    """Validate all data files in the directory."""
    results = {
        "total_files": 0,
        "valid_files": 0,
        "invalid_files": 0,
        "files": {},
        "summary": {
            "total_banks": 0,
            "total_loans": 0,
            "digital_banks": 0,
            "traditional_banks": 0,
            "banks_with_no_guarantor_loans": 0,
        }
    }

    # Find all data.json files (only in digital-banks and traditional-banks root)
    data_files = []

    digital_dir = data_dir / "digital-banks"
    traditional_dir = data_dir / "traditional-banks"

    for dir_path in [digital_dir, traditional_dir]:
        if dir_path.exists():
            for bank_dir in dir_path.iterdir():
                if bank_dir.is_dir():
                    data_file = bank_dir / "data.json"
                    if data_file.exists():
                        data_files.append(data_file)

    for file_path in data_files:
        results["total_files"] += 1
        is_valid, errors = validate_json_file(file_path)

        relative_path = str(file_path.relative_to(data_dir))
        results["files"][relative_path] = {
            "valid": is_valid,
            "errors": errors
        }

        if is_valid:
            results["valid_files"] += 1

            # Collect summary stats
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
                results["summary"]["total_banks"] += 1

                loan_count = len(data.get("loanTypes", []))
                results["summary"]["total_loans"] += loan_count

                if data.get("category") == "digital-banks":
                    results["summary"]["digital_banks"] += 1
                else:
                    results["summary"]["traditional_banks"] += 1

                # Count no-guarantor loans
                for loan in data.get("loanTypes", []):
                    if loan.get("guarantor") is False:
                        results["summary"]["banks_with_no_guarantor_loans"] += 1
                        break
        else:
            results["invalid_files"] += 1

    return results


def print_report(results: Dict[str, Any]):
    """Print validation report."""
    print("\n" + "=" * 60)
    print("BANK DATA VALIDATION REPORT")
    print("=" * 60)

    print(f"\n📊 Summary:")
    print(f"   Total files checked: {results['total_files']}")
    print(f"   ✅ Valid files: {results['valid_files']}")
    print(f"   ❌ Invalid files: {results['invalid_files']}")

    print(f"\n📈 Data Statistics:")
    print(f"   Total banks: {results['summary']['total_banks']}")
    print(f"   Total loans: {results['summary']['total_loans']}")
    print(f"   Digital banks: {results['summary']['digital_banks']}")
    print(f"   Traditional banks: {results['summary']['traditional_banks']}")
    print(f"   Banks with no-guarantor loans: {results['summary']['banks_with_no_guarantor_loans']}")

    if results["invalid_files"] > 0:
        print(f"\n❌ Invalid Files:")
        for file_path, file_result in results["files"].items():
            if not file_result["valid"]:
                print(f"\n   📁 {file_path}:")
                for error in file_result["errors"]:
                    print(f"      - {error}")

    print("\n" + "=" * 60)

    if results["invalid_files"] == 0:
        print("✅ All files are valid and ready for MongoDB import!")
    else:
        print(f"⚠️  {results['invalid_files']} file(s) need to be fixed before import.")

    print("=" * 60 + "\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Validate bank data files")
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

    results = validate_all_data(data_path)

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print_report(results)

    # Exit with error code if there are invalid files
    exit(0 if results["invalid_files"] == 0 else 1)
