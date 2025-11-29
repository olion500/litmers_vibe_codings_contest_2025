NAME=litmers-vibe

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n"} /^[A-Za-z0-9_.-]+:.*##/ { printf "  %-18s %s\n", $$1, $$2 } /^##@/ { printf "\n%s\n", substr($$0,5) } ' $(MAKEFILE_LIST)

.PHONY: start
start: ## Start local services (Postgres, Redis, MailHog)
	docker compose up -d

.PHONY: stop
stop: ## Stop all local services
	docker compose down

.PHONY: status
status: ## Show service status
	docker compose ps

.PHONY: logs
logs: ## Tail service logs
	docker compose logs -f

.PHONY: db-shell
db-shell: ## Open psql shell inside Postgres container
	docker compose exec postgres psql -U app -d jira_lite

.PHONY: dev
dev: ## Run Next.js dev server
	pnpm dev

.PHONY: lint
lint: ## Run eslint
	pnpm lint

.PHONY: test
test: ## Run vitest
	pnpm test

.PHONY: build
build: ## Build production bundle
	pnpm build

.PHONY: prisma-push
prisma-push: ## Apply Prisma schema to local DB
	pnpm prisma db push
