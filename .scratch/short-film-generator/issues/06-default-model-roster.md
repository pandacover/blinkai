# 06 — Default OpenRouter model roster

Type: grilling
Status: resolved

## Question

Which OpenRouter models are the V1 defaults for (1) Film Plan LLM, (2) Still image generation, (3) Voiceover TTS, and (4) optional Clip video when enabled?

Use [docs/research/openrouter-media-capabilities.md](../../../docs/research/openrouter-media-capabilities.md) as the fact base; this ticket is the product decision, not more research. Resolution should pin model IDs and note any required fallbacks.

## Answer

V1 defaults (pinned OpenRouter model IDs; verified present on OpenRouter modality endpoints 2026-09-06):

| Role | Model ID |
| --- | --- |
| Film Plan LLM | `deepseek/deepseek-v4-flash-0731` |
| Stills | `bytedance-seed/seedream-5-0-pro` |
| Voiceover TTS | `hexgrad/kokoro-82m` |
| Clips (when Include Clips on) | `google/veo-3.1-fast` |

**Voiceover voice:** omit `voice` — use the OpenRouter/Kokoro provider default (English; no Brief voice control — see [01 — Brief optional controls for V1](./01-brief-optional-controls.md)).

**Fallbacks:** none. If a primary model is missing, rejected, or errors, **fail loudly** — no silent secondary IDs, no runtime model discovery.
