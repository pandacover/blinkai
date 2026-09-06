# Short film generator — wayfinder map

## Destination

A cleared decision map ready for `/to-spec`: a solo TypeScript/Bun webapp where a Brief (free text + optional controls) produces a Film Plan via OpenRouter, generates Stills + Voiceover (Clips optional / off by default), Assembles a ~15–30s Film in an in-browser Timeline Player, and saves Projects locally.

## Notes

- Domain: Blinkai short-film generation. Read `CONTEXT.md` before naming anything. Use `/grilling` + `/domain-modeling` on grilling tickets; `/prototype` on prototype tickets; `/research` on research tickets.
- Stack intent (not locked): TypeScript, Bun, OpenRouter.
- **Plan, don't do.** This map produces decisions, not product code. After the map clears: `/to-spec` → `/to-tickets` → `/implement`.
- Standing research: [OpenRouter media capabilities](../../docs/research/openrouter-media-capabilities.md) (LLM, images, async video, TTS confirmed 2026-09-05).
- Charting preferences already locked into Destination (not separate tickets): to-spec handoff; solo tool; 15–30s target; Brief = free text + optional controls; Timeline Player (no V1 MP4); local Project save; Stills+Voiceover default, Clips optional/off.

## Decisions so far

- [01 — Brief optional controls for V1](./issues/01-brief-optional-controls.md): Idea + Duration Target (15s/30s, default 15s, soft) + optional Mood/Visual Style (blank = omit) + Aspect Ratio (16:9 default / 9:16) + Include Clips (default off); no VO language/voice on Brief.
- [02 — OpenRouter API key supply and storage](./issues/02-openrouter-api-key.md): gitignored `.env` (`OPENROUTER_API_KEY`); Bun server only; hard-fail if missing; accept local filesystem read risk; no in-app paste/settings in V1.
- [03 — Film Plan schema for stills-and-voiceover shorts](./issues/03-film-plan-schema.md): title + logline + echoed durationTarget/aspectRatio/includeClips + ordered Shots (`id`, `stillPrompt`, per-shot `voiceover`, soft `durationSeconds` with audio-wins, optional `clipPrompt` when clips on). Example: [`film-plan.example.json`](./assets/film-plan.example.json).
- [04 — Local Project persistence mechanism](./issues/04-local-project-persistence.md): Bun filesystem under `BLINKAI_DATA_DIR` (default `<app-root>/data`)/`projects/prj_<ulid>/` with brief, film-plan, assembly, and asset folders; autosave after expensive stages; one Project = one Run.
- [06 — Default OpenRouter model roster](./issues/06-default-model-roster.md): Film Plan `deepseek/deepseek-v4-flash-0731`; Stills `bytedance-seed/seedream-5-0-pro`; Voiceover `hexgrad/kokoro-82m` (omit `voice`); Clips `google/veo-3.1-fast`; no fallbacks — fail loudly.
- [09 — In-browser Assembly without MP4 export](./issues/09-in-browser-assembly-research.md): Web Audio master clock + rAF still cuts (+ muted `playsinline` video for optional Clips); user-gesture gated; no MP4 encode for V1 playback. Write-up: [`docs/research/in-browser-assembly.md`](../../docs/research/in-browser-assembly.md).

## Not yet specified

- Spend / cost caps and user-visible OpenRouter usage during a Run
- Failure UX when image or TTS generation fails mid-Run (partial Assembly?)
- Character consistency across Stills (seed / reference image strategy)
- Licensing / content-policy posture for generated media

## Out of scope

- Multi-user accounts, auth, billing, or shared cloud Projects
- V1 mandatory Clips on every shot
- V1 MP4 / file download export (Timeline Player is the Film surface)
- Target runtime above ~30s for the first shippable cut
- Non-OpenRouter media providers (unless a later ticket reopens Destination)
