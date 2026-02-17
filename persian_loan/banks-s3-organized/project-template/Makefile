# =============================================================================
# Persian Loan Banks - Makefile
# =============================================================================
# Simplify common Docker Compose operations

.PHONY: help
.DEFAULT_GOAL := help

# Colors for terminal output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------
help: ## Show this help message
	@echo "$(BLUE)Persian Loan Banks - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Profiles:$(NC)"
	@echo "  $(GREEN)admin$(NC)  - Start with Mongo Express (database UI)"
	@echo "  $(GREEN)cache$(NC)  - Start with Redis caching"

# -----------------------------------------------------------------------------
# Environment Setup
# -----------------------------------------------------------------------------
.env:
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN)✓ .env created. Please update with your values.$(NC)"; \
	else \
		echo "$(GREEN)✓ .env already exists$(NC)"; \
	fi

# -----------------------------------------------------------------------------
# Development Commands
# -----------------------------------------------------------------------------
up: .env ## Start development environment
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✓ Services started!$(NC)"
	@echo ""
	@echo "$(BLUE)Services:$(NC)"
	@echo "  Frontend:  http://localhost:5173"
	@echo "  Backend:   http://localhost:8000"
	@echo "  API Docs:  http://localhost:8000/docs"
	@echo ""

up-admin: .env ## Start with Mongo Express (database UI)
	@echo "$(BLUE)Starting with admin tools...$(NC)"
	docker compose --profile admin up -d
	@echo "$(GREEN)✓ Services started!$(NC)"
	@echo ""
	@echo "$(BLUE)Additional Services:$(NC)"
	@echo "  Mongo Express: http://localhost:8081 (admin/admin123)"

up-cache: .env ## Start with Redis caching
	@echo "$(BLUE)Starting with Redis cache...$(NC)"
	docker compose --profile cache up -d
	@echo "$(GREEN)✓ Services started with cache!$(NC)"

down: ## Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(YELLOW)Restarting services...$(NC)"
	docker compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

# -----------------------------------------------------------------------------
# Build Commands
# -----------------------------------------------------------------------------
build: ## Build all services
	@echo "$(BLUE)Building services...$(NC)"
	DOCKER_BUILDKIT=1 docker compose build
	@echo "$(GREEN)✓ Build complete$(NC)"

rebuild: ## Rebuild and restart all services
	@echo "$(BLUE)Rebuilding services...$(NC)"
	DOCKER_BUILDKIT=1 docker compose up -d --build
	@echo "$(GREEN)✓ Rebuild complete$(NC)"

# -----------------------------------------------------------------------------
# Production Commands
# -----------------------------------------------------------------------------
prod-up: .env ## Start production environment
	@echo "$(BLUE)Starting production environment...$(NC)"
	@echo "$(YELLOW)⚠️  Ensure DEBUG=false in .env$(NC)"
	docker compose -f docker-compose.prod.yml up -d --build
	@echo "$(GREEN)✓ Production services started!$(NC)"

prod-down: ## Stop production environment
	@echo "$(YELLOW)Stopping production services...$(NC)"
	docker compose -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Production services stopped$(NC)"

prod-logs: ## View production logs
	docker compose -f docker-compose.prod.yml logs -f

# -----------------------------------------------------------------------------
# Logs
# -----------------------------------------------------------------------------
logs: ## View logs for all services
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-frontend: ## View frontend logs
	docker compose logs -f frontend

logs-mongodb: ## View MongoDB logs
	docker compose logs -f mongodb

# -----------------------------------------------------------------------------
# Status & Health
# -----------------------------------------------------------------------------
ps: ## Show service status
	@echo "$(BLUE)Service Status:$(NC)"
	@docker compose ps

status: ps ## Alias for ps

health: ## Check service health
	@echo "$(BLUE)Health Check:$(NC)"
	@echo -n "Backend:  "
	@curl -sf http://localhost:8000/health > /dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo -n "MongoDB:  "
	@docker compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" > /dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"

# -----------------------------------------------------------------------------
# Database Operations
# -----------------------------------------------------------------------------
db-shell: ## Open MongoDB shell
	@echo "$(BLUE)Opening MongoDB shell...$(NC)"
	docker compose exec mongodb mongosh -u admin -p $$(grep MONGO_PASSWORD .env | cut -d '=' -f2)

db-backup: ## Backup MongoDB database
	@echo "$(BLUE)Creating database backup...$(NC)"
	@mkdir -p backups
	@BACKUP_FILE=backups/backup-$$(date +%Y%m%d_%H%M%S).archive; \
	docker compose exec -T mongodb mongodump \
		--username=admin \
		--password=$$(grep MONGO_PASSWORD .env | cut -d '=' -f2) \
		--archive=/tmp/backup.archive && \
	docker compose cp mongodb:/tmp/backup.archive $$BACKUP_FILE && \
	echo "$(GREEN)✓ Backup saved to $$BACKUP_FILE$(NC)"

db-restore: ## Restore MongoDB database (use BACKUP_FILE=path/to/backup.archive)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: BACKUP_FILE not specified$(NC)"; \
		echo "Usage: make db-restore BACKUP_FILE=backups/backup.archive"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring from $(BACKUP_FILE)...$(NC)"
	@docker compose cp $(BACKUP_FILE) mongodb:/tmp/restore.archive && \
	docker compose exec -T mongodb mongorestore \
		--username=admin \
		--password=$$(grep MONGO_PASSWORD .env | cut -d '=' -f2) \
		--archive=/tmp/restore.archive && \
	echo "$(GREEN)✓ Database restored$(NC)"

# -----------------------------------------------------------------------------
# Shell Access
# -----------------------------------------------------------------------------
shell-backend: ## Open shell in backend container
	@echo "$(BLUE)Opening backend shell...$(NC)"
	docker compose exec backend bash

shell-frontend: ## Open shell in frontend container
	@echo "$(BLUE)Opening frontend shell...$(NC)"
	docker compose exec frontend sh

# -----------------------------------------------------------------------------
# Clean Up
# -----------------------------------------------------------------------------
clean: ## Stop and remove containers, networks
	@echo "$(YELLOW)Cleaning up...$(NC)"
	docker compose down
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

clean-volumes: ## Stop and remove containers, networks, and volumes (⚠️  DATA LOSS)
	@echo "$(RED)⚠️  WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		echo "$(GREEN)✓ Cleanup complete (with volumes)$(NC)"; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

clean-all: ## Remove everything including images (⚠️  DATA LOSS)
	@echo "$(RED)⚠️  WARNING: This will delete all data and images!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v --rmi all; \
		echo "$(GREEN)✓ Full cleanup complete$(NC)"; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

# -----------------------------------------------------------------------------
# Testing
# -----------------------------------------------------------------------------
test: ## Run tests in containers
	@echo "$(BLUE)Running tests...$(NC)"
	docker compose exec backend pytest
	@echo "$(GREEN)✓ Tests complete$(NC)"

test-backend: ## Run backend tests
	docker compose exec backend pytest -v

test-frontend: ## Run frontend tests
	docker compose exec frontend npm test

# -----------------------------------------------------------------------------
# Maintenance
# -----------------------------------------------------------------------------
update: ## Pull latest images
	@echo "$(BLUE)Pulling latest images...$(NC)"
	docker compose pull
	@echo "$(GREEN)✓ Images updated$(NC)"

prune: ## Remove unused Docker resources
	@echo "$(YELLOW)Removing unused Docker resources...$(NC)"
	docker system prune -f
	@echo "$(GREEN)✓ Prune complete$(NC)"

stats: ## Show Docker resource usage
	@echo "$(BLUE)Docker Resource Usage:$(NC)"
	docker stats --no-stream

# -----------------------------------------------------------------------------
# Development Helpers
# -----------------------------------------------------------------------------
watch-backend: ## Watch backend logs
	docker compose logs -f --tail=100 backend

watch-frontend: ## Watch frontend logs
	docker compose logs -f --tail=100 frontend

format-backend: ## Format backend code
	docker compose exec backend black app/

lint-backend: ## Lint backend code
	docker compose exec backend flake8 app/

format-frontend: ## Format frontend code
	docker compose exec frontend npm run format

lint-frontend: ## Lint frontend code
	docker compose exec frontend npm run lint
