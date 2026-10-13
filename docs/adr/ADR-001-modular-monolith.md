# ADR-001: Modular Monolith Architecture

**Status:** Accepted  
**Date:** 2024-10-13  
**Deciders:** Engineering team

## Context

AtlasCloud requires a backend architecture that:

1. Is deployable as a portfolio project without cloud infrastructure costs.
2. Demonstrates understanding of distributed systems concepts.
3. Is maintainable by a small team.
4. Can be decomposed into microservices later if justified.

## Decision

Start with a **modular NestJS monolith** with a **separate worker process**:

- `apps/api` — The HTTP API application.
- `apps/worker` — The background job consumer.

Both share the same codebase and Prisma schema but run as separate OS processes.

## Rationale

**Against microservices from day one:**

- Premature decomposition increases operational complexity without proportional benefit at this scale.
- Service boundaries that cross domain lines create distributed consistency problems.
- A monolith with clear module boundaries is easier to refactor into services than the reverse.
- NestJS's module system enforces encapsulation without network hops.

**For a separate worker process:**

- Isolates CPU-intensive work from request handling.
- Allows independent scaling of job processing.
- Demonstrates understanding of asynchronous processing.
- Provides graceful shutdown semantics for in-flight jobs.

## Consequences

**Positive:**

- Single deployment unit (easier CI/CD initially).
- Shared type definitions and domain models.
- No distributed transaction complexity between modules.
- Lower operational overhead.

**Negative:**

- A single API pod failure affects all features.
- Scaling requires scaling the entire API process.
- Module boundaries can erode without discipline.

## Future Migration Path

When a module becomes a scaling bottleneck or has genuinely independent deployment requirements, extract it using the
strangler fig pattern:

1. Define a stable interface contract.
2. Introduce a service adapter behind the interface.
3. Deploy the extracted service.
4. Route traffic through the adapter.
5. Remove the in-process implementation.
