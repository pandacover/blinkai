# 02: Brief → Film Plan Project

**What to build:** A solo filmmaker submits a Brief (Idea + Duration Target, optional Mood/Visual Style, Aspect Ratio, Include Clips) in the UI, starts a Run, and gets a persisted Project whose Film Plan (title, logline, echoed controls, ordered Shots) is visible. OpenRouter is a fake/injectable port returning a valid Film Plan. No Still/Voiceover/Clip media yet.

**Blocked by:** 01 — Boot app with OpenRouter key gate

**Status:** ready-for-agent

- [ ] Brief form enforces required Idea and V1 controls/defaults from the spec
- [ ] Blank Mood / Visual Style are omitted from planning inputs
- [ ] POST/create Run via the Run API produces a Film Plan through the fake OpenRouter port
- [ ] Project is saved under `BLINKAI_DATA_DIR` with opaque `prj_<ulid>` id and Brief + Film Plan on disk
- [ ] UI shows the Film Plan for the new Project/Run
- [ ] Include Clips off yields no `clipPrompt` on Shots; on allows optional per-Shot `clipPrompt` in the fake Plan
- [ ] Run API tests cover Brief → persisted Film Plan Project with the fake port
