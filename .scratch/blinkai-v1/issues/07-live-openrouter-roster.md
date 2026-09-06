# 07: Live OpenRouter roster

**What to build:** Swap the fake OpenRouter port for real pinned models so a solo filmmaker can produce a real short Film end-to-end: Film Plan LLM, Stills, Voiceover TTS, and Clips when Include Clips is on. Failures are loud (no silent model fallbacks). Provider default Voiceover voice (omit `voice`).

**Blocked by:** 03 — Stills + Voiceover Assembly; 06 — Optional Clips in Run + Player

**Status:** ready-for-agent

- [ ] Real adapters use pinned roster IDs from the spec (Film Plan / Stills / Voiceover / Clips)
- [ ] Missing/invalid key and model/provider errors fail loudly with actionable messages
- [ ] Voiceover omits `voice` (provider default)
- [ ] One successful live Run with Include Clips off produces a watchable Project in the Timeline Player
- [ ] One successful live Run with Include Clips on exercises at least one Clip Shot path (or documented provider limitation if unavailable)
- [ ] Tests keep using the fake port; live check is manual or opt-in smoke, not required to hit paid APIs in CI
