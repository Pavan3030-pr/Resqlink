# Verification runbook

What has been verified, by whom, and how to verify the rest in about 20 minutes. Fill the "Result" column as you go.

| # | Claim | How to verify | Needs | Result |
|---|---|---|---|---|
| 1 | Backend compiles and the Testcontainers suites pass (ApiWorkflowTest, SecurityIntegrationTest) | Open the GitHub Actions run for the latest commit: job **backend** runs `mvn verify` on a runner with Docker. Locally: `mvn -f backend/pom.xml verify` with Docker running | GitHub / Docker | |
| 2 | Frontend typecheck, 61 unit tests, build | Actions job **frontend**, or `cd frontend && npm ci && npm run typecheck && npm test && npm run build` | none | Passed in the build environment |
| 3 | Browser flows and accessibility audit (axe, 0 violations) | `npm run test:ui && npm run test:a11y` | Chrome | Passed in the build environment |
| 4 | Nexconn server side: token, user, group create/join, webhook signature, replay | `NEXCONN_APP_KEY=… NEXCONN_APP_SECRET=… NEXCONN_API_DOMAIN=… BACKEND_URL=https://resqlink-8ig4.onrender.com node scripts/nexconn-smoke.mjs` | Nexconn keys | |
| 5 | Nexconn in the browser: connect, send, history | Sign in as dispatcher and responder in two browsers, assign an incident, open its channel, send messages both ways | Nexconn keys set on Render | |
| 6 | Gemini analysis path and fallback | Set `GEMINI_API_KEY` on Render, submit a report, open it as dispatcher: the AI card must say "AI-generated". Remove the key: it must say "Rule-based fallback" | Gemini key | |
| 7 | Full public flow on the live backend | `API=https://resqlink-8ig4.onrender.com DEMO_PASSWORD=… node scripts/e2e-smoke.mjs` | Demo password | |
| 8 | Voice typing in production | Chrome on the live site: open Daily check-in, Add a note, tap the microphone and speak. The `Permissions-Policy` header must contain `microphone=(self)` | Chrome | |
| 9 | CORS only allows the production site | `curl -s -D- -o /dev/null -X OPTIONS https://resqlink-8ig4.onrender.com/api/v1/auth/login -H 'Origin: https://resqlink-five.vercel.app' -H 'Access-Control-Request-Method: POST'` must return `access-control-allow-origin: https://resqlink-five.vercel.app`; the same with `Origin: https://evil.example` must be 403 | none | |

## Sandbox vs live demo
- **Sandbox demo** (sign-in page, no password): the app runs against an in-browser model of the API. Simulated data, resets on reload. It cannot exercise Nexconn chat or Gemini, and it says so on screen.
- **Live demo accounts**: backend `SEED_DEMO_DATA=true` and `DEMO_PASSWORD` set on Render. Optionally set `VITE_DEMO_PASSWORD` on Vercel so the role buttons log in with one tap (the value is public; use a throwaway password).

## Known residual risks (unchanged by design)
Registration reveals whether an e-mail exists (rate-limited). The bearer token lives in sessionStorage (strict CSP mitigates; an HttpOnly cookie design is the longer-term fix). Nexconn's webhook signature does not cover the body, so the handler never trusts payload content for privileged actions. Live updates are single-instance (polling fallback). Photos cannot be queued offline. Hindi and Telugu strings need native-speaker review.
