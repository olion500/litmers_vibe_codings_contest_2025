NAME=jira-lite-mvp

##@ Getting Started
.PHONY: help
help: ## Show this help message and available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\n🚀 Jira Lite MVP - Development Commands\n\nUsage:\n  make [target]\n\n"} /^[A-Za-z0-9_.-]+:.*##/ { printf "  %-25s %s\n", $$1, $$2 } /^##@/ { printf "\n%s\n", substr($$0,5) } ' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## Complete setup (install dependencies, create .env, start services, push schema)
	@echo "📦 Installing dependencies..."
	pnpm install
	@echo "🔧 Creating .env file..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env from template (edit with your credentials)"; \
	else \
		echo "ℹ️  .env already exists"; \
	fi
	@echo "🐳 Starting Docker services..."
	docker compose up -d
	@echo "⏳ Waiting for database to be ready..."
	@sleep 3
	@echo "📊 Applying database migrations..."
	pnpm prisma db push
	@echo "✅ Setup complete! Run 'make dev' to start developing"

##@ Docker Services
.PHONY: start
start: ## Start Docker services (PostgreSQL, Redis, Mailpit)
	@echo "🐳 Starting Docker services..."
	docker compose up -d
	@echo "✓ Services starting. Run 'make status' to check"

.PHONY: stop
stop: ## Stop all Docker services
	@echo "🛑 Stopping Docker services..."
	docker compose down
	@echo "✓ Services stopped"

.PHONY: restart
restart: stop start ## Restart all Docker services
	@echo "✓ Services restarted"

.PHONY: status
status: ## Show Docker services status
	@echo "📊 Service Status:"
	docker compose ps
	@echo ""
	@echo "Available services:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis:      localhost:6379"
	@echo "  Mailpit:    http://localhost:8025"

.PHONY: logs
logs: ## View Docker services logs (live)
	docker compose logs -f

.PHONY: logs-postgres
logs-postgres: ## View PostgreSQL logs
	docker compose logs -f postgres

.PHONY: logs-redis
logs-redis: ## View Redis logs
	docker compose logs -f redis

.PHONY: logs-mailpit
logs-mailpit: ## View Mailpit logs
	docker compose logs -f mailpit

##@ Database
.PHONY: prisma-push
prisma-push: ## Apply Prisma schema changes to database
	@echo "📊 Applying database schema..."
	pnpm prisma db push
	@echo "✓ Schema updated"

.PHONY: prisma-studio
prisma-studio: ## Open Prisma Studio (visual database editor)
	@echo "🎨 Opening Prisma Studio (browser will open automatically)..."
	pnpm prisma studio

.PHONY: prisma-migrate
prisma-migrate: ## Create and apply a new migration
	@echo "📝 Creating migration..."
	pnpm prisma migrate dev

.PHONY: prisma-status
prisma-status: ## Show Prisma migration status
	@echo "📊 Migration Status:"
	pnpm prisma migrate status

.PHONY: db-shell
db-shell: ## Open PostgreSQL shell (psql) inside Docker
	@echo "💻 Opening PostgreSQL shell..."
	docker compose exec postgres psql -U app -d jira_lite

.PHONY: db-reset
db-reset: ## Reset database (WARNING: Deletes all data)
	@echo "⚠️  WARNING: This will delete all data from the database!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read dummy
	@echo "🔄 Resetting database..."
	pnpm prisma migrate reset --force
	@echo "✓ Database reset complete"

##@ Development
.PHONY: dev
dev: ## Start development server (http://localhost:3000)
	@echo "🚀 Starting dev server..."
	pnpm dev

.PHONY: dev-port
dev-port: ## Start dev server on custom port (e.g., make dev-port PORT=3001)
	@echo "🚀 Starting dev server on port $(PORT)..."
	pnpm dev -- -p $(PORT)

.PHONY: build
build: ## Build for production
	@echo "🔨 Building for production..."
	pnpm build
	@echo "✓ Build complete"

.PHONY: start-prod
start-prod: ## Start production server (requires 'make build' first)
	@echo "🚀 Starting production server..."
	pnpm start

##@ Code Quality
.PHONY: lint
lint: ## Run ESLint (checks code style)
	@echo "🔍 Running ESLint..."
	pnpm lint
	@echo "✓ Linting complete"

.PHONY: lint-fix
lint-fix: ## Fix ESLint errors automatically
	@echo "🔧 Fixing linting issues..."
	pnpm lint -- --fix
	@echo "✓ Issues fixed"

.PHONY: type-check
type-check: ## Check TypeScript types
	@echo "📋 Checking types..."
	npx tsc --noEmit
	@echo "✓ Type check complete"

.PHONY: test
test: ## Run tests (vitest)
	@echo "🧪 Running tests..."
	pnpm test
	@echo "✓ Tests complete"

.PHONY: test-watch
test-watch: ## Run tests in watch mode (auto-rerun on changes)
	@echo "👀 Running tests in watch mode..."
	pnpm test:watch

.PHONY: test-ui
test-ui: ## Run tests with UI
	@echo "🎨 Running tests with UI..."
	pnpm test -- --ui

##@ Pre-Commit Checks
.PHONY: pre-commit
pre-commit: lint type-check test ## Run all pre-commit checks (lint, types, tests)
	@echo "✅ All pre-commit checks passed!"

.PHONY: pre-push
pre-push: pre-commit build ## Run all pre-push checks (lint, types, tests, build)
	@echo "✅ All pre-push checks passed!"

##@ Dependencies
.PHONY: install
install: ## Install dependencies with pnpm
	@echo "📦 Installing dependencies..."
	pnpm install
	@echo "✓ Dependencies installed"

.PHONY: update
update: ## Update dependencies
	@echo "📦 Updating dependencies..."
	pnpm update
	@echo "✓ Dependencies updated"

.PHONY: clean
clean: ## Remove node_modules and reinstall (for dependency issues)
	@echo "🧹 Cleaning dependencies..."
	rm -rf node_modules pnpm-lock.yaml
	@echo "📦 Reinstalling dependencies..."
	pnpm install
	@echo "✓ Clean install complete"

##@ Git
.PHONY: status
status: ## Show git status
	@echo "📊 Git Status:"
	git status

.PHONY: branch
branch: ## List all branches
	@echo "🌿 Branches:"
	git branch -a

.PHONY: log
log: ## Show recent commits
	@echo "📝 Recent Commits:"
	git log --oneline -10

##@ Utilities
.PHONY: generate-secret
generate-secret: ## Generate a random NEXTAUTH_SECRET for .env
	@echo "🔐 Generating NEXTAUTH_SECRET..."
	@openssl rand -base64 32

.PHONY: check-ports
check-ports: ## Check if required ports are available
	@echo "🔍 Checking required ports..."
	@echo "Checking port 3000 (dev server)..."
	@lsof -i :3000 > /dev/null 2>&1 && echo "  ⚠️  Port 3000 is in use" || echo "  ✓ Port 3000 is available"
	@echo "Checking port 5432 (PostgreSQL)..."
	@lsof -i :5432 > /dev/null 2>&1 && echo "  ⚠️  Port 5432 is in use" || echo "  ✓ Port 5432 is available"
	@echo "Checking port 6379 (Redis)..."
	@lsof -i :6379 > /dev/null 2>&1 && echo "  ⚠️  Port 6379 is in use" || echo "  ✓ Port 6379 is available"
	@echo "Checking port 1025 (Mailpit SMTP)..."
	@lsof -i :1025 > /dev/null 2>&1 && echo "  ⚠️  Port 1025 is in use" || echo "  ✓ Port 1025 is available"
	@echo "Checking port 8025 (Mailpit UI)..."
	@lsof -i :8025 > /dev/null 2>&1 && echo "  ⚠️  Port 8025 is in use" || echo "  ✓ Port 8025 is available"

.PHONY: docker-clean
docker-clean: ## Clean up Docker resources (prune unused images, volumes, containers)
	@echo "🧹 Cleaning Docker resources..."
	docker system prune -f
	@echo "✓ Docker cleanup complete"

##@ Quick Reference
.PHONY: urls
urls: ## Show all development URLs
	@echo "📍 Development URLs:"
	@echo ""
	@echo "  🌐 Frontend:        http://localhost:3000"
	@echo "  📧 Mailpit:         http://localhost:8025"
	@echo "  🗄️  PostgreSQL:     localhost:5432"
	@echo "  💾 Redis:           localhost:6379"
	@echo "  🎨 Prisma Studio:  Run 'make prisma-studio'"
	@echo ""

.PHONY: env-template
env-template: ## Show example .env configuration
	@echo "📝 Example .env Configuration:"
	@cat .env.example

.PHONY: init
init: setup ## Alias for 'make setup' - complete project initialization
	@echo "✅ Project initialized!"

##@ Documentation
.PHONY: docs
docs: ## Open README.md in default browser
	@echo "📖 Opening README.md..."
	@if command -v open > /dev/null; then \
		open README.md; \
	elif command -v xdg-open > /dev/null; then \
		xdg-open README.md; \
	else \
		echo "Please open README.md manually"; \
	fi

.PHONY: info
info: ## Show project information
	@echo "📋 Project Information:"
	@echo ""
	@echo "  Project:     $(NAME)"
	@echo "  Framework:   Next.js 16 + React 19"
	@echo "  Database:    PostgreSQL"
	@echo "  Package Mgr: pnpm"
	@echo "  Node version: `node --version`"
	@echo "  pnpm version: `pnpm --version`"
	@echo ""
	@echo "📚 Documentation:"
	@echo "  README:     README.md"
	@echo "  OpenSpec:   openspec/"
	@echo "  Help:       make help"
	@echo ""

# Default target
.DEFAULT_GOAL := help
