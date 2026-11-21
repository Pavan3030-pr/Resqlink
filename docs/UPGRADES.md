# Upgrade log: what was added for the Nexconn Build Challenge

Every item below is covered by an automated test that was executed, unless marked otherwise.

| Upgrade | Why it matters to a judge | Where | Tests |
|---|---|---|---|
| One-tap SOS | Real emergencies leave no time to type. GPS goes to the dispatcher in two taps; idempotency key prevents double incidents; falls back to the offline queue | `components/SosPanel.tsx`, `lib/sos.ts` | `upgrades.test.ts` (payload passes the same schema as the full form, 3 languages), browser flow |
| Safety guidance for the reporter | The citizen is not left staring at a spinner; advice is conservative and defers to 112 | `lib/safety.ts`, `components/SafetyCard.tsx` | `upgrades.test.ts` (every category x language), browser flow |
| Incident hotspots | Lets dispatchers pre-position responders. Deterministic and explainable, no black box | `lib/hotspot.ts`, `pages/staff/HotspotCard.tsx` | `upgrades.test.ts` (ranking, decay, limit, determinism), browser flow |
| Chat quick replies | Uses the Nexconn channel for the moments that matter: one-tap status while driving or treating a casualty | `lib/quickReplies.ts`, `components/ChatPanel.tsx` | `upgrades.test.ts`, a11y scan |
| Offline app shell (PWA) | Works on a poor connection; the API is never cached, so no incident data is stored by the worker | `public/sw.js`, `src/main.tsx`, `vercel.json` | Build output verified; behaviour is a progressive enhancement |
| Map page landmark fix | Removed a nested `<main>` | `pages/MapPage.tsx` | typecheck + UI flows |

## Not verified in the build environment
- The Spring Boot backend could not be compiled here (Maven Central is unreachable). **No backend source was changed**, so these upgrades cannot break it, but run `cd backend && mvn verify` once before the demo (CI does this on push).
- Real Nexconn messaging and Gemini need your keys (`.env`).
- Hindi and Telugu strings should be reviewed by native speakers.
