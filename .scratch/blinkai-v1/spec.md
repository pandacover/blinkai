# Blinkai V1 — Short film generator

Status: ready-for-agent

## Problem Statement

I want to turn a short idea into a watchable ~15–30s film without learning video tools, writing a screenplay by hand, or stitching images and voice myself. Today that means bouncing between chat models, image tools, and editors. I need a solo local app that takes my idea, plans the film, generates the media, and plays the result in the browser.

## Solution

Blinkai is a solo TypeScript/Bun webapp: I fill in a Brief (Idea plus optional controls), the app produces a Film Plan via OpenRouter, generates Stills and Voiceover (Clips optional), Assembles them into a Film, plays it in an in-browser Timeline Player, and autosaves the whole Run as a local Project.

## User Stories

1. As a solo filmmaker, I want to open Blinkai locally, so that I can make short films without accounts or cloud signup beyond OpenRouter.
2. As a solo filmmaker, I want to enter a free-text Idea, so that I can describe the Film I want in plain language.
3. As a solo filmmaker, I want to choose a Duration Target of 15s or 30s (default 15s), so that I can aim for a short soft length without micromanaging seconds.
4. As a solo filmmaker, I want an optional Mood field, so that I can bias the emotional tone when I care about it.
5. As a solo filmmaker, I want an optional Visual Style field, so that I can bias how Stills look when I care about it.
6. As a solo filmmaker, I want blank Mood and Visual Style to be omitted from planning, so that empty fields do not invent a default aesthetic.
7. As a solo filmmaker, I want to choose Aspect Ratio 16:9 or 9:16 (default 16:9), so that the Film fits landscape or vertical viewing.
8. As a solo filmmaker, I want an Include Clips toggle defaulting to off, so that V1 Runs stay Still+Voiceover unless I opt into motion.
9. As a solo filmmaker, I want to start a Run from a Brief, so that the app can produce a Film Plan and media without further setup forms.
10. As a solo filmmaker, I want the app to refuse to start a Run if `OPENROUTER_API_KEY` is missing or invalid, so that I get a clear fix instruction pointing at `.env` / `.env.example`.
11. As a solo filmmaker, I want my OpenRouter key to stay on the Bun server only, so that it never appears in the browser bundle.
12. As a solo filmmaker, I want a Film Plan with title and logline, so that I can recognize what the Run is about.
13. As a solo filmmaker, I want the Film Plan to echo Duration Target, Aspect Ratio, and Include Clips, so that Assembly and the Timeline Player do not need the original Brief form.
14. As a solo filmmaker, I want ordered Shots with stable ids, so that I can refer to beats while reviewing the Film.
15. As a solo filmmaker, I want each Shot to include a Still prompt, so that every beat has a generated visual.
16. As a solo filmmaker, I want each Shot to include a Voiceover line that may be empty, so that some beats can be silent holds.
17. As a solo filmmaker, I want empty Voiceover to require an explicit soft duration on that Shot, so that silent beats still have a hold length.
18. As a solo filmmaker, I want soft per-Shot durations where Voiceover audio wins when longer, so that narration is never cut off.
19. As a solo filmmaker, I want Include Clips on to allow optional per-Shot Clip prompts (not mandatory on every Shot), so that motion can be selective.
20. As a solo filmmaker, I want Include Clips off to omit Clip prompts entirely, so that Plans stay Still-only when I did not opt in.
21. As a solo filmmaker, I want no per-Shot Clip override after the Film Plan exists in V1, so that changing Clip membership means re-running planning.
22. As a solo filmmaker, I want every Shot to still generate a Still even when a Clip is planned, so that I always have a poster and a fallback visual.
23. As a solo filmmaker, I want Clips to be muted with Voiceover as the only audible track, so that Assembly stays simple and synced to narration.
24. As a solo filmmaker, I want Clip timing to respect the audio-wins Shot window (cut long Clips, hold last frame on short Clips), so that the timeline stays coherent.
25. As a solo filmmaker, I want Clip generation failure to fall back to the Still for that Shot window, so that one bad Clip does not kill the Film.
26. As a solo filmmaker, I want default models pinned (Film Plan LLM, Stills, Voiceover TTS, Clips) with no silent fallbacks, so that failures are loud and predictable.
27. As a solo filmmaker, I want Voiceover to use the provider default voice (no Brief voice control), so that V1 stays free of voice pickers.
28. As a solo filmmaker, I want progress while a Run is generating, so that I know whether planning, Stills, Voiceover, or Clips are in flight.
29. As a solo filmmaker, I want the completed Film to play in a beat-aligned Timeline Player, so that Assembly feels like a Film rather than a slideshow.
30. As a solo filmmaker, I want full-bleed visuals at the Film Plan Aspect Ratio, so that the stage matches the Brief.
31. As a solo filmmaker, I want per-Shot Voiceover captions on the player, so that I can read along while reviewing.
32. As a solo filmmaker, I want play/pause gated by a user gesture, so that browser audio policies are satisfied.
33. As a solo filmmaker, I want a scrubbable Shot beat rail with jump-to-Shot, so that I can rewatch problem beats.
34. As a solo filmmaker, I want a current Shot chip and elapsed/total time readout, so that I always know where I am in the Film.
35. As a solo filmmaker, I want optional title/logline chrome that may quiet during play, so that watch mode stays clean without losing review controls on pause/hover.
36. As a solo filmmaker, I want Projects autosaved after expensive stages, so that I do not lose paid generations on refresh.
37. As a solo filmmaker, I want each Project to be exactly one Run on disk under `BLINKAI_DATA_DIR` (default app `data/`), so that saves are inspectable and relocatable.
38. As a solo filmmaker, I want Project folders named with opaque ids while titles live in metadata, so that renames do not break paths.
39. As a solo filmmaker, I want a Project to store Brief, Film Plan, Assembly manifest, and asset folders for Stills/Voiceover/Clips, so that a Run round-trips completely.
40. As a solo filmmaker, I want to list and reopen saved Projects, so that I can replay Films without regenerating.
41. As a solo filmmaker, I want to rename a Project’s display title without changing its id, so that my library stays readable.
42. As a developer, I want a single-package Bun + Hono API and Vite/React SPA, so that OpenRouter stays server-side and the Timeline Player stays client-native.
43. As a developer, I want shared Film Plan/Brief types between server and client, so that Assembly contracts stay aligned.
44. As a developer, I want `.env.example` to document required env vars, so that local setup is obvious.
45. As a solo filmmaker, I do not want MP4 export, accounts, billing, or multi-user sharing in V1, so that the first shippable cut stays focused on local Brief→Film.

## Implementation Decisions

### Topology (ADR 0001)

- Single root package; Bun throughout; no workspaces.
- Hono on Bun: JSON API for Run/Project routes; reads gitignored `.env`; hard-fails when `OPENROUTER_API_KEY` is missing/invalid; serves the built SPA in local/prod.
- Vite + React + TypeScript SPA for Brief UI, Run progress, Project library, and Timeline Player (not SSR/Next/Remix).
- Shared module for Brief, Film Plan, Assembly, and Project types used by server and client.
- Dev: Bun/Hono API + Vite client with API proxy; production: Bun serves static build + API.

### Primary test seam

- **Bun/Hono Run API** is the single primary seam: submit Brief → observe Run progression → retrieve Project/Assembly suitable for the Timeline Player.
- OpenRouter is an injectable port behind that seam (fake in tests, real in runtime).
- Disk Project persistence is exercised through the same API.
- Timeline Player consumes Assembly manifests (including fixtures) rather than forming a second primary seam.

### Brief

- Required Idea (free text).
- Duration Target: `15s` | `30s`, default `15s`, soft target.
- Mood: optional short text; blank → omit from planning prompts.
- Visual Style: optional short text; blank → omit.
- Aspect Ratio: `16:9` | `9:16`, default `16:9`.
- Include Clips: boolean, default `false`.
- No Voiceover language/voice controls on the Brief.

### Film Plan schema

- Header: `title`, `logline`, echoed `durationTarget`, `aspectRatio`, `includeClips`, ordered `shots`.
- Shot: stable `id`; `stillPrompt`; `voiceover` (may be empty); soft `durationSeconds` (required when voiceover empty); optional `clipPrompt` only when `includeClips` is true.
- Shot count: no schema min/max; planner uses soft guidance (~4–6 for 15s, ~6–10 for 30s).
- Timing rule: Shot window = `max(soft durationSeconds, Voiceover audio length)` (audio wins).

### Media generation

- Default roster (no silent fallbacks; fail loudly):
  - Film Plan LLM: `deepseek/deepseek-v4-flash-0731`
  - Stills: `bytedance-seed/seedream-5-0-pro`
  - Voiceover: `hexgrad/kokoro-82m` (omit `voice`; provider default)
  - Clips: `google/veo-3.1-fast`
- Every Shot generates a Still.
- Clip Shots also generate a muted Clip; planner asks for shortest supported Veo duration ≥ soft `durationSeconds` when possible.
- Clip longer than window → play from start, cut at window end; shorter → play once, hold last frame; Clip failure → Still for whole window.
- No V1 per-Shot Clip override after planning; change Brief Include Clips / Idea and re-plan.

### Assembly & Timeline Player

- In-browser Assembly only (no MP4 encode/export in V1).
- Web Audio master clock + rAF visual updates; start gated on user gesture (`AudioContext.resume` / play).
- Beat-aligned Film stage: full-bleed visual at Film Aspect Ratio, Voiceover caption, play/pause, scrubbable Shot beat rail, Shot chip, `elapsed / duration`.
- Optional title/logline; chrome may quiet during uninterrupted play but Shot addressability remains available on pause/hover.
- Clips play muted in the Shot window per timing rules above; Voiceover is the only audible track.

### Project persistence

- Store: Bun filesystem under `BLINKAI_DATA_DIR` (default `<app-root>/data`), Projects at `{BLINKAI_DATA_DIR}/projects/prj_<ulid>/`.
- Layout: `brief.json`, `film-plan.json`, `assembly.json`, `assets/stills/`, `assets/voiceover/`, `assets/clips/` as needed.
- In: Brief, Film Plan, generated assets, Assembly manifest. Out: API key, model caches, raw OpenRouter logs.
- Autosave after expensive stages (Film Plan ready, asset batches, Assembly ready); optional display-title rename.
- Cardinality: one Project = one Run.

### Modules (logical)

- **Shared contracts:** Brief, Film Plan, Shot, Assembly manifest, Project metadata.
- **OpenRouter port:** chat/completions (structured Film Plan), image generation, speech TTS, async video + poll/download.
- **Run orchestrator:** Brief validate → Film Plan → media fan-out → Assembly manifest → autosave.
- **Project store:** filesystem read/write/list under data dir.
- **HTTP API:** create/list/get Project/Run, stream or poll progress, fetch assets.
- **SPA:** Brief form, Run progress, Project library, Timeline Player.

### Fog deferred (not blocking V1 happy path)

- Spend/cost caps and user-visible OpenRouter usage.
- Partial Assembly / rich mid-Run failure UX beyond loud failure + Still fallback for Clip errors.
- Character consistency / seed / reference-image strategy across Stills.
- Whether Clip generation uses the Shot Still as image-to-video reference.
- Licensing / content-policy posture copy.

## Testing Decisions

- Good tests assert **external behavior** at the Run API seam: given a Brief (and a fake OpenRouter port), the API yields a persisted Project whose Film Plan/Assembly honor schema and timing rules; missing API key hard-fails; Include Clips off yields no clip prompts; Include Clips on allows mixed optional clips; audio-wins and Clip cut/hold rules are visible in the Assembly manifest the player would consume.
- Do **not** test private helpers, React component internals, or exact OpenRouter wire payloads except where the port adapter’s public contract requires it.
- Prefer one integration-style suite against the Hono app with an in-memory/fake OpenRouter and a temp `BLINKAI_DATA_DIR`.
- Timeline Player may use Assembly fixtures for lightweight browser checks later; not required as a second primary seam for this spec.
- Prior art: none in-repo yet (greenfield). Establish the Run API test as the template for future work.

## Out of Scope

- Multi-user accounts, auth, billing, shared cloud Projects
- V1 mandatory Clips on every Shot
- V1 MP4 / file download export
- Target runtime above ~30s for the first shippable cut
- Non-OpenRouter media providers
- Brief Voiceover language/voice pickers
- Per-Shot Clip editing after the Film Plan exists
- OS keychain / in-app API key settings UI
- Spend dashboards, licensing workflows, and character-consistency systems listed under fog

## Further Notes

- Domain vocabulary lives in `CONTEXT.md`; use Film, Film Plan, Brief, Shot, Still, Clip, Voiceover, Assembly, Run, Project, Timeline Player consistently.
- Wayfinder decisions are indexed in `.scratch/short-film-generator/map.md` (tickets 01–10 resolved).
- Prototype reference for Timeline Player chrome: `.scratch/short-film-generator/prototypes/timeline-player-ux.html`.
- Example Plans: `.scratch/short-film-generator/assets/film-plan.example.json` and `film-plan.include-clips.example.json`.
- Next skills after this spec: `/to-tickets` then `/implement`.
