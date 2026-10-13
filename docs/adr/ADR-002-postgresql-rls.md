# ADR-002: PostgreSQL Row Level Security for Tenant Isolation

**Status:** Accepted  
**Date:** 2024-10-13  
**Deciders:** Engineering team

## Context

AtlasCloud is a multi-tenant SaaS platform. Tenant data isolation is a critical security requirement. Application-layer
filtering alone is insufficient — a bug in query scoping logic could expose all tenants' data.

## Decision

Implement **defense-in-depth tenant isolation**:

### Layer 1: Application layer

- Derive the active organization from the authenticated user's membership — never from a client-provided parameter.
- Verify organization membership on every tenant-scoped request.
- Scope all Prisma queries with `organizationId` WHERE clauses.

### Layer 2: Database layer (PostgreSQL RLS)

- Enable `ROW SECURITY` on all tenant-owned tables.
- Define policies using a transaction-local variable: `SET LOCAL app.current_org_id = '<uuid>'`.
- Use a restricted application role (`atlascloud_app`) with `NOBYPASSRLS`.
- The admin role (`atlascloud_admin`) owns tables and runs migrations — it does not handle API traffic.

### RLS Policy Pattern

```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY projects_tenant_select ON projects
  FOR SELECT
  USING (organization_id = current_setting('app.current_org_id', TRUE)::uuid);

-- INSERT policy
CREATE POLICY projects_tenant_insert ON projects
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_org_id', TRUE)::uuid);
```

### Transaction Wrapper

```typescript
// Pseudo-code — implemented in TenantTransactionService
async function withTenantContext<T>(
  organizationId: string,
  fn: (tx: PrismaTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.current_org_id = ${organizationId}`;
    return fn(tx);
  });
}
```

## Rationale

**Why RLS over application-only filtering:**

- Defense-in-depth: a bug at one layer is stopped by the next.
- Cross-tenant access is impossible at the database level regardless of application bugs.
- Passes security audits with demonstrable evidence.

**Why `SET LOCAL` over `SET`:**

- `SET` persists for the connection, which is dangerous with connection pooling.
- `SET LOCAL` is transaction-scoped and automatically reverts on transaction end.
- Safe under any connection pooler that reuses connections.

## Consequences

**Positive:**

- Cross-tenant data leakage is prevented at multiple layers.
- Security tests can verify actual database policy enforcement.

**Negative:**

- All tenant-scoped queries must run within a transaction with context set.
- Prisma's `$transaction` semantics require careful handling.
- Migration operations must use the admin role, not the app role.
- RLS adds a small query overhead (measured in microseconds for indexed lookups).

## Security Test Requirements

Tests run as `atlascloud_app` (NOBYPASSRLS) and verify:

1. Organization A cannot read Organization B's data.
2. Missing tenant context returns zero rows, not all rows.
3. The app role cannot set `BYPASSRLS` or escalate privileges.
