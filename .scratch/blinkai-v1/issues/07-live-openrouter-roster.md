# 07: Live OpenRouter roster

**What to build:** Swap the fake OpenRouter port for real pinned models so a solo filmmaker can produce a real short Film end-to-end: Film Plan LLM, Stills, Voiceover TTS, and Clips when Include Clips is on. Failures are loud (no silent model fallbacks). Provider default Voiceover voice (omit `voice`).

**Blocked by:** 03 — Stills + Voiceover Assembly; 06 — Optional Clips in Run + Player

**Status:** ready-for-human

- [x] Real adapters use pinned roster IDs from the spec (Film Plan / Stills / Voiceover / Clips)
- [x] Missing/invalid key and model/provider errors fail loudly with actionable messages
- [x] Voiceover omits `voice` (provider default)
- [ ] One successful live Run with Include Clips off produces a watchable Project in the Timeline Player (manual smoke with real OPENROUTER_API_KEY)
- [ ] One successful live Run with Include Clips on exercises at least one Clip Shot path (manual smoke; provider may 404 — fail loudly, no silent fallback)
- [x] Tests keep using the fake port; live check is manual or opt-in smoke, not required to hit paid APIs in CI

## Comments

- 2026-09-06: createLiveOpenRouterPort with pinned roster; Voiceover omits voice; tests stay on fake; live wired in server index; loud failures.

- 2026-09-06: Live adapter + roster pinned; fake port remains default in tests; server index wires live port. Paid live smoke left for human with a real key.
