# ==============================================================================
# AtlasCloud Makefile
# Usage: make <target>
# ==============================================================================

.DEFAULT_GOAL := help
.PHONY: help install dev dev-api dev-worker build lint lint-fix format format-check typecheck \
        test test-unit test-integration test-e2e test-cov \
        db-migrate db-migrate-dev db-seed db-generate db-studio db-reset \
        infra-up infra-down infra-logs infra-reset \
        clean secrets-check

SHELL := /bin/bash

# Colors
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

## ── Help ──────────────────────────────────────────────────────────────────────
help: ## Show this help message
	@echo ''
	@echo 'Usage:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} { \
		if (/^[a-zA-Z_-]+:.*?##.*$$/) {printf "    ${YELLOW}%-20s${GREEN}%s${RESET}\n", $$1, $$2} \
		else if (/^## /) {printf "  ${WHITE}%s${RESET}\n", substr($$0, 4)} \
		}' $(MAKEFILE_LIST)

## ── Setup ─────────────────────────────────────────────────────────────────────
install: ## Install all dependencies
	npm ci

secrets-check: ## Verify .env file exists (does not print values)
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found. Copy .env.example and fill in values."; \
		exit 1; \
	fi
	@echo ".env file found."

## ── Development ───────────────────────────────────────────────────────────────
start-all: ## Start entire turnkey stack (Docker infra, Prisma DB, and API)
	bash scripts/start-all.sh

dev: infra-up ## Start infrastructure and run both apps in watch mode (2 terminals needed)
	@echo "Infrastructure is up. Run 'make dev-api' and 'make dev-worker' in separate terminals."

dev-api: ## Run the API in development watch mode
	npm run dev:api

dev-worker: ## Run the Worker in development watch mode
	npm run dev:worker

## ── Build ─────────────────────────────────────────────────────────────────────
build: ## Build all workspaces
	npm run build

build-api: ## Build the API only
	npm run build:api

build-worker: ## Build the Worker only
	npm run build:worker

## ── Quality ───────────────────────────────────────────────────────────────────
lint: ## Run ESLint across all workspaces
	npm run lint

lint-fix: ## Run ESLint with auto-fix
	npm run lint:fix

format: ## Format all files with Prettier
	npm run format

format-check: ## Check formatting (CI mode)
	npm run format:check

typecheck: ## Run TypeScript type checking across all workspaces
	npm run typecheck

## ── Tests ─────────────────────────────────────────────────────────────────────
test: ## Run all tests
	npm run test

test-unit: ## Run unit tests only
	npm run test:unit

test-integration: ## Run integration tests (requires running infrastructure)
	npm run test:integration

test-e2e: ## Run end-to-end tests (requires running application + infrastructure)
	npm run test:e2e

test-cov: ## Run tests with coverage report
	npm run test:cov

## ── Database ──────────────────────────────────────────────────────────────────
db-migrate: ## Run pending migrations (production-safe)
	npm run db:migrate

db-migrate-dev: ## Create and run a new migration (development only)
	npm run db:migrate:dev

db-seed: ## Seed the database with development data
	npm run db:seed

db-generate: ## Regenerate Prisma client after schema changes
	npm run db:generate

db-studio: ## Open Prisma Studio
	npm run db:studio

db-reset: ## Reset the database and re-run all migrations (DESTRUCTIVE — dev only)
	npm run db:reset

## ── Infrastructure ────────────────────────────────────────────────────────────
infra-up: ## Start local Docker infrastructure (PostgreSQL, Redis, RabbitMQ, Prometheus, Grafana)
	docker compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 5

infra-down: ## Stop local Docker infrastructure
	docker compose down

infra-logs: ## Tail infrastructure logs
	docker compose logs -f

infra-reset: ## Destroy and recreate all infrastructure (DESTRUCTIVE)
	@echo "WARNING: This will destroy all local data volumes."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker compose down -v
	docker compose up -d

## ── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Remove build artifacts and node_modules
	find . -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name "coverage" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
