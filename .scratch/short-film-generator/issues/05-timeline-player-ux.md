# 05 — Timeline Player minimal UX

Type: prototype
Status: resolved
Blocked by: 03

## Question

What minimal Timeline Player UX makes Assembly feel like a Film for a stills-and-voiceover short?

Build a throwaway prototype (see `/prototype`) that sequences Stills with Voiceover timing—play/pause, scrub or beat markers optional. React to whether the player is a simple slideshow-with-audio, a beat-aligned timeline, or something else. Link the prototype asset from this ticket.

Do not build product UI in `src/`; keep the prototype disposable.

## Answer

**V1 Timeline Player = beat-aligned Film stage** (prototype variant B), not a naked slideshow and not cinema-only chrome.

### Locked chrome
- Full-bleed Still stage (Aspect Ratio from Film Plan) with per-Shot Voiceover caption
- Play / Pause (user-gesture gated; Web Audio master clock per [09 — In-browser Assembly](./09-in-browser-assembly-research.md))
- Scrubbable **beat rail** segmented by Shot (jump-to-Shot + free scrub)
- Current Shot chip (id + short label)
- Time readout `elapsed / duration`

### Cinema cues (from variant C) — secondary polish, not the primary model
- Optional title + logline above the stage
- Chrome may quiet during uninterrupted play; beat rail + controls return on pause / hover
- Do **not** hide Shot addressability as the default (generator users rewatch problem Shots)

### Rejected as V1 primary
- **A — Slideshow + audio:** feels like a narrated carousel; no Shot addressability against a Shot-structured Film Plan
- **C alone — Cinema-first:** best *watch* feel, but hides the review affordances a Run needs

### Prototype asset
[`.scratch/short-film-generator/prototypes/timeline-player-ux.html`](../prototypes/timeline-player-ux.html) — `?variant=A|B|C`, shared Web Audio + rAF engine, synthetic VO buffer + SVG stills from the example Film Plan.

## Comments

- **2026-09-06 — resolved.** Prototype variants A/B/C exercised in-browser; locked V1 to beat-aligned Film stage (B). Indexed on the map under Decisions so far. No further work on this ticket.
