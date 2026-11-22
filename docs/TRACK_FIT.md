# Track fit: Humanitarian & Social Good — accessible text chat for seniors and communities

| Track bullet | What ships | Where |
|---|---|---|
| Large-font and voice-to-text chat | Text size 100/125/150%, stronger contrast, simple mode (only SOS, check-in, chat, report). Microphone in chat, report and check-in note (en-IN, hi-IN, te-IN). Replies can be read aloud. Settings work before sign-in and persist on the device. | `frontend/src/lib/a11y.tsx`, `lib/voice.ts`, `components/AccessibilityMenu.tsx`, `components/VoiceButtons.tsx` |
| Volunteer dispatch rooms | Every incident has its own real-time Nexconn room. Dispatchers bring in verified volunteers. Citizens get one-tap quick replies ("I need help", "Please call me"). | `components/ChatPanel.tsx`, `lib/quickReplies.ts` |
| Peer-support check-ins | "I am OK" / "I need help" on a schedule (12 h to 3 days). Volunteers get a board: asked for help, missed a check-in, fine. Follow-ups are logged and audited. | `components/CheckInCard.tsx`, `pages/staff/CheckInBoard.tsx`, backend `CheckInService`, `CheckInController`, migration `V3__check_ins.sql` |

| Works offline and when the server sleeps | Public `/emergency` page (numbers 112, 108, 101, 100, 1091, 1098, 14567 and five first-aid cards) is bundled with the app. An offline banner explains what still works. A server badge says "waking up" instead of failing while the free-tier backend starts. | `pages/EmergencyHelp.tsx`, `lib/emergency.ts`, `components/ConnectionBanner.tsx`, `components/ServerStatus.tsx` |

## Privacy
Only the person's own check-ins and the volunteer/dispatcher/admin board expose name and phone. Citizens cannot read the board (403). Follow-ups are written to the audit log. Voice typing uses the browser's speech service; ResQLink stores only the text.

## Honest limits
Voice typing needs a browser with the Web Speech API (Chrome, Edge, Safari). Where it is missing the microphone is hidden and typing still works. Missed-check-in alerts are shown on the board; they do not yet send SMS.

## API
`POST /api/v1/check-ins`, `GET /api/v1/check-ins/mine`, `GET /api/v1/check-ins/board` and `POST /api/v1/check-ins/{userId}/follow-up` (board and follow-up: DISPATCHER, ADMIN, RESPONDER).
