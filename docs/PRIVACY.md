# Data handling and privacy

| Data | Where it goes | Retention / control |
|---|---|---|
| Report text, category, coordinates, accuracy | PostgreSQL | Kept until an administrator deletes the incident (demo reset deletes all). Define a retention period before real use. |
| Evidence photo | Private object store; re-encoded, EXIF/GPS removed | Same as the incident. Never public; only authorised users via the API. |
| Contact name/phone | PostgreSQL, staff only | Not sent to any AI provider. |
| Responder location | PostgreSQL, **opt-in**; deleted when sharing stops or availability is Offline | Positions older than 15 min are ignored for recommendations and coverage. |
| Chat messages | **Nexconn only** (the backend stores channel ids and counters) | Governed by your Nexconn app settings. |
| AI provider (Gemini) | Redacted report text (phone numbers and e-mail removed, max 1500 chars), category, coordinates rounded to ~100 m, and the evidence photo when `GEMINI_SEND_IMAGES=true`. **Not sent:** names, phone numbers, address hint, user ids. | Subject to Google's terms for your API tier; check them for production use. Set `GEMINI_SEND_IMAGES=false` to keep photos out. |
| AI conversation summaries | The messages a dispatcher's browser read from Nexconn, redacted, to Gemini (or an extractive local fallback) | Not stored by ResQLink. |
| Audit log | PostgreSQL, hash-chained | Append-only by design. |

Photos can contain faces and number plates; treat the photo setting as a deliberate decision. ResQLink is a prototype: a real deployment needs a legal
basis, retention schedule, DPIA and operator agreements.
