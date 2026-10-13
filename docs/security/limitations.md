# Security Limitations

**Status:** Current as of Milestone 1  
**Updated:** 2024-10-13

This document is part of AtlasCloud's commitment to honest security documentation. We describe what IS implemented and
what is NOT, rather than claiming completeness.

## ✅ Implemented Security Controls

### Authentication

- Argon2id password hashing (Milestone 2+)
- Short-lived JWT access tokens (15 minutes)
- Refresh token rotation with reuse detection
- SHA-256 refresh token hash storage (never plaintext)
- Rate limiting on authentication endpoints
- HTTP-only cookie option for refresh tokens

### Authorization

- JWT authentication guard on all endpoints by default
- Role-based access control (OWNER, ADMIN, MEMBER, VIEWER)
- Platform administrator separation from organization roles
- Organization membership verification on every tenant-scoped request

### API Security

- Input validation with class-validator (whitelist mode — strips unknown fields)
- Request body size limits
- Security headers via Helmet (CSP, HSTS, X-Frame-Options, etc.)
- CORS configured explicitly (allowlist-only)
- No stack traces in production error responses
- Structured logging with sensitive field redaction

### Multi-Tenancy

- Application-layer organization ID derivation from authenticated identity
- PostgreSQL Row Level Security (Milestone 3+)
- Restricted database role (NOBYPASSRLS) for API traffic
- Cross-tenant security test suite (Milestone 3+)

### Infrastructure

- Secrets via environment variables (no hardcoded credentials)
- Separate database roles for migrations vs. API traffic
- Docker containers run as non-root where applicable

## ❌ Not Yet Implemented

### Authentication Gaps

- **Email verification:** Users can register with any email address. Email verification is not implemented in the
  initial release. All registered users are immediately active.
- **Password reset:** No password reset workflow. Forgotten passwords require manual database intervention by a platform
  administrator.
- **Multi-factor authentication (MFA/TOTP/WebAuthn):** Not implemented.
- **Account lockout:** Temporary lockout after repeated failed login attempts is not implemented (rate limiting is, but
  per-IP not per-account).
- **Session listing:** Users cannot view or revoke individual active sessions.
- **IP-based anomaly detection:** Not implemented.

### Authorization Gaps

- **Attribute-based access control (ABAC):** Not implemented. Only role-based.
- **Fine-grained field-level authorization:** All authorized users of a role see all fields.
- **API key authentication:** Not implemented. Only JWT bearer tokens.

### Transport Security

- **TLS termination:** Handled by a reverse proxy (nginx, cloud load balancer) in production. The application itself
  does not handle TLS directly.
- **Certificate management:** Not provided.

### Secrets Management

- **Secret rotation:** Manual process. No automated rotation.
- **Secret manager integration:** (HashiCorp Vault, AWS Secrets Manager) — not integrated. Environment variables are
  used.

### Dependency and Supply Chain

- **Dependency pinning:** Ranges used (`^`). Full lockfile is committed.
- **Software Bill of Materials (SBOM):** Not generated.
- **Container image signing:** Not implemented.

### Monitoring and Detection

- **Security event alerting:** Metrics and audit logs are available but no alerting rules are configured.
- **Intrusion detection:** Not implemented.
- **Log aggregation to SIEM:** Not implemented (logs are structured JSON, compatible with ELK/Splunk).

## Residual Risks

| Risk                        | Severity | Mitigation                              | Status    |
| --------------------------- | -------- | --------------------------------------- | --------- |
| Refresh token theft via XSS | High     | HttpOnly cookies (optional)             | Partial   |
| Brute-force login           | Medium   | Rate limiting (per-IP)                  | Partial   |
| Password in transit         | Medium   | TLS required at proxy                   | Delegated |
| Dependency vulnerabilities  | Medium   | `npm audit` in CI                       | Ongoing   |
| Missing email verification  | Medium   | Documented limitation                   | Accepted  |
| DB credential compromise    | Critical | Least-privilege roles + secrets manager | Partial   |

## Responsible Disclosure

This is a portfolio project. For genuine security research, open an issue on GitHub.
