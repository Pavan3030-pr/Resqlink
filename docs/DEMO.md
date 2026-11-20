# Three-minute judge demo

Set up once: `DEMO_MODE=true`, `SEED_DEMO_DATA=true`, Nexconn credentials configured, Admin → System activity → **Reset demo** (creates one earlier report of the accident through the real pipeline, labelled "Demo data"). Open four browser profiles: Citizen, Dispatcher, Responder 1 (`ambulance1@…`), Responder 2 (`rescue1@…`). Password: see the submission document.

| Time | Who | Action | What the judge sees |
|---|---|---|---|
| 0:00 | Citizen | Report a road accident: photo, map location, description **in Telugu or Hindi** | Offline-safe form, GPS accuracy, language switch |
| 0:25 | Dispatcher | Command center | New incident with wait timer, critical banner; the tab title shows the count |
| 0:35 | Dispatcher | Open it | Exact location and accuracy, English AI summary + suggested priority labelled as AI (or the visible "AI unavailable" fallback notice) |
| 0:55 | Dispatcher | Check duplicates → Compare | The earlier report flagged with reasons; link or continue |
| 1:15 | Dispatcher | Verify, then review recommended responders | Distance, type fit and workload explained; assign two |
| 1:35 | System | Channel sync | "Syncing members…" → "Members synced" (or a visible retry on failure) |
| 1:45 | Responders | Accept, then chat in the incident channel | Real Nexconn messages both ways, photo share |
| 2:15 | Responder 1 | "I have arrived" | Status message in the channel; dispatcher sees On scene instantly (live badge) |
| 2:30 | Responder/Dispatcher | Complete, resolve with a reason | Lifecycle, history, citizen banner updates (try Hindi) |
| 2:45 | Admin | Audit logs → Verify integrity; System activity | Chain intact; metrics computed from the events just recorded |

Any judge can create their own incident instead of using the script. If something is down, the screen says so and the demo continues: AI falls back (labelled), chat sync retries (visible), assignment never fails because of chat.
