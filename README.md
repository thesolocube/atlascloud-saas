# AtlasCloud

> A cloud-native, multi-tenant SaaS platform demonstrating professional backend engineering, secure data isolation,
> asynchronous processing, distributed system reliability, automated testing, observability, and infrastructure
> automation.

[![CI](https://github.com/your-username/atlascloud/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/atlascloud/actions/workflows/ci.yml)

---

## Overview

AtlasCloud is a portfolio-quality backend engineering project built to demonstrate production-grade skills for Backend
Engineer, Software Engineer, and Distributed Systems Engineer roles.

**This is not a tutorial application.** It addresses real enterprise concerns: multi-tenant data isolation using
PostgreSQL Row Level Security, JWT refresh token rotation with reuse detection, asynchronous job processing with a
transactional outbox, structured observability, and defense-in-depth security.

## Features

| Area                          | Implemented | Milestone |
| ----------------------------- | ----------- | --------- |
| Monorepo (npm workspaces)     | ✅          | M1        |
| NestJS API application        | ✅          | M1        |
| Background worker process     | ✅          | M1        |
| Structured logging (Pino)     | ✅          | M1        |
| Health endpoints (live/ready) | ✅          | M1        |
| Prometheus metrics            | ✅          | M1        |
| Docker Compose infrastructure | ✅          | M1        |
| GitHub Actions CI             | ✅          | M1        |
| Prisma schema + domain model  | ✅          | M1        |
| User authentication (JWT)     | ✅          | M2        |
| Refresh token rotation        | ✅          | M2        |
| Organization management       | ✅          | M2        |
| Role-based authorization      | ✅          | M2        |
| PostgreSQL Row Level Security | ✅          | M3        |
| Cross-tenant security tests   | ✅          | M3        |
| Project management API        | ✅          | M4        |
| Audit logging                 | ✅          | M4        |
| RabbitMQ job processing       | ✅          | M5        |
| Transactional outbox          | ✅          | M5        |
| Redis caching                 | ✅          | M6        |
| Grafana dashboards            | ✅          | M7        |
| Load tests (k6)               | ✅          | M7        |
| Kubernetes manifests          | ✅          | M9        |
| Terraform modules             | ✅          | M10       |

**Legend:** ✅ Implemented and verified | 🔄 Planned | ❌ Not planned

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client / CLI                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AtlasCloud API (NestJS)                       │
│  Auth · Orgs · Projects · Jobs · Audit · Health · Metrics       │
│  Port 3000                                                       │
└──────────┬──────────────┬──────────────┬───────────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────┐
    │PostgreSQL│   │  Redis   │   │  RabbitMQ    │
    │(Primary  │   │(Cache &  │   │(Job Queue)   │
    │ store)   │   │ Rate lmt)│   │              │
    └──────────┘   └──────────┘   └──────┬───────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │  AtlasCloud Worker   │
                              │  (NestJS, Port 3002) │
                              └──────────────────────┘
```

## Technology Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 10 (modular monolith)
- **Language:** TypeScript 5.4 (strict mode)
- **Database:** PostgreSQL 16 with Row Level Security
- **ORM:** Prisma 5 with versioned migrations
- **Queue:** RabbitMQ 3.13 (AMQP)
- **Cache:** Redis 7.4
- **Auth:** JWT (RS256 / HS256) + Argon2id password hashing
- **Logging:** Pino (structured JSON)
- **Metrics:** Prometheus + Grafana
- **Testing:** Jest + Supertest
- **CI:** GitHub Actions
- **Infrastructure:** Docker Compose (development), Kubernetes (Milestone 9)

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for local infrastructure)
- Git

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/atlascloud.git
cd atlascloud
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — change all CHANGE_ME values
```

**Required variables to set:**

- `JWT_ACCESS_SECRET` — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `JWT_REFRESH_SECRET` — generate separately
- All database passwords

### 3. Install dependencies

```bash
npm install
```

### 4. Start infrastructure

```bash
docker compose up -d
# Wait for all services to be healthy (~30 seconds)
docker compose ps
```

### 5. Run database migrations

```bash
npm run db:migrate:dev
# Then apply grants for the restricted app role:
npm run db:seed  # (after Milestone 2 — seeds demo data)
```

### 6. Start the API

```bash
npm run dev:api
# API: http://localhost:3000/api/v1
# Swagger: http://localhost:3000/api/docs
```

### 7. Start the worker (separate terminal)

```bash
npm run dev:worker
```

## Services & Ports

| Service       | URL                               | Notes                      |
| ------------- | --------------------------------- | -------------------------- |
| Web Dashboard | http://localhost:3000/dashboard   | Mission Control & Suite GUI|
| API           | http://localhost:3000             | Main application           |
| API Swagger   | http://localhost:3000/api/docs    | Dev only                   |
| Worker health | http://localhost:3002/health/live | Worker liveness (port 3002)|
| PostgreSQL    | localhost:5432                    | DB: atlascloud             |
| Redis         | localhost:6379                    |                            |
| RabbitMQ AMQP | localhost:5672                    |                            |
| RabbitMQ UI   | http://localhost:15672            | admin/dev_rabbit_password  |
| Adminer DB    | http://localhost:8080             | Visual Database Manager    |
| Prometheus    | http://localhost:9090             |                            |
| Grafana       | http://localhost:3001             | admin/dev_grafana_password |

## Development Commands

```bash
# Quality gates (run before committing)
npm run format       # Format all files
npm run lint         # Lint all workspaces
npm run typecheck    # Type check all workspaces

# Tests
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests (needs running infra)
npm run test:e2e          # End-to-end tests

# Database
npm run db:migrate:dev    # Create and apply a new migration
npm run db:generate       # Regenerate Prisma client
npm run db:studio         # Open Prisma Studio
npm run db:seed           # Seed development data

# Infrastructure
docker compose up -d      # Start all services
docker compose down       # Stop all services
docker compose logs -f    # Follow logs
```

## Security Architecture

### Tenant Isolation

- **Application layer:** Every request derives the active organization from the authenticated user's membership.
  Client-provided organization IDs are never trusted without membership verification.
- **Database layer:** PostgreSQL Row Level Security (RLS) enforces tenant boundaries at the database level using a
  restricted application role (`atlascloud_app`) that cannot bypass RLS.

### Authentication

- Argon2id password hashing
- Short-lived JWTs (15 minutes)
- Refresh token rotation with reuse detection (token theft detection)
- Token hashes stored in database — never plaintext tokens
- Rate limiting on auth endpoints

### Security Limitations

See [docs/security/limitations.md](docs/security/limitations.md).

## API Documentation

Interactive Swagger UI available at http://localhost:3000/api/docs (development only).

See [docs/api/](docs/api/) for static API documentation.

## Testing Strategy

| Layer              | Tool                   | Status |
| ------------------ | ---------------------- | ------ |
| Unit tests         | Jest                   | M2+    |
| Integration tests  | Jest + real containers | M2+    |
| E2E tests          | Supertest              | M4+    |
| RLS security tests | Jest + restricted role | M3+    |
| Load tests         | k6                     | M7+    |

## Roadmap

- [x] Milestone 1 — Foundation (this release)
- [ ] Milestone 2 — Authentication & Organizations
- [ ] Milestone 3 — PostgreSQL Row Level Security
- [ ] Milestone 4 — Projects & Audit
- [ ] Milestone 5 — Asynchronous Jobs
- [ ] Milestone 6 — Redis & Resilience
- [ ] Milestone 7 — Observability & Performance
- [ ] Milestone 8 — CI/CD & Containers
- [ ] Milestone 9 — Kubernetes
- [ ] Milestone 10 — Terraform
- [ ] Milestone 11 — Portfolio Release

## License

MIT © 2024 AtlasCloud Contributors
