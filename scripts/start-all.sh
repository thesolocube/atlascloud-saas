#!/usr/bin/env bash
set -e

# ==============================================================================
# AtlasCloud — Lanceur Global Clé-en-Main
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Rediriger tous les caches temporaires (éviter ENOSPC)
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$PROJECT_DIR/.cache}"
export TMPDIR="${TMPDIR:-$PROJECT_DIR/.cache/tmp}"
export CHECKPOINT_DISABLE=1
export PRISMA_TELEMETRY_INFORMATION=false
mkdir -p "$PROJECT_DIR/.cache/tmp" "$PROJECT_DIR/.cache/npm" 2>/dev/null || true

# Couleurs pour le terminal
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}${CYAN}=================================================================${NC}"
echo -e "${BOLD}${CYAN}      🚀 DÉMARRAGE DE LA VERSION FINALE COMPLÈTE D'ATLASCLOUD       ${NC}"
echo -e "${BOLD}${CYAN}=================================================================${NC}\n"

# 1. Vérification et Démarrage de l'infrastructure Docker
echo -e "${YELLOW}→ [1/4] Démarrage des conteneurs Docker (Postgres, Redis, RabbitMQ, Grafana, Adminer)...${NC}"

# Nettoyer d'éventuels conteneurs résiduels en conflit
docker rm -f atlascloud-rabbitmq atlascloud-postgres atlascloud-redis atlascloud-grafana atlascloud-adminer atlascloud-prometheus 2>/dev/null || true

# Détecter si le port 5672 est déjà occupé par un service externe/natif
if (ss -tulpn 2>/dev/null | grep -q ":5672 " || netstat -tulpn 2>/dev/null | grep -q ":5672 " || lsof -i :5672 2>/dev/null | grep -q "5672"); then
  echo -e "  ${YELLOW}⚠️  Le port 5672 est déjà occupé par le système (RabbitMQ).${NC}"
  echo -e "  ${CYAN}→ Redirection automatique du conteneur RabbitMQ sur le port 5673.${NC}"
  export RABBITMQ_PORT=5673
  export RABBITMQ_URL="amqp://atlascloud:dev_rabbit_password@localhost:5673"
else
  export RABBITMQ_PORT=5672
fi

# Détecter si le port 15672 (UI Management) est déjà occupé
if (ss -tulpn 2>/dev/null | grep -q ":15672 " || netstat -tulpn 2>/dev/null | grep -q ":15672 " || lsof -i :15672 2>/dev/null | grep -q "15672"); then
  echo -e "  ${YELLOW}⚠️  Le port 15672 est déjà occupé par le système (RabbitMQ Management).${NC}"
  echo -e "  ${CYAN}→ Redirection automatique de l'interface RabbitMQ sur le port 15673.${NC}"
  export RABBITMQ_MANAGEMENT_PORT=15673
else
  export RABBITMQ_MANAGEMENT_PORT=15672
fi

# Détecter si le port 6379 est déjà occupé par un service externe/natif (ex: redis-server local)
if (ss -tulpn 2>/dev/null | grep -q ":6379 " || netstat -tulpn 2>/dev/null | grep -q ":6379 " || lsof -i :6379 2>/dev/null | grep -q "6379"); then
  echo -e "  ${YELLOW}⚠️  Le port 6379 est déjà occupé par le système (Redis).${NC}"
  echo -e "  ${CYAN}→ Redirection automatique du conteneur Redis sur le port 6380.${NC}"
  export REDIS_PORT=6380
else
  export REDIS_PORT=6379
fi

# Détecter si le port 5432 est déjà occupé par un service externe/natif (ex: postgresql local)
if (ss -tulpn 2>/dev/null | grep -q ":5432 " || netstat -tulpn 2>/dev/null | grep -q ":5432 " || lsof -i :5432 2>/dev/null | grep -q "5432"); then
  echo -e "  ${YELLOW}⚠️  Le port 5432 est déjà occupé par le système (PostgreSQL).${NC}"
  echo -e "  ${CYAN}→ Redirection automatique du conteneur PostgreSQL sur le port 5433.${NC}"
  export POSTGRES_PORT=5433
  export DATABASE_URL="postgresql://atlascloud_admin:dev_admin_password@localhost:5433/atlascloud?schema=public"
  export DATABASE_ADMIN_URL="postgresql://atlascloud_admin:dev_admin_password@localhost:5433/atlascloud?schema=public"
  export DATABASE_DIRECT_URL="postgresql://atlascloud_admin:dev_admin_password@localhost:5433/atlascloud?schema=public"
else
  export POSTGRES_PORT=5432
fi

# Détecter si le port 3001 est déjà occupé par un autre processus
if (ss -tulpn 2>/dev/null | grep -q ":3001 " || netstat -tulpn 2>/dev/null | grep -q ":3001 " || lsof -i :3001 2>/dev/null | grep -q "3001"); then
  echo -e "  ${YELLOW}⚠️  Le port 3001 est déjà occupé par un autre processus.${NC}"
  echo -e "  ${CYAN}→ Redirection automatique de Grafana sur le port 3005.${NC}"
  export GRAFANA_PORT=3005
else
  export GRAFANA_PORT=3001
fi

docker compose up -d

# 2. Attente de la disponibilité de PostgreSQL
echo -e "${YELLOW}→ [2/4] Vérification de la disponibilité de PostgreSQL...${NC}"
until docker exec atlascloud-postgres pg_isready -U atlascloud_admin -d atlascloud > /dev/null 2>&1; do
  echo "  En attente de PostgreSQL..."
  sleep 2
done
echo -e "  ${GREEN}✓ PostgreSQL est prêt et connecté.${NC}"

# 3. Synchronisation schéma Prisma & Seeds
echo -e "${YELLOW}→ [3/4] Vérification du schéma Prisma et des données de démo...${NC}"
npx prisma migrate deploy --schema=prisma/schema.prisma > /dev/null 2>&1 || true
npx tsx prisma/seed.ts > /dev/null 2>&1 || true
echo -e "  ${GREEN}✓ Base de données initialisée avec succès.${NC}"

# 4. Affichage du récapitulatif des accès
echo -e "\n${BOLD}${GREEN}=================================================================${NC}"
echo -e "${BOLD}${GREEN}               ✨ TOUS LES SERVICES SONT PRÊTS !                 ${NC}"
echo -e "${BOLD}${GREEN}=================================================================${NC}"
echo -e "${BOLD}Accès Directs depuis votre Navigateur :${NC}"
echo -e "  ${CYAN}• Mission Control & Authentification :${NC} ${BOLD}http://localhost:3000/login${NC}"
echo -e "  ${CYAN}• Tableau de bord SaaS général       :${NC} ${BOLD}http://localhost:3000/dashboard${NC}"
echo -e "  ${CYAN}• Documentation interactive Swagger  :${NC} ${BOLD}http://localhost:3000/api/docs${NC}"
echo -e "  ${CYAN}• Visualiseur Base de Données (Adminer):${NC} ${BOLD}http://localhost:8080${NC}"
echo -e "  ${CYAN}• Métriques Prometheus & Grafana     :${NC} ${BOLD}http://localhost:${GRAFANA_PORT:-3001}${NC} (admin / dev_grafana_password)"
echo -e "  ${CYAN}• Broker de messages RabbitMQ        :${NC} ${BOLD}http://localhost:${RABBITMQ_MANAGEMENT_PORT:-15672}${NC} (atlascloud / dev_rabbit_password)"
echo -e "\n${BOLD}Comptes de Test Déjà Configurés :${NC}"
echo -e "  👤 ${PURPLE}Alice (Acme)${NC}      : alice@acme.local       | DevOwner@123! (Rôle: OWNER)"
echo -e "  👤 ${PURPLE}Bob (Acme)${NC}        : bob@acme.local         | DevMember@123! (Rôle: ADMIN)"
echo -e "  👤 ${PURPLE}Eve (Beta Inc)${NC}    : eve@beta.local         | DevOwner@123! (Autre Tenant)"
echo -e "  👑 ${PURPLE}SuperAdmin${NC}        : admin@atlascloud.local | DevAdmin@123! (Platform Admin)"
echo -e "${BOLD}${GREEN}=================================================================${NC}\n"

# 5. Démarrage de l'API en premier plan
echo -e "${YELLOW}→ [4/4] Démarrage du serveur NestJS API sur le port 3000...${NC}"
npm run dev:api
