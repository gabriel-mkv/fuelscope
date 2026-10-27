.DEFAULT_GOAL := help

.PHONY: help test verify build backend-test backend-build \
        frontend-test frontend-build frontend-dev update-data

# ┌──────────────────────────────────────────────────────────────┐
# │  F U E L S C O P E                                          │
# │  Fuel prices monitoring and analysis                         │
# │                                                              │
# │  Development commands                                        │
# └──────────────────────────────────────────────────────────────┘

help: ## Exibe os comandos disponíveis
	@printf '\n'
	@printf '  ______          _  _____                     \n'
	@printf ' |  ____|        | |/ ____|                    \n'
	@printf ' | |__ _   _  ___| | (___   ___ ___  _ __   ___ \n'
	@printf ' |  __| | | |/ _ \` |\\___ \\ / __/ _ \\|  _ \\ / _ \\\n'
	@printf ' | |  | |_| | (_| |____) | (_| (_) | |_) |  __/\n'
	@printf ' |_|   \\__,_|\\__,_|_____/ \\___\\___/| .__/ \\___|\n'
	@printf '                                    | |          \n'
	@printf '                                    |_|          \n'
	@printf '\n'
	@printf '  FuelScope - Development Commands\n\n'
	@printf '  Geral\n'
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## Geral/ {printf "    make %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\n  Backend\n'
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## Backend/ {printf "    make %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\n  Frontend\n'
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## Frontend/ {printf "    make %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\n  Dados\n'
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## Dados/ {printf "    make %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\n'

# Geral
test: backend-test frontend-test ## Geral - Executa os testes do projeto

verify: test frontend-build ## Geral - Valida testes e build do frontend

build: backend-build frontend-build ## Geral - Compila backend e frontend

# Backend
backend-test: ## Backend - Executa os testes e verificações Maven
	./mvnw verify -B

backend-build: ## Backend - Empacota a aplicação Java
	./mvnw package -B

# Frontend
frontend-test: ## Frontend - Executa os testes com Vitest
	cd web && npm test

frontend-build: ## Frontend - Compila o site estático
	cd web && npm run build

frontend-dev: frontend-build ## Frontend - Compila e inicia o servidor local
	cd web && npm run serve

# Dados
update-data: backend-build ## Dados - Atualiza os preços da ANP
	java -jar target/quarkus-app/quarkus-run.jar
