COMPOSE = docker compose
RUN = $(COMPOSE) run --rm node

.PHONY: install sh

install: ## Install every workspace dependency (inside Docker, no Node on the host)
	$(RUN) npm install

sh: ## Shell in a throwaway Node container
	$(RUN) sh
