# =============================================================================
# TSE Dashboard — Development Makefile
# =============================================================================

.PHONY: install format lint typecheck check ci test test-unit test-cov clean help

# Directories to check (excludes persian_loan, frontend, alembic/versions)
PYTHON_DIRS = api rag scheduler tsetmc_scraper database config scripts tests

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Setup ────────────────────────────────────────────────────────────────────

install: ## Install all dependencies and pre-commit hooks
	pip install -r requirements.txt -r requirements-dev.txt
	pre-commit install

# ── Formatting ───────────────────────────────────────────────────────────────

format: ## Auto-format code with isort + black
	isort $(PYTHON_DIRS)
	black $(PYTHON_DIRS)

# ── Linting ──────────────────────────────────────────────────────────────────

lint: ## Lint with ruff (auto-fix)
	ruff check --fix $(PYTHON_DIRS)

# ── Type checking ────────────────────────────────────────────────────────────

typecheck: ## Run mypy type checking
	mypy $(PYTHON_DIRS)

# ── Combined checks ─────────────────────────────────────────────────────────

check: format lint typecheck ## Format + lint + typecheck (developer workflow)

ci: ## All checks in strict mode (no auto-fix, for CI)
	isort --check-only --diff $(PYTHON_DIRS)
	black --check --diff $(PYTHON_DIRS)
	ruff check $(PYTHON_DIRS)
	mypy $(PYTHON_DIRS)

# ── Testing ──────────────────────────────────────────────────────────────────

test: ## Run full test suite
	pytest

test-unit: ## Run unit tests only
	pytest -m unit

test-cov: ## Run tests with coverage report
	pytest --cov --cov-report=html --cov-report=term-missing

# ── Cleanup ──────────────────────────────────────────────────────────────────

clean: ## Remove caches and build artifacts
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
