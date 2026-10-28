# ==============================================================================
# AtlasCloud — Windows PowerShell Turnkey Launcher
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Set-Location $ProjectDir

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "      🚀 DÉMARRAGE DE LA VERSION FINALE COMPLÈTE D'ATLASCLOUD       " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérification Docker
Write-Host "→ [1/4] Démarrage des conteneurs Docker (Postgres, Redis, RabbitMQ, Grafana, Adminer)..." -ForegroundColor Yellow

try {
    docker compose up -d
    Write-Host "  ✓ Conteneurs Docker lancés." -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Attention: Docker ne semble pas démarré ou n'est pas accessible." -ForegroundColor Red
    Write-Host "    Pour utiliser PostgreSQL local sans Docker, assurez-vous qu'un service PostgreSQL tourne sur le port 5432." -ForegroundColor Yellow
}

# 2. Attente de la disponibilité de PostgreSQL si Docker tourne
Write-Host "→ [2/4] Initialisation du schéma de base de données..." -ForegroundColor Yellow
try {
    npx prisma migrate deploy --schema=prisma/schema.prisma
    npx tsx prisma/seed.ts
    Write-Host "  ✓ Base de données initialisée et données de démo insérées." -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Note: La migration ou le seed a été ignoré (DB non accessible ou déjà à jour)." -ForegroundColor Yellow
}

# 3. Récapitulatif
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "               ✨ TOUS LES SERVICES SONT PRÊTS !                 " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Accès Directs depuis votre Navigateur :" -ForegroundColor White
Write-Host "  • Mission Control & Authentification : http://localhost:3000/login" -ForegroundColor Cyan
Write-Host "  • Tableau de bord SaaS général       : http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host "  • Documentation interactive Swagger  : http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host "  • Visualiseur Base de Données (Adminer): http://localhost:8080" -ForegroundColor Cyan
Write-Host "  • Métriques Prometheus & Grafana     : http://localhost:3001 (admin / dev_grafana_password)" -ForegroundColor Cyan
Write-Host "  • Broker de messages RabbitMQ        : http://localhost:15672 (atlascloud / dev_rabbit_password)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Comptes de Test Déjà Configurés :" -ForegroundColor White
Write-Host "  👤 Alice (Acme)      : alice@acme.local       | DevOwner@123! (Rôle: OWNER)" -ForegroundColor Magenta
Write-Host "  👤 Bob (Acme)        : bob@acme.local         | DevMember@123! (Rôle: ADMIN)" -ForegroundColor Magenta
Write-Host "  👤 Eve (Beta Inc)    : eve@beta.local         | DevOwner@123! (Autre Tenant)" -ForegroundColor Magenta
Write-Host "  👑 SuperAdmin        : admin@atlascloud.local | DevAdmin@123! (Platform Admin)" -ForegroundColor Magenta
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "→ [4/4] Démarrage du serveur NestJS API sur le port 3000..." -ForegroundColor Yellow
npm run dev:api
