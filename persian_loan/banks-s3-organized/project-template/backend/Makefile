.PHONY: help install format lint test run docker-build docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  install      Install dependencies"
	@echo "  format       Format code with black and isort"
	@echo "  lint         Run linters (ruff, mypy)"
	@echo "  test         Run tests"
	@echo "  run          Run development server"
	@echo "  docker-build Build Docker image"
	@echo "  docker-up    Start Docker containers"
	@echo "  docker-down  Stop Docker containers"

install:
	pip install -r requirements.txt
	pre-commit install

format:
	@echo "Running isort..."
	isort app/
	@echo "Running black..."
	black app/

lint:
	@echo "Running ruff..."
	ruff check app/
	@echo "Running mypy..."
	mypy app/

test:
	pytest -v

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-build:
	docker build -t iranian-banks-backend .

docker-up:
	cd .. && docker-compose up -d

docker-down:
	cd .. && docker-compose down
