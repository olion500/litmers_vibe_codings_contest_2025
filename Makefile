NAME=jira-lite-mvp

.PHONY: help
help: ## Show all available commands
	@awk 'BEGIN {FS = ":.*##"; printf "\n🚀 Jira Lite MVP\n\nUsage:\n  make [command]\n\nCommands:\n"} /^[A-Za-z_-]+:.*##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## One-time setup (install deps, docker services, database)
	@echo "📦 Installing dependencies..."
	pnpm install
	@echo "🔧 Creating .env file..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "✓ Created .env"; else echo "✓ .env exists"; fi
	@echo "🐳 Starting Docker services..."
	docker compose up -d
	@sleep 3
	@echo "📊 Applying database migrations..."
	pnpm prisma db push
	@echo "✅ Setup complete! Run 'make dev' to start"

.PHONY: dev
dev: ## Start development server (http://localhost:3000)
	pnpm dev

.PHONY: build
build: ## Build for production
	pnpm build

.PHONY: start
start: ## Start Docker services
	docker compose up -d
	@echo "✓ Services started"

.PHONY: stop
stop: ## Stop Docker services
	docker compose down
	@echo "✓ Services stopped"

.PHONY: logs
logs: ## View service logs (Ctrl+C to exit)
	docker compose logs -f

.PHONY: lint
lint: ## Run code linter
	pnpm lint

.PHONY: test
test: ## Run tests
	pnpm test

.PHONY: clean
clean: ## Clean dependencies (for issues)
	rm -rf node_modules pnpm-lock.yaml
	pnpm install

.DEFAULT_GOAL := help
