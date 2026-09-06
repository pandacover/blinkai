# 03: Stills + Voiceover Assembly

**What to build:** A Run continues after the Film Plan to generate a Still and Voiceover per Shot (fake OpenRouter port/fixtures OK), builds an Assembly manifest with audio-wins Shot windows, writes assets under the Project, autosaves after expensive stages, and shows generation progress in the UI. Timeline Player playback is not required yet—Assembly must be consumable by a later player.

**Blocked by:** 02 — Brief → Film Plan Project

**Status:** ready-for-agent

- [ ] Every Shot gets a Still asset; Voiceover audio is generated when the line is non-empty
- [ ] Empty Voiceover requires soft `durationSeconds`; Shot window = max(soft duration, Voiceover audio length)
- [ ] Assembly manifest lists ordered Shots with resolved window lengths and asset references
- [ ] Project layout includes `assembly.json` and `assets/stills/` + `assets/voiceover/` as needed
- [ ] UI shows progress for planning / Stills / Voiceover stages
- [ ] Autosave occurs after Film Plan ready and after media/Assembly ready
- [ ] Run API tests assert Assembly timing rules and on-disk assets via the fake port
