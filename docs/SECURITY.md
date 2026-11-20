# Security

## Controls and the tests that prove them

| Control | Implementation | Test |
|---|---|---|
| Authentication | JWT (HS256, 12 h), BCrypt, constant-time login for unknown users | `ApiWorkflowTest`, `SecurityIntegrationTest` |
| Immediate revocation | `users.token_version` + `status` checked on every request; role read from the database | `suspendingAnAccount…`, `demotedAdmin…`, `logoutRevokes…` |
| Brute force | 5 failures → 15 min lock; per-IP login/register limit (shared in PostgreSQL) | `repeatedWrongPasswords…`, `loginRateLimit…` |
| Password policy | `PasswordPolicy` (10+ chars, 3 classes, not common, no name/e-mail) | `SecurityCoreTest`, integration |
| Object-level authorisation | Citizens: own incidents; responders: assigned only; foreign ids return 404; files re-check incident access | `citizenCannotReadAnother…` |
| Webhook authenticity | SHA-1(secret+nonce+timestamp), constant-time compare, 5 min window, **single-use nonce** (atomic, shared) | `SecurityCoreTest` (32-thread race), `SecurityIntegrationTest` (16-request race) |
| Upload safety | Magic-byte sniff, header dimension limits, decode + re-encode to JPEG (EXIF/GPS and appended payloads removed), 5 MB cap | `ImageSanitizerTest`, `uploadsAreValidatedAndSanitised` |
| Private evidence | Private bucket, authenticated proxy reads, random object keys, no public URL | `citizenCannotReadAnother…` |
| AI abuse and injection | Per-user limits, redaction, delimiting, injection flag, safety floor, schema validation | `AiEvalTest`, `promptInjectionIsFlagged…`, `aiEndpointsAreRateLimited…` |
| Idempotency | `Idempotency-Key` store (unique per user+scope+key) | `repeatedPostWith…` |
| Concurrency | Partial unique index on live assignments; optimistic locking on incidents | `simultaneousAssignments…` |
| Audit integrity | SHA-256 hash chain, advisory-lock writes, verify endpoint | `AuditChain` unit test, `auditChainDetectsTampering` |
| Headers | CSP, `frame-ancestors 'none'`, `nosniff`, HSTS, no-referrer, permissions policy | manual (see docs/DEPLOYMENT.md) |
| Secrets | Only in server environment variables; `.env` ignored; JWT secret required at startup | secret scan in release checklist |

## Residual risks (honest)

- Bearer token is kept in `sessionStorage` (readable by script). The CSP limits injection; an HttpOnly-cookie design would be stronger but needs CSRF handling.
- Nexconn's webhook signature does not cover the body, so the handler only updates counters and notifications and never trusts the payload for privileged actions.
- Direct-message partners are restricted by the contacts API, not by Nexconn; enforcing it in Nexconn needs console configuration.
- SSE connections are per instance; with several instances the 20 s polling fallback covers a missed hint.
- Registration reveals whether an e-mail exists (rate-limited); a generic response would need an e-mail confirmation flow.
- The rate limiter fails over to a per-instance counter if PostgreSQL is briefly unavailable.
- Tests marked "Testcontainers" run in CI; they were **not executed in the build environment**.
