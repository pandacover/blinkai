# 04: Timeline Player for a Project

**What to build:** A solo filmmaker opens a completed Project and watches the Film in a beat-aligned Timeline Player: full-bleed stage at the Film Aspect Ratio, per-Shot Voiceover captions, user-gesture-gated play/pause, scrubbable Shot beat rail with jump-to-Shot, current Shot chip, and elapsed/total time. Optional title/logline chrome may quiet during play but Shot addressability remains on pause/hover. Still+Voiceover only in this ticket (no Clips required).

**Blocked by:** 03 — Stills + Voiceover Assembly

**Status:** ready-for-agent

- [ ] Player consumes the Project Assembly manifest (Web Audio master clock + rAF visuals)
- [ ] Play starts only after a user gesture; play/pause works
- [ ] Beat rail is scrubbable and supports jump-to-Shot
- [ ] Captions, Shot chip, and `elapsed / duration` match the current Shot window
- [ ] Stage respects Film Plan Aspect Ratio
- [ ] Prototype chrome decisions from the Timeline Player prototype are honored (beat-aligned stage, not naked slideshow)
- [ ] Verifiable with a real completed Project and/or Assembly fixture
