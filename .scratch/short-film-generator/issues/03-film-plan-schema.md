# 03 — Film Plan schema for stills-and-voiceover shorts

Type: grilling
Status: resolved

## Question

What is the canonical Film Plan shape for a ~15–30s Film built from Stills + Voiceover (Clips optional)?

Settle the entities and fields a Run must produce before media generation: e.g. title/logline, ordered shots, per-shot Still prompt, per-shot or global Voiceover text, timing/duration, and optional Clip prompt when enabled. This is a domain/schema decision, not an implementation ticket.

Update `CONTEXT.md` if new terms appear. Link any example JSON as an asset under `.scratch/short-film-generator/assets/`.

## Answer

Canonical V1 Film Plan:

**Film Plan**
- `title` (string)
- `logline` (string)
- `durationTarget`: `15s` | `30s` (echo from Brief)
- `aspectRatio`: `16:9` | `9:16` (echo)
- `includeClips` (boolean; echo from Brief)
- `shots`: ordered `Shot[]`

**Shot**
- `id`: stable string (e.g. `shot_01`)
- `stillPrompt`: full image prompt (planner folds Mood/Visual Style when present)
- `voiceover`: string; may be empty — if empty, `durationSeconds` is required
- `durationSeconds`: optional soft floor; when Voiceover TTS audio is longer, **audio wins**
- `clipPrompt`: only when `includeClips` is true, and **optional per Shot** (omit → Still-only); mix + timing → [07 — Clip behavior when Include Clips is on](./07-optional-clip-enablement.md)

No schema-enforced shot-count min/max; planner uses soft guidance (~4–6 for 15s, ~6–10 for 30s).

Voiceover is **per-shot** (not one continuous narration).

Example: [film-plan.example.json](../assets/film-plan.example.json)
