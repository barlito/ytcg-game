COMPOSE = docker compose
RUN = $(COMPOSE) run --rm -T node
ASSETS ?= $(HOME)/YoulzAssets
# Optional ytcg production dump ({slug: {cards: [{id, imageName}]}}) to fill the card artwork.
PROD_CARDS ?=

# Target names follow the other Youls projects (barlito/php-make-rules): deploy/undeploy, bash, check_style/fix_style, quality.
.PHONY: help npm.install bash deploy undeploy logs typecheck check_style fix_style test quality sim import-assets cards-doc

help: ## List the targets
	@grep -E '^[a-zA-Z_.-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

npm.install: ## Install every workspace dependency (inside Docker, no Node on the host)
	$(RUN) npm install

bash: ## Shell in a throwaway Node container
	$(COMPOSE) run --rm node sh

deploy: npm.install ## Start the local game server (:2567) and client (http://localhost:5173)
	$(COMPOSE) --profile dev up -d server client

undeploy: ## Stop the local game server and client
	$(COMPOSE) --profile dev down

logs: ## Follow the local server and client logs
	$(COMPOSE) --profile dev logs -f server client

typecheck: ## Type-check tools and every workspace
	$(RUN) npm run typecheck

check_style: ## ESLint (type-aware, strict) + Prettier check
	$(RUN) npm run lint

fix_style: ## Prettier + ESLint autofix
	$(RUN) npm run fix

test: ## Run every workspace test suite
	$(RUN) npm test

quality: typecheck check_style test ## Everything CI runs

sim: ## Bot simulation report (ARGS="--games 2000 --mode universe")
	$(RUN) npm run sim -w @ytcg-game/engine -- $(ARGS)

import-assets: ## Seed data/cards from the YoulzAssets manifests (ASSETS=path, PROD_CARDS=ytcg dump for the artwork)
	$(COMPOSE) run --rm -T -v $(ASSETS):/assets:ro $(if $(PROD_CARDS),-v $(PROD_CARDS):/prod-cards.json:ro) node \
		node tools/import-youlz-assets.ts /assets data/cards $(if $(PROD_CARDS),/prod-cards.json)

cards-doc: ## Regenerate docs/cards.md (every card and location with its effect text)
	$(RUN) npm run cards-doc -w @ytcg-game/engine
