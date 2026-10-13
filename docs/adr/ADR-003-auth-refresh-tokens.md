# ADR-003: Authentication and Refresh Token Strategy

**Status:** Accepted  
**Date:** 2024-10-13  
**Deciders:** Engineering team

## Context

AtlasCloud requires secure authentication that:

1. Issues short-lived tokens to minimize the impact of token theft.
2. Provides a seamless user experience without frequent re-authentication.
3. Allows server-side session revocation (e.g., on logout or account compromise).
4. Detects refresh token reuse (theft detection).

## Decision

### Password Hashing: Argon2id

Argon2id is the 2015 Password Hashing Competition winner, recommended by OWASP.  
Parameters: `memoryCost: 65536` (64 MB), `timeCost: 3`, `parallelism: 4`.

### Token Architecture

```
Access Token (JWT, HS256/RS256)
├── Expires: 15 minutes
├── Contains: userId, organizationId (membership derived at request time)
├── NOT stored in database
└── Verified by: JwtAccessStrategy

Refresh Token (opaque, 256-bit random)
├── Expires: 7 days
├── Stored in database as: SHA-256(token)
├── Associated with: userId, familyId (for reuse detection)
└── Returned to client as: HttpOnly cookie (preferred) or response body
```

### Refresh Token Lifecycle

```
Login → Generate refresh token RT1
      → Store hash(RT1) in refresh_sessions (familyId = F1)

Refresh (present RT1) →
  ├── Look up hash(RT1) → Found, not revoked → OK
  ├── Mark RT1 as revoked
  ├── Generate new RT2
  ├── Store hash(RT2), familyId = F1
  └── Return AT2, RT2

Reuse detection (present RT1 again after rotation) →
  ├── Look up hash(RT1) → Found, IS revoked → THEFT DETECTED
  ├── Revoke ALL sessions with familyId = F1
  └── Return 401, force re-login
```

### Database Storage

```sql
-- refresh_sessions table
-- token_hash: SHA-256 hex of the raw token (NOT the raw token)
-- family_id: UUID grouping rotated tokens for reuse detection
-- is_revoked: set when the token is used or explicitly revoked
```

## Rationale

**Why short-lived access tokens:**

- A stolen access token expires in 15 minutes.
- Role changes take effect at the next access token refresh.

**Why store refresh token hash, not plaintext:**

- A database breach does not expose usable tokens.
- SHA-256 is sufficient here because tokens are high-entropy (256-bit random).
- Argon2id would be better but adds latency — tokens are already high-entropy.

**Why family-based reuse detection:**

- If a refresh token is stolen and used, the attacker will rotate it.
- The legitimate user's next refresh presents the now-revoked original.
- Revoking the entire family logs both parties out.
- This is a heuristic, not a guarantee — an attacker who refreshes first wins.

## Consequences

**Positive:**

- Demonstrated understanding of token security.
- Server-side revocation is possible.
- Theft detection mechanism.

**Negative:**

- Refresh requests require a database lookup.
- Family revocation is a blunt instrument (logs out all devices).
- Without HttpOnly cookies, XSS can steal refresh tokens.

## Limitations (Initial Release)

- Email verification: NOT implemented (documented in API docs).
- Password reset: NOT implemented (documented in API docs).
- Multi-factor authentication: NOT implemented.
- These are planned for future milestones.
