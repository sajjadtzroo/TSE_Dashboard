# MongoDB Schema Validation

## Overview

This project uses MongoDB JSON Schema validators to enforce data quality at the database level. Validators are applied with `validationLevel: "moderate"` to ensure new data meets quality standards without breaking existing documents.

## Architecture

### Components

1. **Validators Module** (`app/core/validators.py`)
   - Defines JSON Schema validators for all collections
   - Centralized validator definitions
   - Type-safe with proper BSON types

2. **Application Script** (`scripts/apply_schema_validation.py`)
   - Applies validators to MongoDB collections
   - Supports dry-run, backup, and verification modes
   - Safe for production use with moderate validation level

3. **Validation Script** (`scripts/validate_existing_data.py`)
   - Scans existing documents against schemas
   - Reports data quality issues without modifications
   - Generates detailed violation reports

4. **Tests** (`tests/test_validators.py`)
   - 24 comprehensive tests
   - Validates schema structure
   - Tests valid/invalid documents
   - Ensures existing data protection

## Validation Levels

MongoDB supports three validation levels:

| Level    | Behavior | Use Case |
|----------|----------|----------|
| `strict` | Validates all inserts and updates | New databases with no existing data |
| `moderate` | Validates new inserts and updates to valid documents | **Production (SAFE)** |
| `off` | No validation | Not recommended |

**We use `moderate`** because it:
- Validates all new data
- Protects existing documents from accidental corruption
- Allows gradual data quality improvement
- Won't break production systems

## Validators

### 1. Banks Collection

**Required Fields:**
- `id`, `nameFA`, `nameEN`, `category`

**Validation Rules:**
- `category`: Must be `"traditional-banks"` or `"digital-banks"`
- `loanTypes[].interestRateNumeric`: 0-100 range or null
- `loanTypes[].calculationMethod`: Enum of valid methods
- `loanTypes[].guarantor`: Boolean
- `loansCount`: Non-negative integer

**Example Valid Document:**
```json
{
  "id": "bank-melli",
  "nameFA": "بانک ملی",
  "nameEN": "Bank Melli Iran",
  "category": "traditional-banks",
  "loanTypes": [
    {
      "id": "loan-1",
      "nameFA": "وام ضروری",
      "interestRateNumeric": 18.0,
      "guarantor": true,
      "calculationMethod": "points-based"
    }
  ]
}
```

### 2. User Loans Collection

**Required Fields:**
- `user_id`, `loan_name`, `principal_amount`, `interest_rate`
- `total_installments`, `start_date`, `payment_day`

**Validation Rules:**
- `total_installments`: 1-600 range
- `payment_day`: 1-31 range
- `loan_type`: Enum of payment types
- `principal_amount`, `interest_rate`: Strings for decimal precision
- `is_active`: Boolean
- `start_date`: Date type

### 3. Payment Schedules Collection

**Required Fields:**
- `loan_id`, `installment_number`, `due_date`, `total_payment`, `status`

**Validation Rules:**
- `installment_number`: Positive integer
- `status`: `"pending"`, `"paid"`, `"overdue"`, or `"partial"`
- `due_date`: Date type
- Payment amounts: Strings for precision

### 4. Payment Alerts Collection

**Required Fields:**
- `user_id`, `loan_id`, `due_date`, `priority`, `status`

**Validation Rules:**
- `priority`: `"low"`, `"medium"`, `"high"`, or `"urgent"`
- `status`: Payment status enum
- `is_read`, `is_sent`: Boolean flags

### 5. Users Collection

**Required Fields:**
- `username`, `email`, `hashed_password`, `role`

**Validation Rules:**
- `username`: 3-50 characters
- `email`: Valid email pattern
- `role`: `"admin"` or `"user"`
- `is_active`: Boolean

### 6. Refresh Tokens Collection

**Required Fields:**
- `token`, `user_id`, `expires_at`

**Validation Rules:**
- `expires_at`: Date type
- `is_revoked`: Boolean

## Usage

### Apply Validators

```bash
# Dry run (see what would be applied)
python scripts/apply_schema_validation.py --dry-run

# Apply to all collections
python scripts/apply_schema_validation.py

# Apply to specific collection
python scripts/apply_schema_validation.py --collection banks

# Verify after applying
python scripts/apply_schema_validation.py --verify

# List current validators
python scripts/apply_schema_validation.py --list
```

### Validate Existing Data

```bash
# Validate all collections
python scripts/validate_existing_data.py

# Validate specific collection
python scripts/validate_existing_data.py --collection banks

# Show detailed violations
python scripts/validate_existing_data.py --verbose

# Generate JSON report
python scripts/validate_existing_data.py --output report.json

# Limit documents checked
python scripts/validate_existing_data.py --limit 100
```

### Run Tests

```bash
# Run validator tests
python -m pytest tests/test_validators.py -v

# Test enforcement in MongoDB
python scripts/test_validator_enforcement.py
```

## Integration with Code

Validators are automatically enforced at the database level. No code changes are needed in the application layer.

### Repository Layer

The repository classes work seamlessly with validators. Invalid documents will raise `WriteError` exceptions:

```python
from pymongo.errors import WriteError

try:
    await bank_repo.create(bank_data)
except WriteError as e:
    # Document failed validation
    logger.error(f"Validation error: {e}")
    raise HTTPException(status_code=400, detail="Invalid data")
```

### Service Layer

Services should handle validation errors gracefully:

```python
async def create_bank(self, bank_data: BankCreate) -> BankResponse:
    try:
        bank_id = await self.repo.create(bank_data.model_dump())
        return await self.get_bank(bank_id)
    except WriteError as e:
        raise ValueError(f"Data validation failed: {e}")
```

## Testing Results

### Unit Tests
```
✓ 24 tests passed
✓ All validator schemas validated
✓ Valid documents accepted
✓ Invalid documents rejected
✓ Existing data protection verified
```

### Integration Tests
```
✓ Valid bank accepted
✓ Invalid bank rejected (missing fields)
✓ Invalid enum rejected
✓ Out-of-range values rejected
✓ Null values accepted where allowed
```

### Database Validation
```
Collection: banks
  Total documents: 15
  Valid: 15 (100%)
  Invalid: 0
```

## Benefits

1. **Data Quality Assurance**
   - Enforces data types at database level
   - Prevents invalid data insertion
   - Validates enum values
   - Checks range constraints

2. **Production Safety**
   - Moderate validation level protects existing data
   - No breaking changes to production systems
   - Gradual data quality improvement path

3. **Developer Experience**
   - Clear validation errors
   - Comprehensive test coverage
   - Easy to understand schemas
   - Documentation-first approach

4. **Maintainability**
   - Centralized validator definitions
   - Single source of truth for data structure
   - Complements Pydantic models
   - Easy to update and version

## Migration Path

### Phase 1: ✅ Create Validators
- Define JSON Schema validators
- Create application scripts
- Write comprehensive tests
- Document usage

### Phase 2: Validate Existing Data
```bash
# Scan existing data
python scripts/validate_existing_data.py --verbose

# Fix violations if any found
# (Current status: All banks valid)
```

### Phase 3: Apply Validators
```bash
# Dry run first
python scripts/apply_schema_validation.py --dry-run

# Apply with moderate level (SAFE)
python scripts/apply_schema_validation.py --verify

# Test enforcement
python scripts/test_validator_enforcement.py
```

### Phase 4: Monitor and Maintain
- Monitor validation errors in logs
- Update validators as schema evolves
- Add new validators for new collections
- Regular data quality audits

## Best Practices

1. **Always Use Moderate Level in Production**
   - Protects existing data
   - Safe for live systems
   - Allows gradual migration

2. **Test Before Applying**
   - Use dry-run mode
   - Validate existing data first
   - Test with sample documents

3. **Handle Validation Errors**
   - Catch `WriteError` exceptions
   - Provide user-friendly messages
   - Log validation failures

4. **Keep Validators Updated**
   - Update when schema changes
   - Version control validator changes
   - Document breaking changes

5. **Regular Audits**
   - Run validation reports monthly
   - Fix data quality issues
   - Monitor validation error rates

## Troubleshooting

### Validator Not Applied
```bash
# Check if validator exists
python scripts/apply_schema_validation.py --list

# Reapply validator
python scripts/apply_schema_validation.py --collection banks
```

### Validation Errors
```bash
# Check existing data quality
python scripts/validate_existing_data.py --collection banks --verbose

# Test validator enforcement
python scripts/test_validator_enforcement.py
```

### Update Validator Schema
1. Edit `app/core/validators.py`
2. Run tests: `pytest tests/test_validators.py`
3. Reapply: `python scripts/apply_schema_validation.py --collection <name>`

## References

- [MongoDB JSON Schema Validation](https://docs.mongodb.com/manual/core/schema-validation/)
- [JSON Schema Specification](https://json-schema.org/)
- [BSON Types](https://docs.mongodb.com/manual/reference/bson-types/)

## Support

For questions or issues:
1. Check this documentation
2. Run validation scripts with `--verbose`
3. Review test examples in `tests/test_validators.py`
4. Check MongoDB logs for detailed errors
