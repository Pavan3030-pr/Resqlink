# ResQLink

**AI-powered emergency response and real-time coordination.** Citizens report emergencies, AI helps dispatchers triage, and every incident gets its own **Nexconn** group channel linking dispatchers and responders.

> Prototype for the Nexconn Build Challenge 2026. Not a replacement for official emergency services. Demo accounts and responder positions are simulated and labelled `(demo)`.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn-style components, React Router, TanStack Query, React Hook Form + Zod, Leaflet + OpenStreetMap, **@nexconn/chat** |
| Backend | Java 21, Spring Boot 3.3, Spring Security (JWT, RBAC), Spring Data JPA, Bean Validation, Flyway |
| Data | PostgreSQL + PostGIS (geography index, proximity queries) |
| AI | Gemini API (structured JSON, schema-validated) with a clearly labelled rule-based fallback |
| Chat | Nexconn Chat SDK (client) + Nexconn server API (token, group channel) + signed webhooks with single-use nonces |

## Repository layout

```
backend/    Spring Boot API (com.resqlink.core = framework-free domain logic with unit tests)
frontend/   React app
scripts/    e2e-smoke.mjs (API workflow check against a running backend)
docker-compose.yml, .env.example, .github/workflows/ci.yml
```

## Quick start (Docker)

```bash
cp .env.example .env          # fill JWT_SECRET, DEMO_PASSWORD, Nexconn + (optional) Gemini keys
docker compose up --build
# frontend http://localhost:5173   backend http://localhost:8080/actuator/health
```

`JWT_SECRET`: `openssl rand -base64 48`. The backend refuses to start without a 32+ character secret.

### Local development

```bash
# database
docker compose up -d db
# backend (needs Java 21 + Maven)
cd backend && set -a && source ../.env && set +a && mvn spring-boot:run
# frontend
cd frontend && npm ci && npm run dev      # http://localhost:5173
```

## Nexconn setup

1. Create an app in the Nexconn console. Copy the **App Key**, **App Secret** and the **Server API domain** for your data center.
2. Put them in `.env` as `NEXCONN_APP_KEY`, `NEXCONN_APP_SECRET`, `NEXCONN_API_DOMAIN` (server side only; the secret never reaches the browser).
3. In the console, point the message webhook at `https://<your-backend>/api/v1/webhooks/nexconn`. Requests are verified with `SHA-1(AppSecret + Nonce + Timestamp)`, a 5-minute window and a single-use nonce. The signature does not cover the body, so the handler never trusts the payload for privileged actions.

Integration flow: login → backend authorises → `POST /api/v1/chat/token` registers the user with Nexconn and returns a user token → React initialises `@nexconn/chat` and connects → dispatchers/assignment create `resqlink_incident_RL<number>` group channels through the server API → all messages, history, attachments and read receipts travel through Nexconn. Nothing is faked with plain WebSockets.

Server endpoints used (taken from Nexconn's public server SDK and docs; **verify with `scripts/nexconn-smoke.mjs` before the demo**): `/v4/auth/access-token/issue` and `/v4/group-channel/{create,join,leave}`; the webhook payload parser is deliberately tolerant (channel id keys `channelId|toChannelId|targetId|groupId`, sender keys `senderUserId|fromUserId|senderId`).

## Demo accounts (`SEED_DEMO_DATA=true`, password = `DEMO_PASSWORD`)

| Role | E-mail |
|---|---|
| Admin | admin@resqlink.demo |
| Dispatcher | dispatcher@resqlink.demo |
| Citizen | citizen@resqlink.demo |
| Responders | ambulance1@, ambulance2@, rescue1@, fire1@ `resqlink.demo` |

No incidents are pre-seeded. Run the road-accident story live (see below).

## Demo script (road accident)

1. Citizen: **Report emergency** → category Accident, description, photo, GPS/map pin → submit.
2. Dispatcher: incident appears under *Needs attention*; AI summary and suggested priority show (labelled AI).
3. Dispatcher: **Check for duplicates**, then **Verify incident**.
4. Dispatcher: *Recommended responders* → assign two. A Nexconn channel `resqlink_incident_RL…` is created.
5. Responders (two browser sessions): accept → chat in the incident channel → **I have arrived** (status message posted to the channel).
6. Dispatcher sees *On scene*; responder completes; dispatcher marks **Resolved**. Dashboard, history and audit log reflect it.

## Highlights

- **Command center:** priority queue with live wait timers, *next best action*, critical alerts, coverage-gap analysis, a live/reconnecting/offline indicator that never lies.
- **AI that helps and stays honest:** multilingual understanding, redaction of personal data, prompt-injection flagging, a safety floor so AI can never downplay a life-threatening report, visible fallback status, semantic duplicate detection, and a repeatable evaluation harness with measured (not claimed) results.
- **Real Nexconn, resilient:** per-incident group channels synced by a persisted retry state machine, so a chat outage never fails or corrupts an assignment.
- **Security with tests:** immediate session revocation, single-use webhook nonces, database-shared rate limits, lockout, sanitised private evidence storage, idempotent writes, hash-chained audit log.
- **Accessible, multilingual, low-bandwidth citizen flow:** English/Hindi/Telugu, photo shrinking, offline queue with idempotent retry.

## Documentation

| | |
|---|---|
| [docs/AUDIT.md](docs/AUDIT.md) | Source audit: what worked, what was wrong, what changed |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture, real-time model, chat sync |
| [docs/SECURITY.md](docs/SECURITY.md) | Controls, tests, residual risks |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Data handling, AI provider, retention |
| [docs/AI-EVALUATION.md](docs/AI-EVALUATION.md) | Method and measured results |
| [docs/TESTING.md](docs/TESTING.md) | What was executed vs what runs in CI |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Render + storage + Nexconn setup |
| [docs/DEMO.md](docs/DEMO.md) | Three-minute judge demo |

## Testing

See [docs/TESTING.md](docs/TESTING.md) for exactly what was executed and what needs Docker, a backend or credentials.

```bash
cd backend  && mvn verify                         # domain tests + Testcontainers API/security tests (Docker)
cd frontend && npm run typecheck && npm test && npm run build
cd frontend && npm run test:ui && npm run test:a11y   # real-browser flows + axe audit (mock API)
API=http://localhost:8080 DEMO_PASSWORD=... node scripts/e2e-smoke.mjs
NEXCONN_APP_KEY=... NEXCONN_APP_SECRET=... NEXCONN_API_DOMAIN=... node scripts/nexconn-smoke.mjs
```

## Known limits

- Direct-message partners are restricted in the UI/contacts API (dispatcher ↔ responder); Nexconn itself does not enforce this unless you also configure it in the console.
- Conversation summaries use messages the dispatcher's client reads from Nexconn and sends to `/ai/.../conversation-summary`; the backend does not store message content.
- Duplicate detection uses distance, time, category, text overlap and (with a Gemini key) embedding similarity; image similarity is not implemented.
- Responder ranking is a transparent scoring rule (distance, type fit, workload), not a model.
- Voice/video calls and hotspot prediction ("Could Have") are out of scope. Offline sync covers text reports; photos cannot be queued.
