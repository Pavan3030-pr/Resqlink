# Review fixes

| # | Area | Fix |
|---|------|-----|
| 1 | Offline queue | Only permanently rejected reports (400/404/413/415/422) are discarded; network errors, 401, 429 and 5xx keep the report and stop the run. Queue items are scoped to the account and reuse the original Idempotency-Key. |
| 2 | CORS | `Idempotency-Key` allowed; `X-Request-ID` and `Retry-After` exposed. |
| 3 | Export | `IncidentService.export` no longer read-only (it writes an audit row). |
| 4 | nginx | Security headers moved to an included snippet used in every `location`; CSP `connect-src` allows `http://localhost:*` for the compose setup. |
| 5 | Resolve | Staff resolving an incident returns responders to AVAILABLE. |
| 6 | Rate limit | `forward-headers-strategy: native` so the limiter sees real client IPs behind a proxy; `report-per-minute` is honoured and counted only for non-replayed requests. |
| 7 | Auth | A dropped connection no longer clears the session; only 401/403 does. |
| 8 | Live stream | Generation guard stops duplicate loops/streams; the server closes streams of suspended, re-roled or revoked users at the next heartbeat. |
| 9 | Minor | Idempotency no longer stores unreadable DONE rows; evidence image blob URLs are not leaked on unmount. |
