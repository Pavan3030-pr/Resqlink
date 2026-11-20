# Deployment (Vercel frontend, Render backend, managed PostgreSQL, private object storage)

## 0. Prerequisites
A Nexconn app (App Key, App Secret, Server API domain), a PostgreSQL database with PostGIS, an S3-compatible private bucket
(Cloudflare R2, AWS S3, Supabase Storage S3, MinIO), optionally a Gemini API key.

## 1. Database
Render managed PostgreSQL (or Supabase/Neon). The user needs permission to run `CREATE EXTENSION postgis` (Flyway migration V1 does it).
- Use a **paid plan**: free tiers expire and have no backups. Enable automatic backups and point-in-time recovery where offered; test a restore once.
- Connection pooling: the backend uses HikariCP (default 10 connections, `DB_POOL_SIZE`). Keep `instances × pool size` below the database connection limit.
- `DATABASE_URL` may be the host's `postgres://user:pass@host/db` form (converted automatically) or a `jdbc:postgresql://…` URL. Add `?sslmode=require` if the host needs TLS.
- Schema changes are Flyway migrations (`backend/src/main/resources/db/migration`); they run on startup. Never edit an applied migration.

## 2. Object storage (evidence photos)
Create a **private** bucket (block public access). Create an access key limited to that bucket. Set `STORAGE_TYPE=s3` and the `S3_*` variables below.
Existing local uploads: set `STORAGE_MIGRATE_LOCAL=true` once (with `UPLOAD_DIR` pointing at the old files), start the backend, check the log line
"Storage migration finished", then set it back to `false`. Object keys do not change, so no database update is needed. Legacy WebP files are skipped.

## 3. Backend on Render
Use `render.yaml` (Blueprint) or create a Docker web service with `backend/Dockerfile`. Health check path: `/actuator/health/readiness`.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Render database connection string (Blueprint wires it) |
| `JWT_SECRET` | `openssl rand -base64 48` (required, 32+ chars) |
| `CORS_ALLOWED_ORIGINS` | Exact Vercel origin, e.g. `https://resqlink.vercel.app` (no trailing slash; comma-separate several) |
| `STORAGE_TYPE` | `s3` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | From your provider (`S3_REGION=auto` for R2) |
| `NEXCONN_APP_KEY`, `NEXCONN_APP_SECRET`, `NEXCONN_API_DOMAIN` | From the Nexconn console. **Secret stays here only.** |
| `GEMINI_API_KEY` | Optional. Without it the labelled fallback is used. |
| `GEMINI_SEND_IMAGES` | `true` or `false` (see `docs/PRIVACY.md`) |
| `SEED_DEMO_DATA`, `DEMO_MODE` | `true` for the judging environment, `false` otherwise |
| `DEMO_PASSWORD` | A password satisfying the policy; share it only in the submission document |
| `RATE_LIMIT_AUTH_PER_MINUTE` | Default `20` |

Run a single instance unless you accept the SSE limitation (see `docs/SECURITY.md`). Do not rely on the container's disk.

## 4. Frontend on Vercel
Project root `frontend`, framework Vite, build `npm run build`, output `dist`. `vercel.json` already sets rewrites and security headers.

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Your Render URL, e.g. `https://resqlink-api.onrender.com` (no trailing slash) |
| `VITE_DEMO_MODE` | `true` to show the demo guide and demo accounts on the login page |

Only public values go in Vercel. The Nexconn App Key reaches the browser from the backend's `/chat/token` response; the App Secret never does.

## 5. Nexconn console
Create the app, copy the three values, and configure the message webhook to `https://<render-url>/api/v1/webhooks/nexconn`.

### Nexconn verification (must be done by a person with credentials)
1. `NEXCONN_APP_KEY=… NEXCONN_APP_SECRET=… NEXCONN_API_DOMAIN=… BACKEND_URL=https://<render-url> node scripts/nexconn-smoke.mjs` – exercises token issue, group create/join/leave and the deployed webhook (valid, bad signature, replay).
2. In two browsers sign in as dispatcher and a responder, assign, and check: channel shows "Members synced", messages arrive both ways, history loads after refresh, an image and a file send, read receipts show "Read".
3. Stop the backend's access to Nexconn (wrong secret) and assign again: the assignment must succeed and the channel must show a visible retryable failure.
4. Open the browser console on the deployed site and confirm no Content-Security-Policy violations when chat connects. If the Nexconn SDK is blocked, widen `connect-src`/`script-src` in `frontend/vercel.json`.

## 6. Smoke test after deploy
`API=https://<render-url> DEMO_PASSWORD=… node scripts/e2e-smoke.mjs`, then run the demo script (`docs/DEMO.md`).

## 7. Operations
- Logs include a `req=<id>` correlation id (also returned as `X-Request-ID`). Passwords, tokens and message bodies are never logged.
- Audit log integrity: Admin → Audit logs → Verify integrity.
- Backups: provider-managed database backups; the bucket holds the photos (enable versioning if available). Back up both.
- Rotating `JWT_SECRET` signs everyone out. Rotating `NEXCONN_APP_SECRET` requires updating the console and the backend together.
