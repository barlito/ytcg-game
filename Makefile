COMPOSE = docker compose
RUN = $(COMPOSE) run --rm -T node
ASSETS ?= $(HOME)/YoulzAssets

.PHONY: install sh typecheck test check sim import-assets

install: ## Install every workspace dependency (inside Docker, no Node on the host)
	$(RUN) npm install

sh: ## Shell in a throwaway Node container
	$(COMPOSE) run --rm node sh

typecheck: ## Type-check tools and every workspace
	$(RUN) npm run typecheck

test: ## Run every workspace test suite
	$(RUN) npm test

check: typecheck test ## Everything CI runs

sim: ## Bot simulation report (ARGS="--games 2000 --mode universe")
	$(RUN) npm run sim -w @ytcg-game/engine -- $(ARGS)

import-assets: ## Seed data/cards from the YoulzAssets manifests (ASSETS=path, default ~/YoulzAssets)
	$(COMPOSE) run --rm -T -v $(ASSETS):/assets:ro node node tools/import-youlz-assets.ts /assets data/cards
