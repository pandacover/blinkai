# 07 — Clip behavior when Include Clips is on

Type: grilling
Status: resolved

## Question

[01 — Brief optional controls for V1](./01-brief-optional-controls.md) already places **Include Clips** on the Brief (default off). That is the enablement surface.

When Include Clips is **on**, what happens inside the Run?

Decide: all-or-nothing Clips for every shot vs Film Plan may mix Stills-only and Clip shots; how timing/Assembly works in a mixed Film; and whether the user can override per-shot after the Film Plan exists.

Resolution should state the Clip selection rule and the mixed Still/Clip timing model for the Timeline Player.

## Answer

### Selection

**Include Clips on = Clips allowed, not mandatory on every Shot.** The Film Plan may mix Clip Shots and Still-only Shots. When `includeClips` is true, `clipPrompt` is **optional per Shot** (absent/omitted → Still-only). When `includeClips` is false, no Shot has `clipPrompt`.

**No V1 per-shot override** after the Film Plan exists. To change Clip membership, change Include Clips / the Idea and re-run Film Plan.

### Media per Shot

Every Shot still generates a **Still** from `stillPrompt` (poster before Play, fallback if Clip fails, hold surface if needed). Clip Shots also generate a muted Clip from `clipPrompt`.

### Timing / Assembly (Timeline Player)

- Shot window remains **audio-wins** ([03 — Film Plan schema](./03-film-plan-schema.md)): `max(soft durationSeconds, Voiceover audio length)`; Clip length never extends the window.
- **Clips are always muted**; Voiceover is the only audible track ([09 — In-browser Assembly](../../docs/research/in-browser-assembly.md)).
- During a Clip Shot’s window, muted Clip playback replaces the Still while active.
- Clip **longer** than the window → play from `t=0`, cut/hide at window end.
- Clip **shorter** than the window → play once, then **hold last frame** to the window end.
- If Clip generation fails → show the Still for the whole window.
- Planner requests the shortest Veo duration **≥** the Shot’s soft `durationSeconds` when possible (roster Clip model: `google/veo-3.1-fast`, typically 4/6/8s); otherwise nearest available.

Mixed example: [`film-plan.include-clips.example.json`](../assets/film-plan.include-clips.example.json)
