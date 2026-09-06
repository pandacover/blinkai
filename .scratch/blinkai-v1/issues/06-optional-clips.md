# 06: Optional Clips in Run + Player

**What to build:** With Include Clips on, a Run may mix Still-only and Clip Shots (optional per-Shot `clipPrompt`). Every Shot still gets a Still; Clip Shots also get a muted Clip. Assembly and Timeline Player honor audio-wins windows: cut long Clips, hold last frame on short Clips, fall back to Still if Clip generation fails. No per-Shot Clip override after the Film Plan exists—change the Brief and re-plan.

**Blocked by:** 04 — Timeline Player for a Project

**Status:** ready-for-human

- [x] Include Clips off still produces no clip prompts or clip assets
- [x] Include Clips on allows mixed optional `clipPrompt`s; Still always generated
- [x] Clips are muted; Voiceover remains the only audible track
- [x] Long Clip cut / short Clip hold-last-frame / Clip failure → Still fallback are visible in Assembly and Player
- [x] Planner requests shortest supported Clip duration ≥ soft Shot duration when possible (fake port may simulate)
- [x] Run API tests cover mixed Clip Assemblies; Player plays a mixed Project correctly

## Comments

- 2026-09-06: Optional clipPrompt generation, muted Clip assets, cut/hold/failure→Still encoded in Assembly; Player prefers Clip when present.
