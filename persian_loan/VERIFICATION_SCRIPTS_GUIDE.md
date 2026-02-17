# Data Verification Scripts - Quick Reference Guide

This guide provides instructions for running the data verification scripts created during the comprehensive pipeline verification.

---

## Overview

Three new verification scripts have been created:

1. **verify_data_sources.py** - Data source inventory and validation
2. **validate_urls.py** - URL accessibility and health checking
3. **compare_schemas.py** - Backend/Frontend schema comparison

Plus the existing validation script:

4. **validate_data.py** - JSON structure and MongoDB compatibility

---

## Script 1: Data Source Verification

**Purpose**: Comprehensive analysis of all data.json and metadata.json files

**Location**: `/backend/scripts/verify_data_sources.py`

### Usage

```bash
cd /workspaces/Persian_Loan/banks-s3-organized/project-template/backend
python scripts/verify_data_sources.py
```

### Output

**Console Output**:
- Colored terminal report with sections:
  1. Data File Inventory
  2. Data.json Validation
  3. Metadata.json Analysis
  4. Field Usage Statistics
  5. URL Extraction
  6. Data Structure Consistency
  7. Supporting Files Check
  8. Report Generation Status

**Generated Report**: `scripts/data_source_verification_report.json`

### Report Contents

```json
{
  "summary": {
    "total_data_files": 17,
    "total_metadata_files": 9,
    "valid_data_files": 15,
    "total_loans": 72,
    ...
  },
  "data_files": ["list of all data.json paths"],
  "metadata_files": ["list of all metadata.json paths"],
  "urls": {"Bank Name": "URL", ...},
  "field_usage": {"field": count, ...},
  "data_analyses": {/* detailed per-file analysis */},
  "metadata_analyses": {/* metadata file analysis */}
}
```

### What It Checks

- ✅ File inventory (data.json and metadata.json)
- ✅ Required fields presence (id, nameFA, nameEN, category)
- ✅ Loan structure (loanTypes array)
- ✅ Data/metadata consistency
- ✅ Field usage statistics
- ✅ Nested loan files
- ✅ Orphaned metadata files
- ✅ URL extraction

### Exit Codes

- `0` - All files valid
- `1` - Some files have issues

---

## Script 2: URL Validation

**Purpose**: Test accessibility of all bank website URLs

**Location**: `/backend/scripts/validate_urls.py`

### Usage

```bash
cd /workspaces/Persian_Loan/banks-s3-organized/project-template/backend
python scripts/validate_urls.py
```

### Requirements

```bash
pip install httpx
```

### Output

**Console Output**:
- URL Validation Summary
  - Success rate
  - Average response time
  - Status breakdown (success/failed/timeout/redirect)
  - Security analysis (HTTP vs HTTPS)
- Successful URLs (with response times)
- Failed URLs (with error details)
- Security warnings (HTTP URLs)
- Redirected URLs (with redirect chains)

**Generated Report**: `scripts/url_validation_report.json`

### Report Contents

```json
{
  "summary": {
    "total_urls": 15,
    "successful": 0,
    "failed": 15,
    "success_rate": 0.0,
    "avg_response_time_ms": 363.59,
    "http_urls": 1,
    "https_urls": 14,
    ...
  },
  "successful_urls": [],
  "failed_urls": [],
  "redirected_urls": [],
  "http_urls": [],
  "all_results": [/* detailed per-URL results */]
}
```

### What It Checks

- ✅ HTTP status codes (200-599)
- ✅ Response times (ms)
- ✅ SSL certificate validity
- ✅ Redirect chains
- ✅ Connection errors
- ✅ Timeout detection
- ✅ Security (HTTP vs HTTPS)

### Configuration

Default timeout: 10 seconds (adjustable in code)

### Exit Codes

- `0` - 100% success rate
- `1` - 80-99% success rate
- `2` - <80% success rate

### Note

URL validation may fail in restricted environments (like Codespaces). Run in production environment for accurate results.

---

## Script 3: Schema Comparison

**Purpose**: Compare Pydantic backend schemas with TypeScript frontend types

**Location**: `/backend/scripts/compare_schemas.py`

### Usage

```bash
cd /workspaces/Persian_Loan/banks-s3-organized/project-template/backend
python scripts/compare_schemas.py
```

### Output

**Console Output**:
- Parsing Summary
  - Number of Pydantic schemas parsed
  - Number of TypeScript interfaces parsed
- Schema Comparisons
  - LoanTypeSchema ↔ LoanType
  - BankCreate ↔ Bank
  - BankResponse ↔ Bank
  - For each: common fields, only in Python, only in TypeScript, type mismatches
- Actual Data Analysis
  - Field usage statistics from real data files

**Generated Report**: `scripts/schema_comparison_report.json`

### Report Contents

```json
{
  "comparison": {
    "mismatches": [
      {
        "pydantic_class": "LoanTypeSchema",
        "typescript_interface": "LoanType",
        "common_fields": 5,
        "only_in_python": ["field1", ...],
        "only_in_typescript": ["field2", ...],
        "type_mismatches": [...]
      }
    ]
  },
  "data_analysis": {
    "total_banks": 15,
    "total_loans": 72,
    "field_stats": {/* field usage in actual data */}
  },
  "pydantic_schemas": {/* parsed Pydantic schemas */},
  "typescript_types": {/* parsed TypeScript types */}
}
```

### What It Checks

- ✅ Field name differences
- ✅ Type mismatches (string vs number, etc.)
- ✅ Optionality differences (required vs optional)
- ✅ Field coverage (what's in one but not the other)
- ✅ Naming conventions (snake_case vs camelCase)
- ✅ Actual field usage in data files

### Files Analyzed

**Backend**: `/backend/app/modules/banks/schemas.py`
- LoanTypeSchema
- BankCreate
- BankResponse
- Other schemas

**Frontend**: `/frontend/src/types/index.ts`
- LoanType
- Bank
- Other interfaces

### Exit Codes

- `0` - Success

---

## Script 4: Data Validation (Existing)

**Purpose**: Validate JSON structure and MongoDB compatibility

**Location**: `/backend/scripts/validate_data.py`

### Usage

```bash
cd /workspaces/Persian_Loan/banks-s3-organized/project-template/backend
python scripts/validate_data.py --data-dir /workspaces/Persian_Loan/banks-s3-organized
```

### Parameters

- `--data-dir` - Path to banks-s3-organized directory (required)
- `--json` - Output JSON report instead of console report

### Output

**Console Output**:
```
============================================================
BANK DATA VALIDATION REPORT
============================================================

📊 Summary:
   Total files checked: 15
   ✅ Valid files: 15
   ❌ Invalid files: 0

📈 Data Statistics:
   Total banks: 15
   Total loans: 72
   Digital banks: 7
   Traditional banks: 8
   Banks with no-guarantor loans: 11
```

### What It Checks

- ✅ JSON format validity
- ✅ Required fields (id, nameFA, nameEN, category)
- ✅ Category validity (digital-banks | traditional-banks)
- ✅ Type validity
- ✅ loanTypes array structure
- ✅ Guarantor field format
- ✅ Cross-field integrity (loans array vs loanTypes IDs)
- ✅ MongoDB compatibility (no $ keys, valid _id format)

### Exit Codes

- `0` - All valid
- `1` - Some invalid

---

## Recommended Verification Workflow

### Initial Setup

1. **Verify Python environment**:
   ```bash
   python --version  # Should be 3.11+
   pip install loguru motor httpx
   ```

2. **Navigate to backend directory**:
   ```bash
   cd /workspaces/Persian_Loan/banks-s3-organized/project-template/backend
   ```

### Full Verification Sequence

Run scripts in this order for comprehensive verification:

#### Step 1: Data Source Verification
```bash
python scripts/verify_data_sources.py
```
**Review**: Check for missing files, orphaned metadata, structural issues

#### Step 2: Schema Validation
```bash
python scripts/validate_data.py --data-dir /workspaces/Persian_Loan/banks-s3-organized
```
**Review**: Ensure all files pass validation

#### Step 3: Schema Comparison
```bash
python scripts/compare_schemas.py
```
**Review**: Check for type mismatches, naming inconsistencies

#### Step 4: URL Validation (Optional)
```bash
python scripts/validate_urls.py
```
**Note**: May fail in restricted environments. Run in production for real results.

### Review Generated Reports

All reports are saved to `/backend/scripts/`:

```bash
ls -lh scripts/*.json

# View reports
cat scripts/data_source_verification_report.json | jq '.summary'
cat scripts/schema_comparison_report.json | jq '.comparison'
cat scripts/url_validation_report.json | jq '.summary'
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Data Verification

on:
  push:
    paths:
      - 'banks-s3-organized/**/*.json'

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install loguru motor httpx

      - name: Run data source verification
        run: |
          cd banks-s3-organized/project-template/backend
          python scripts/verify_data_sources.py

      - name: Run schema validation
        run: |
          cd banks-s3-organized/project-template/backend
          python scripts/validate_data.py --data-dir ../../../banks-s3-organized

      - name: Run schema comparison
        run: |
          cd banks-s3-organized/project-template/backend
          python scripts/compare_schemas.py

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: verification-reports
          path: banks-s3-organized/project-template/backend/scripts/*_report.json
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running data validation..."
cd banks-s3-organized/project-template/backend
python scripts/validate_data.py --data-dir ../../../banks-s3-organized

if [ $? -ne 0 ]; then
  echo "❌ Data validation failed. Commit aborted."
  exit 1
fi

echo "✅ Data validation passed."
```

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution**: Install dependencies
```bash
pip install loguru motor httpx
```

### Issue: "File not found" errors

**Solution**: Verify you're in the correct directory and paths are correct
```bash
pwd  # Should be in /backend directory
ls scripts/verify_data_sources.py  # Should exist
```

### Issue: URL validation always fails

**Reason**: May be running in restricted network environment (Codespaces, Docker, etc.)

**Solution**: Run in production environment with unrestricted internet access

### Issue: Schema comparison shows many differences

**Reason**: This is expected! Backend and frontend schemas serve different purposes and use different naming conventions.

**Action**: Review the specific differences. Critical issues are:
- Type mismatches (string vs number for numeric data)
- Optionality mismatches (required vs optional)
- Missing critical fields

Naming convention differences (snake_case vs camelCase) are expected if API does proper transformation.

---

## Next Steps After Verification

1. **Review all generated reports**
2. **Address critical issues** (see DATA_VERIFICATION_SUMMARY.md)
3. **Run import script** to test MongoDB import
4. **Start backend API** and test endpoints
5. **Run frontend** and test data consumption
6. **Implement runtime validation** (Zod schemas)
7. **Add integration tests** for API endpoints
8. **Set up periodic URL monitoring**

---

## Script Maintenance

### Updating Scripts

Scripts are located in `/backend/scripts/`:
- `verify_data_sources.py`
- `validate_urls.py`
- `compare_schemas.py`
- `validate_data.py`

To modify:
1. Edit the script
2. Test with sample data
3. Update this guide if behavior changes
4. Commit changes with descriptive message

### Adding New Checks

To add new validation rules:

1. **For data source checks**: Edit `verify_data_sources.py`, add checks in `analyze_data_json()`
2. **For schema validation**: Edit `validate_data.py`, add rules in `validate_json_file()`
3. **For URL checks**: Edit `validate_urls.py`, add checks in `check_url()`
4. **For schema comparison**: Edit `compare_schemas.py`, add logic in `compare_schemas()`

---

## Support

For issues or questions about these verification scripts:

1. **Review the generated reports** first
2. **Check this guide** for troubleshooting steps
3. **Consult DATA_VERIFICATION_SUMMARY.md** for context
4. **Review the script source code** - all scripts are well-documented

---

**Last Updated**: 2026-02-04
**Scripts Version**: 1.0
**Compatible With**: Python 3.11+
