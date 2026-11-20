# Testing

**Everything listed as "executed" was actually run in the build environment. Everything listed as "runs in CI" was written but could not be executed there.**

| Layer | Command | Status |
|---|---|---|
| Domain unit tests (state machine, scorer incl. semantic, analysis validation, ranker, webhook verifier incl. 32-thread replay race, password policy, audit chain, DB URL parser, prompt safety, coverage, image sanitizer incl. bomb header, AI evaluation sets) | `cd backend && mvn test` | **48 tests executed, all passing** (run with a local JUnit shim because Maven Central was unreachable; the same test files run under Maven in CI) |
| Backend compile with Spring | `cd backend && mvn verify` | **Not executed here.** Only syntax and cross-class references were checked. First CI run is the real compile. |
| API workflow + security + concurrency (Testcontainers/PostGIS): report → AI fallback → verify → assign (chat FAILED visible) → resolve; webhook replay (sequential and concurrent), suspension/demotion/logout revocation, lockout, password policy, IDOR on incidents and files, upload sanitising, idempotency, concurrent assignment, injection flag + safety floor, AI rate limits, audit tamper detection, DB-shared rate limiting | `cd backend && mvn verify` (Docker required) | **Written, not executed here.** `ApiWorkflowTest` and `SecurityIntegrationTest` run in CI. |
| Frontend unit/component (formatting, clustering, triage/SLA, offline queue + idempotency key, SSE parser, live hints, form schemas, badges) | `cd frontend && npm test` | **32 tests executed, all passing** |
| Types and build | `npm run typecheck && npm run build` | **Executed, passing** |
| Real-browser flows against the mock API (Chrome): live stream connects, command center, coverage card, duplicate compare, AI fallback and injection warnings, failed chat sync visible, location accuracy warning, citizen offline queue, Hindi switch, responder and admin pages, route guards, mobile overflow | `npm run test:ui` | **Executed, all checks passing** |
| Accessibility (axe-core WCAG A/AA + best practices) on 20 role/page combinations | `npm run test:a11y` | **Executed, 0 violations** |
| Live API smoke (road accident workflow + security checks) | `node scripts/e2e-smoke.mjs` | Needs a running backend. Not executed here. |
| Real Nexconn integration | `node scripts/nexconn-smoke.mjs` + manual checklist in `docs/DEPLOYMENT.md` | **Needs Nexconn credentials. Not executed.** |
| Gemini quality / latency / cost | Admin → AI evaluation | **Needs a Gemini key. Not executed.** |

`frontend/dev/mock-api.mjs` is a stateful mock of the REST API for frontend work and browser tests. It does not talk to Nexconn.

## Negative cases covered
Invalid input, unauthorised and unverified users, duplicate/simultaneous assignment, Gemini unavailable (fallback labelled), Nexconn unavailable (assignment succeeds, sync FAILED visible), expired/revoked tokens, webhook replay, malicious uploads, network loss (offline queue, idempotent retry).
Not covered automatically: database interruption (the rate limiter's fallback is by design, not tested), mobile network loss beyond the simulated request abort.
