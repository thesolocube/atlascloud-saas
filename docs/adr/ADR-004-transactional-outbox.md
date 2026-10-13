# ADR-004: Transactional Outbox Pattern for Reliable Event Publication

**Status:** Accepted  
**Date:** 2024-10-13  
**Deciders:** Engineering team

## Context

When a business operation succeeds (e.g., job submitted), AtlasCloud must also publish a message to RabbitMQ to trigger
worker processing. The naive approach — write to PostgreSQL, then publish to RabbitMQ — has a **dual-write problem**:

- If the app crashes after the DB commit but before the RabbitMQ publish, the job is created but never processed.
- If the app crashes after publishing but before committing, a ghost message may reference non-existent data.

## Decision

Implement the **Transactional Outbox Pattern**:

1. In a single database transaction: persist the business record AND an `OutboxEvent` record.
2. A separate background process (the outbox publisher) polls for `PENDING` outbox events.
3. The publisher sends the event to RabbitMQ.
4. Only after broker confirmation (publisher confirm), mark the event as `PUBLISHED`.
5. On crash between publish and mark, the event is resent — **at-least-once delivery**.
6. Consumers are **idempotent** — duplicate delivery is handled safely.

### Outbox Table

```sql
outbox_events:
  id          UUID   (primary key)
  event_type  VARCHAR (e.g., "job.submitted")
  aggregate_id UUID
  aggregate_type VARCHAR
  payload     JSONB
  status      ENUM (PENDING, PUBLISHED, FAILED)
  attempts    INT
  next_attempt_at TIMESTAMPTZ
  published_at    TIMESTAMPTZ
  last_error      TEXT
  created_at      TIMESTAMPTZ
```

### Publisher Algorithm

```
LOOP every N seconds:
  BEGIN TRANSACTION
    SELECT * FROM outbox_events
    WHERE status = 'PENDING' AND next_attempt_at <= NOW()
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED  -- prevents concurrent publishers racing

  FOR EACH event:
    publish to RabbitMQ (with publisher confirm)
    if confirmed:
      UPDATE outbox_events SET status = 'PUBLISHED', published_at = NOW()
    else:
      UPDATE outbox_events SET
        attempts = attempts + 1,
        next_attempt_at = NOW() + exponential_backoff(attempts),
        last_error = '<error>'

    if attempts >= MAX_ATTEMPTS:
      UPDATE outbox_events SET status = 'FAILED'
      emit alert/metric
  COMMIT
```

## Delivery Semantics

This pattern provides **at-least-once delivery**. Workers must be idempotent.

Idempotency implementation:

- Jobs use an `idempotencyKey` unique per `(organizationId, idempotencyKey)`.
- Workers check the job's current status before processing.
- Duplicate `job.submitted` events for an already-PROCESSING job are safely discarded.

## Rationale

**Why not exactly-once:**

- Exactly-once delivery across a distributed message broker and database is impossible without distributed transactions
  (which RabbitMQ does not support).
- At-least-once + idempotent consumers provides effectively-once business outcomes.

**Why `FOR UPDATE SKIP LOCKED`:**

- Allows multiple publisher instances without message duplication.
- Non-blocking for other transactions — does not wait for locked rows.

## Consequences

**Positive:**

- No lost messages even if the application crashes.
- Observable — failed events are visible in the database.
- Recoverable — fix the bug, reset status to PENDING.

**Negative:**

- Additional database table and polling overhead.
- Slightly higher latency (polling interval) vs. direct publish.
- Requires careful index design on `(status, next_attempt_at)`.
