# Source-code audit of ResQLink (before and after the overhaul)

This audit was done by reading the code of the previous delivery (not the README or PDF). "Before" describes that code;
"After" describes this version. Items marked **not verified** could not be exercised in the build environment (no Maven Central,
Docker, Nexconn or Gemini access); they are covered by tests that run in CI or by the smoke scripts.

## 1. What genuinely worked (and was kept)

- Incident state machine (`IncidentStatus`), including "no assignment before verification" – unit-tested.
- RBAC checks, incident-level 404 for foreign incidents, responder-verification gate.
- Assignment safety: partial unique index + optimistic locking.
- Rule-based analyzer, duplicate scorer, responder ranker, webhook signature helper – unit-tested.
- React app: report form, dispatcher queue/map/detail, responder and admin screens – exercised in a real browser against a mock API.
- Frontend: offline report queue, lazy-loaded Nexconn SDK, WCAG-audited UI.

## 2. Incomplete

| Gap | After |
|---|---|
| Duplicates could only be "marked", no comparison or explanation | Side-by-side comparison with reasons, safe link (nothing deleted), linked-report counter |
| No human override of AI category | Category override recorded in history and audit |
| No incident export | Timeline + audit export (itself audited) |
| No coverage analysis | Coverage-gap analytics from fresh responder locations |
| No account suspension | Suspend/reactivate, sign out everywhere |
| Location accuracy and source not captured | Captured, shown, low-accuracy warning |
| English-only citizen UI | English / Hindi / Telugu (needs native-speaker review) |
| No guided demo | Demo mode: guide page, resettable scenario, labelled data |

## 3. Simulated or mock-only

- `frontend/dev/mock-api.mjs` is a development/test fixture only. It is not part of the production path.
- Nothing in the application fabricates Nexconn messages or AI output. If Gemini or Nexconn is unavailable the UI says so.
- **Not verified:** the Nexconn integration against a live Nexconn app, and Gemini output quality, have never been executed by the authors.
  `scripts/nexconn-smoke.mjs` and the checklist in `docs/DEPLOYMENT.md` exist to verify them.

## 4. Security findings

| # | Finding (before) | Severity | After |
|---|---|---|---|
| S1 | `/admin/**` trusted the role **claim in the JWT**; a demoted admin kept admin API access until the token expired. No revocation, no suspension. | High | Auth filter loads the user per request and compares `status` and `token_version`; role comes from the database. Role change, suspension, logout and "sign out everywhere" bump the version. Tested. |
| S2 | Webhook replay: a valid signed request could be replayed any number of times inside the 5-minute window. | High | Single-use nonce in PostgreSQL via one atomic statement; signature checked first so unauthenticated callers cannot burn nonces. Unit test (32-thread race) and integration test (16-request race). |
| S3 | Rate limiter was an in-memory map: per instance, lost on restart, bypassable by scaling out. | High | PostgreSQL fixed-window counters (atomic upsert) for login/register/webhook, per-user limits for reports and AI endpoints. |
| S4 | No brute-force protection; passwords min 8 with no rules. | Medium | 5 failures lock the account for 15 minutes (persisted in its own transaction); password policy (10+, 3 classes, no common passwords, no name/e-mail). |
| S5 | AI endpoints unthrottled (cost and abuse). | Medium | Per-user limits on every AI endpoint and the evaluation endpoint. |
| S6 | Uploaded images stored as received: EXIF GPS kept, WebP never validated, polyglot/appended payloads possible, no dimension limit. | Medium | Decode → limit dimensions from the header → re-encode to JPEG (metadata dropped); JPEG/PNG only; unit + integration tests including a decompression-bomb header. |
| S7 | Citizen text went to Gemini verbatim with exact coordinates and address hint; injection defence was one sentence. | Medium | Redaction of phone/e-mail, coordinates rounded to ~100 m, address and contact data not sent, `<report>` delimiting, injection flagging shown to the dispatcher, **safety floor** (AI can never show a keyword-detected life-threatening report below Critical), schema validation. |
| S8 | Citizens received the internal AI summary, staff names and dispatcher reasons in the incident history. | Medium | Redacted for citizens; tested. |
| S9 | Audit log was a plain mutable table. | Medium | SHA-256 hash chain with advisory-lock serialisation; admin "Verify integrity"; tamper test. |
| S10 | No CSP on frontend or API. | Low | CSP + security headers on Vercel/nginx and the API. |
| S11 | SSE/async dispatches would have failed authorisation. | Low | Async/error dispatches permitted after the first (authenticated) dispatch. |
| S12 | Rate-limit key used the proxy-supplied address with `forward-headers-strategy: framework`; a client-supplied `X-Forwarded-For` could evade the per-IP limit. | Low | Mitigated by per-account lockout and per-user limits; **residual**: configure the platform proxy to overwrite the header. |

Residual risks are listed in `docs/SECURITY.md`.

## 5. Performance and reliability

| # | Finding (before) | After |
|---|---|---|
| R1 | The Gemini call ran inside a database transaction (up to ~40 s per analysis), risking pool exhaustion. | Read, call, write in separate short transactions. |
| R2 | Nexconn calls ran **inside the assignment transaction**; a chat failure or a later rollback could leave Nexconn and the database inconsistent, with no retry. | Channel sync is a persisted state machine (PENDING/SYNCED/FAILED), runs after commit, exponential backoff retries, visible in the UI, manual retry. Assignment can no longer fail because of chat. |
| R3 | N+1 query for channels in incident lists (up to 100 queries per page). | Single batch query. |
| R4 | Local-disk evidence storage (lost on Render restarts/redeploys). | `BlobStore` abstraction: local for dev, S3-compatible private bucket for production, migration runner. |
| R5 | Render's `postgres://` URL would not work as a JDBC URL. | Automatic conversion at startup; unit-tested parser. |
| R6 | Polling-only updates. | SSE hints + slow polling fallback; "Live/Reconnecting/Offline" indicator that never claims live when the stream is down. |
| R7 | No idempotency on report or assignment creation (double-tap, offline retry). | `Idempotency-Key` on both; offline queue reuses its item id as the key. |
| R8 | Health check did not include the database. | Readiness group includes `db`; Render uses it. |
| R9 | Chat history's first page passed no `startTime` (the SDK documents passing the current time). | Fixed. **Not verified** against a live Nexconn app. |

## 6. Missing workflows added
See section 2.

## 7. Deployment risks

Ephemeral disk (fixed), DB URL format (fixed), CORS must list the exact frontend origin, SSE through proxies needs buffering off
(the API sets no buffering; most hosts are fine), CSP may need `connect-src` adjusted if the Nexconn SDK uses hosts outside `https:`/`wss:`
(unlikely; verify with the browser console), single-instance SSE (see limits).

## 8. Unnecessary or risky complexity (deliberately not built)

Voice/video, microservices, persisted embeddings, a learned ranking model, community channels, push notifications.
These are listed as future scope instead of shipping a weak version.
