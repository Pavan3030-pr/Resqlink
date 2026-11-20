# ResQLink UI/UX elevation: decisions and notes

Scope: frontend only. No change to backend contracts, the security model, the incident state machine, the offline queue,
deployment, video, or AI/Nexconn keys. New dependencies: **none** (so `package-lock.json` is untouched and `npm ci` still works).

## The idea: two encodings that carry meaning

1. **Provenance colour.** Violet means *the model suggested this*; blue/ink means *a person decided this*. Every AI element
   (badge, analysis panel, duplicate-match explanation, conversation summary) is violet-tinted and labelled advisory; the
   dispatcher's own decision sits beside it in neutral ink with one-tap override ("Use AI suggestion", or just change the select).
   Confidence is still deliberately **not shown** (the model number is not calibrated); we show the basis instead
   (key information, what to ask the reporter, model/fallback status, redaction note).
2. **Priority = colour + shape.** Four signal-strength bars (4 to 1) accompany the colour, so urgency survives colour-blindness and
   glare. Critical is the only *solid* chip in the system, so one glance finds it; everything else is tinted and quiet.

## Design tokens (tailwind.config.js, index.css)

| Token | Value | Use |
|---|---|---|
| canvas / panel | `#E9EDF3` / `#FFFFFF` | flat canvas, white panels; depth comes from elevation, not tints |
| rail | `#0E1828` | dark operations rail: the console reads as operational, not generic SaaS |
| primary | `#1E4FD6` | human-decided actions, selection |
| advisory | `#5B3FB8` | machine-suggested content |
| critical / high / medium / low | `#B42318`/`#B54708`/`#7A4A06`/`#15693A` (text) and `#D92D20`/`#E8590C`/`#C27C05`/`#1B9A52` (fills, markers) | |
| Elevation | `card` < `raised` < `hero` < `overlay` | hero is used at most once or twice per screen (queue, command bar) |
| Radius | 8 px controls, 10 px panels | |
| Type | IBM Plex Sans (UI), IBM Plex Sans Condensed (`.num`: counts, timers, incident numbers), Noto Devanagari/Telugu fallbacks | tabular, heavier figures scan first |

Contrast was computed for every text/background pair: lowest is 5.0:1 (high on its tint); all text pairs pass AA.
One defect found and fixed during this work: white on the amber "Busy" segment (2.87:1) became dark ink on amber.
Spacing follows the 4 px scale; sentence-case labels throughout (no ALL-CAPS eyebrows).

## Primitives

`Button`: variants `urgent`, `success`, `quiet` added; sizes `xs`..`xl` (touch targets >= 44 px at `lg`/`xl`); `loading` keeps width (no shift).
`Card`: `elevation` + `tone` (left rule). `Badge`s: `PriorityBars`, `AdvisoryBadge`. Fields: `Field` now wires `aria-describedby`/`aria-invalid`.
New: `Disclosure`, `Switch`, `Segmented` (radiogroup + arrow keys), `Skeleton` family shaped like the final content,
`ErrorState`/`EmptyState` (explain what happens next, offer retry), `StatStrip`, `SlaMeter`, `PhaseTrack`, `BrandMark`, `LiveDot`, `useFlash`.
`Dialog`: focus trap, Escape, focus restore, bottom sheet on phones. `Toast`: clear of the tab bar, never over the rail.

## Screens and why

**Command Center.** Five equal stat cards became one *status strip* (critical cell is the only one allowed colour). The queue is the hero:
the most urgent item is the "Up next" lead with the full description, its wait against the response target (`SlaMeter`) and the single
next-action button; the rest are compact rows. In progress and Coverage gaps are deliberately quiet supporting panels (Coverage gaps
only escalates to an amber rule when there is something to act on). The map is a sticky full-height panel beside the queue: hovering or
focusing a row emphasises its marker. Freshness: "Updated 12 s ago" on rows and the strip; a row flashes once when it changes; the Live
badge only pulses when the stream is genuinely live and idle. The "Total reports" and "Active incidents" cells were dropped from the
strip (still on Reports and derivable from the queue); say so if you want them back.

**Incident Detail (547 lines -> a 107-line composition + 11 sections in `pages/incident/`).** A sticky *Command Bar* states the next best
action and does it: Verify incident; after verification, "Assign <top-ranked responder>" in one tap (reversible with Remove), with
distance and reasons in the hint; Mark resolved / Close at the end. Reject and Mark duplicate sit beside it, quieter. Progressive
disclosure: provenance and model details collapse; warnings (fallback, injection) never do. The nine-step stepper is a five-phase track.
The timeline shows who, why and how long each step took.

**Citizen.** Phone order is type -> where -> details: category tiles (one tap, icon + word), a full-width location button with honest
accuracy feedback (precise / low accuracy / pin), then 16 px inputs (prevents iOS zoom), a photo picker with preparing/ready/remove states,
contact and landmark behind a disclosure (auto-opens on a validation error), and a sticky submit bar. "Call 112" is the first thing on the page.
After submitting, the page is a calm tracker: reference number, one plain-language sentence, four steps, "this page updates automatically".
Dispatcher names are no longer shown to citizens in the history. The chat-connection error toast no longer interrupts citizens.

**Responder.** The dashboard leads with active assignments as cards: what/where, one large next step (Accept, I have arrived, Mark my response
complete), Navigate one tap away; the flow is the same component on the incident page. Availability is a three-way segmented control and a
real switch, with a "last shared" cue that turns amber when stale.

**Map.** Markers carry a category glyph on the priority colour; only *unattended critical* markers pulse (and not for reduced-motion users);
assigned incidents get a blue dot; icons are cached so a poll that changes nothing replaces no DOM. Clusters show a halo in the top priority
colour with a breakdown tooltip. The Map page is map + urgency-sorted list kept in sync (hover emphasises, click flies to and opens the popup,
marker click scrolls the row into view).

**Chrome.** Dark rail with a critical count on Overview, user card and chat state at the foot. The phone gets a tab bar (four destinations +
More; citizens get their two, "Report emergency" emphasised). The bell is a proper popover (Escape, focus return, unread dot, mark all read).

**Landing and sign-in.** The first screen shows the product, not a diagram: a faithful static slice of the Command Center queue (clearly captioned
"Sample data") on the dark ops background. The identical-card grids became hairline-divided panels, the trust statements a dark band with the
violet rule on "AI advises, people decide". Sign-in/register use a split layout (brand and trust points beside the form on desktop).
All copy, form ids and demo-account chips are unchanged.

## Verification (and its limits)

This sandbox had no network, so `npm ci`, the real `vite build`, vitest and axe could **not** be run. Instead:
- The real app (`App.tsx`, `api.ts`, `auth.tsx`, `live.ts`) was bundled with esbuild against the repo's own `dev/mock-api.mjs`, with small stand-ins for
  react-router, TanStack Query, react-hook-form and Leaflet (a *fake* map), and Tailwind compiled from the project config.
- `flows.mjs` was ported to Playwright with identical assertions: **all pass** (including Assign, offline queue, Hindi, role guards), plus no horizontal
  overflow at 390 px on every changed page and no console errors.
- tsc over the source with generic-preserving React/Router/Query stubs: one real error found and fixed (unused import under `noUnusedLocals`); the rest was stub noise.
- A stricter accessibility audit than the earlier checks (run on every role's pages at desktop and phone width, plus the compare/reject dialogs and the
  notification popover): accessible names, duplicate ids, ARIA reference integrity, heading structure, nested interactive elements, and **computed colour
  contrast on the rendered DOM** with translucent backgrounds composited. It found and I fixed two things (a bell `aria-controls` pointing at a closed
  popover; a `<button>` nested in the queue's `<a>`), and now reports 0 findings. It is not axe and does not replace `npm run test:a11y`.
- `dev/ui-tests/flows.mjs` was extended (queue lead, one-tap assign, "Location set", phone overflow on every redesigned page) so CI guards the new behaviour.
- 7 new unit tests (`src/__tests__/ops.test.ts`) run through a vitest shim.

**Please run on your machine:** `npm ci && npm run build && npm test && npm run test:ui && npm run test:a11y`.
Things I could not see for real: marker popups and clustering inside actual Leaflet (CSS overrides are in `index.css`), IBM Plex rendering
(loaded from Google Fonts as before; a brief font swap can shift text slightly), and axe results.
Hindi/Telugu strings added for the citizen flow (about 20 short labels) reuse phrasing already in the dictionary but still need native review.
