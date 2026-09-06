# 01 — Brief optional controls for V1

Type: grilling
Status: resolved

## Question

Which optional Brief controls ship in V1 alongside the free-text idea box?

Duration is already targeted at ~15–30s (may still be a control within that band). Decide which of tone/mood, aspect ratio, visual style, Voiceover language/voice, and Clip enablement belong on the Brief itself versus elsewhere (or not in V1).

Resolution should list the V1 control set and what each defaults to.

## Answer

V1 Brief = required **Idea** (free text) plus:

| Control | Required? | Shape | Default |
| --- | --- | --- | --- |
| **Duration Target** | choice | `15s` \| `30s` | `15s` — soft target (Film Plan aims near it; Timeline Player may land a few seconds off) |
| **Mood** | no | short text | blank → **omit** from Film Plan / Still prompts |
| **Aspect Ratio** | choice | `16:9` \| `9:16` | `16:9` |
| **Visual Style** | no | short text | blank → **omit** |
| **Include Clips** | toggle | on \| off | **off** |

**Not on the Brief in V1:** Voiceover language or voice (English + system default; voice/model belongs with ticket 06).

Glossary terms added under Brief in `CONTEXT.md`: Duration Target, Mood, Aspect Ratio, Visual Style, Include Clips.
