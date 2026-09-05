# OpenRouter media capabilities for a short-film generator

**Research date:** 2026-09-05 (UTC)  
**Primary sources:** [OpenRouter docs](https://openrouter.ai/docs), [docs index (`llms.txt`)](https://openrouter.ai/docs/llms.txt), and live first-party APIs (`https://openrouter.ai/api/v1/...`).  
**Method:** Read multimodal / image / video / TTS / structured-outputs docs; listed models via `/api/v1/models`, `/api/v1/images/models`, and `/api/v1/videos/models`. No third-party blogs.

> Model catalogs and prices change frequently. Treat model IDs and SKU prices below as a snapshot from **2026-09-05**, not a permanent guarantee. Re-query the discovery endpoints before shipping.

---

## Executive answers

| Need | Available on OpenRouter? | Primary API |
| --- | --- | --- |
| LLM scripts / shot lists / structured JSON | **Yes** | `POST /api/v1/chat/completions` (+ structured outputs) |
| Image stills | **Yes** | `POST /api/v1/images` (also beta chat server tool) |
| Video short clips | **Yes** (async jobs) | `POST /api/v1/videos` → poll → download |
| Audio / TTS | **Yes** | `POST /api/v1/audio/speech` |
| Speech-to-text | **Yes** (related) | `POST /api/v1/audio/transcriptions` |

Citations: [Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview), [Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation), [Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation), [Text-to-Speech](https://openrouter.ai/docs/guides/overview/multimodal/tts), [Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

---

## 1. LLM text generation (scripts / shot lists / structured JSON)

### Capability

OpenRouter’s core path is the OpenAI-compatible chat completions API. Multimodal overview states most multimodal **inputs** share `/api/v1/chat/completions`; text generation uses the same endpoint with `messages` ([Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview); API index entry [Create a chat completion](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)).

For film pipelines that need parseable shot lists / scene graphs, OpenRouter documents **structured outputs**: set `response_format` to `json_schema` (strict schema) or use basic JSON mode via `json_object` ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).

### Request / response shape (structured JSON)

**Request (documented pattern):**

```http
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
Content-Type: application/json
```

```json
{
  "model": "anthropic/claude-sonnet-4.6",
  "messages": [
    { "role": "user", "content": "Write a 6-shot list for a rainy neon alley chase." }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "shot_list",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "shots": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "shot_id": { "type": "string" },
                "duration_s": { "type": "number" },
                "camera": { "type": "string" },
                "action": { "type": "string" },
                "dialogue": { "type": "string" }
              },
              "required": ["shot_id", "duration_s", "camera", "action"],
              "additionalProperties": false
            }
          }
        },
        "required": ["shots"],
        "additionalProperties": false
      }
    }
  }
}
```

Source pattern: [Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

**Response:** standard chat completion; structured content is in `choices[0].message.content` as a JSON string matching the schema ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).

### Constraints (first-party)

- Structured outputs are **per-endpoint**, not guaranteed for every provider of a model. Docs recommend `require_parameters: true` and checking the model’s Providers / `structured_outputs` support ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).
- `strict: true` improves enforcement, but docs note exact compliance is **not guaranteed on every endpoint** ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).
- Streaming with structured outputs is supported; partial JSON streams until complete ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).
- Optional Response Healing plugin for non-streaming `json_schema` requests ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).

### Pricing notes (first-party)

Text models are billed as prompt/completion tokens via the Models API / model pages. Snapshot examples from `GET https://openrouter.ai/api/v1/models` on 2026-09-05 (USD per token fields as returned by the API):

| Model | Prompt | Completion | Context |
| --- | --- | --- | --- |
| `anthropic/claude-sonnet-4.6` | 0.000003 | 0.000015 | 1,000,000 |
| `anthropic/claude-opus-4.8` | 0.000005 | 0.000025 | 1,000,000 |
| `openai/gpt-5.4` | 0.0000025 | 0.000015 | 1,050,000 |
| `openai/gpt-6-astra` | 0.00001 | 0.00005 | 1,050,000 |
| `google/gemini-3.1-pro-preview` | 0.000002 | 0.000012 | 1,048,576 |

Source: live Models API (`https://openrouter.ai/api/v1/models`), 2026-09-05.

---

## 2. Image generation (stills)

### Can you generate images through OpenRouter?

**Yes.** OpenRouter provides a **dedicated Image API** for text-to-image and optional reference images (image-to-image) ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation); [Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview)).

There is also a **beta** chat/Responses **server tool** `openrouter:image_generation` that lets any chat model call image generation ([Server tools – Image Generation](https://openrouter.ai/docs/guides/features/server-tools/image-generation)). Prefer the dedicated `/api/v1/images` path for a short-film stills pipeline unless you specifically want agentic tool calling.

### Models / modalities (snapshot 2026-09-05)

Discovery:

- `GET https://openrouter.ai/api/v1/images/models` ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation))
- `GET https://openrouter.ai/api/v1/models?output_modalities=image` ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation))
- Per-endpoint capabilities: `GET /api/v1/images/models/{model}/endpoints` ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation))

**50 models** returned by `/api/v1/images/models` on 2026-09-05. Families present (IDs from that response):

- **OpenAI:** `openai/gpt-image-2`, `openai/gpt-image-1`, `openai/gpt-image-1-mini`, `openai/gpt-5-image`, `openai/gpt-5-image-mini`, `openai/gpt-5.4-image-2`
- **Google (Nano Banana / Gemini image):** `google/gemini-3-pro-image`, `google/gemini-3.1-flash-image`, `google/gemini-3.1-flash-lite-image`, preview variants, `google/gemini-2.5-flash-image`
- **ByteDance Seedream:** `bytedance-seed/seedream-5-0-pro`, `seedream-5-0-lite`, `seedream-4.5`
- **Black Forest Labs FLUX.2:** `black-forest-labs/flux.2-pro`, `flux.2-flex`, `flux.2-max`, `flux.2-klein-4b`
- **Recraft** (incl. vector/SVG): `recraft/recraft-v4.1*`, `recraft/recraft-v4*`, `recraft/recraft-v3`
- Others: Microsoft MAI Image, Meta Muse Image, xAI Grok Imagine Image, Qwen Image 3, Krea 2, Sourceful Riverflow

Architecture on image models typically lists `output_modalities: ["image"]`; some Gemini/OpenAI image models also list `text` in output modalities (Models/Images APIs, 2026-09-05).

Docs example used in the Image Generation page hero: model `openai/gpt-image-2`, `quality: "high"`, `aspect_ratio: "16:9"`, PNG output ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)).

### Request / response shape

**Request:**

```http
POST https://openrouter.ai/api/v1/images
```

```json
{
  "model": "openai/gpt-image-2",
  "prompt": "editorial still, rainy neon alley, cinematic 16:9",
  "n": 1,
  "resolution": "2K",
  "aspect_ratio": "16:9",
  "quality": "high",
  "output_format": "png",
  "input_references": [
    {
      "type": "image_url",
      "image_url": { "url": "https://example.com/style-ref.jpg" }
    }
  ]
}
```

Parameter table (required: `model`, `prompt`): `n` (1–10), `resolution` (`512`/`1K`/`2K`/`4K`), `aspect_ratio`, `size`, `quality`, `output_format` (`png`/`jpeg`/`webp`/`svg`), `background`, `output_compression`, `seed`, `stream`, `input_references`, `provider.*` ([Image Generation – Request Parameters](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)).

**Response (non-streaming):**

```json
{
  "created": 1748372400,
  "data": [
    {
      "b64_json": "<base64-encoded-image>",
      "media_type": "image/png"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 4175,
    "total_tokens": 4175,
    "cost": 0.04
  }
}
```

([Image Generation – Response Format](https://openrouter.ai/docs/guides/overview/multimodal/image-generation))

**Streaming:** when `supports_streaming` is true, SSE events include `image_generation.partial_image`, `image_generation.completed`, and `error`, ending with `data: [DONE]` ([Image Generation – Streaming](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)). Example: `openai/gpt-image-2` endpoint reported `supports_streaming: true` via `/api/v1/images/models/openai/gpt-image-2/endpoints` on 2026-09-05.

### Constraints & pricing notes

- Billing is **all-or-nothing**: completed images billed in full; failed/cancelled not billed; disconnect may still finish upstream but client is not charged for undelivered work ([Image Generation – Billing](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)).
- Providers may reject unsupported `n`, resolution, etc.; validate via Image Models / endpoints APIs ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)).
- Endpoint pricing examples (2026-09-05, `/endpoints`):
  - `openai/gpt-image-2` (OpenAI): token-priced `input_text` / `input_image` / `output_image`
  - `google/gemini-3-pro-image`: token-priced input/output image; resolutions `1K`/`2K`/`4K` (AI Studio) or `1K`/`2K` (Vertex)
  - `bytedance-seed/seedream-5-0-pro`: **per-image** e.g. `$0.045` output image, `$0.09` high_resolution variant, `$0.003` input image
- Server-tool default image model documented as `openai/gpt-5-image` (beta) ([Server tools – Image Generation](https://openrouter.ai/docs/guides/features/server-tools/image-generation)).

---

## 3. Video generation (short clips)

### Can you generate video through OpenRouter?

**Yes.** OpenRouter documents a **dedicated asynchronous video generation API** at `/api/v1/videos` for text-to-video, image-to-video (`frame_images`), and reference-to-video (`input_references`) ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation); [Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview)).

This is **generation** (output modality `video`), distinct from **video input/understanding** (`video_url` on chat completions) ([Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview)).

### Models (snapshot 2026-09-05)

Discovery:

- `GET https://openrouter.ai/api/v1/videos/models` ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation))
- `GET https://openrouter.ai/api/v1/models?output_modalities=video` ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation))

**28 models** returned by `/api/v1/videos/models` on 2026-09-05, including:

| Model ID | Documented / API duration support (s) | Resolutions (API) | Notes from API `pricing_skus` |
| --- | --- | --- | --- |
| `google/veo-3.1` | 4, 6, 8 | 720p, 1080p, 4K | per-second with/without audio; 4K SKUs |
| `google/veo-3.1-fast` | 4, 6, 8 | 720p, 1080p, 4K | lower per-second than Veo 3.1 |
| `google/veo-3.1-lite` | 4, 6, 8 | 720p, 1080p | cheapest Veo tier in snapshot |
| `openai/sora-2-pro` | 4, 8, 12, 16, 20 | 720p, 1080p | e.g. `$0.30`/s 720p, `$0.50`/s 1080p |
| `minimax/hailuo-3` | 5–15 | `2K` | docs example: 5s 2K 16:9 with audio ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)) |
| `minimax/hailuo-3-max` | 5–15 | 480p, 768p | |
| `alibaba/wan-3.0` / `wan-3.0-prime` | 2–30 | 480p–1080p | long-clip capable |
| `alibaba/wan-2.7`, `wan-2.6` | model-specific | 720p/1080p | |
| `bytedance/seedance-2.5`, `2.0`, `2.0-fast`, `2.0-mini`, `1-5-pro` | up to 15–30 | up to 4K on 2.0 | token-based video SKUs |
| `kwaivgi/kling-v3.0-pro`, `kling-v3.0-std`, `kling-video-o1` | 3–15 (o1: 5/10) | mainly 720p | audio duration SKUs on v3.0 |
| `runway/gen-4.5` | 2–10 | 720p | cents per second |
| `runway/aleph-2` | (not listed as enum) | — | cents per second |
| `x-ai/grok-imagine-video`, `grok-imagine-video-1.5` | 1–15 | 480p–1080p | |
| `heygen/avatar-iv` | — | 720p, 1080p | avatar / talking-head oriented passthrough |
| `black-forest-labs/flux-3-video` | 5–20 | 720p, 1080p | |
| `black-forest-labs/flux-video-upscale` | — | — | upscale SKU (not generation) |
| `alibaba/happyhorse-1.0`, `1.1` | 3–15 | 720p, 1080p | |

Source: `GET https://openrouter.ai/api/v1/videos/models` on 2026-09-05; docs examples cite `google/veo-3.1`, `minimax/hailuo-3`, `alibaba/wan-2.7` ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).

API reference: [Submit a video generation request](https://openrouter.ai/docs/api/api-reference/video-generation/submit-a-video-generation-request).

### Request / response shapes

**Async workflow** ([Video Generation – How It Works](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)):

1. `POST /api/v1/videos` → job id + `polling_url`
2. Poll `GET /api/v1/videos/{jobId}` until `completed` / `failed`
3. Download via `unsigned_urls[]` or `GET /api/v1/videos/{jobId}/content?index=0`

**Submit request:**

```json
{
  "model": "google/veo-3.1",
  "prompt": "Slow cinematic push-in on a neon cafe window in the rain",
  "duration": 6,
  "resolution": "1080p",
  "aspect_ratio": "16:9",
  "generate_audio": true,
  "frame_images": [
    {
      "type": "image_url",
      "image_url": { "url": "https://example.com/first-frame.png" },
      "frame_type": "first_frame"
    }
  ],
  "callback_url": "https://example.com/webhooks/openrouter-video"
}
```

Parameters: `model` (required), `prompt` (required for most models; optional for some image-only flows per API reference), `duration`, `resolution`, `aspect_ratio`, `size`, `frame_images`, `input_references`, `generate_audio`, `seed`, `callback_url`, `provider` ([Video Generation – Request Parameters](https://openrouter.ai/docs/guides/overview/multimodal/video-generation); [Submit API](https://openrouter.ai/docs/api/api-reference/video-generation/submit-a-video-generation-request)).

Supported resolution enums in docs: `480p`, `720p`, `768p`, `1080p`, `1K`, `2K`, `4K`. Aspect ratios include `16:9`, `9:16`, `1:1`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`, `9:21` ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).

**Submit response (202):**

```json
{
  "id": "abc123",
  "polling_url": "https://openrouter.ai/api/v1/videos/abc123",
  "status": "pending"
}
```

**Poll response (completed):**

```json
{
  "id": "abc123",
  "generation_id": "gen-1234567890-abcdef",
  "polling_url": "https://openrouter.ai/api/v1/videos/abc123",
  "status": "completed",
  "unsigned_urls": [
    "https://openrouter.ai/api/v1/videos/abc123/content?index=0"
  ],
  "usage": { "cost": 0.25, "is_byok": false }
}
```

Statuses: `pending`, `in_progress`, `completed`, `failed` (docs table); webhook events also document `cancelled` and `expired` ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).

Download example returns **MP4** bytes (`--output video.mp4`) ([Video Generation – Downloading](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).

### Constraints (critical)

- **Always async** — not a synchronous chat completion ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).
- Unsupported `duration` / `resolution` / `aspect_ratio` → **400** listing supported values ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).
- Suggested poll interval ~**30 seconds**; generation may take **30s to several minutes** ([Video Generation – Best Practices](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).
- Optional HTTPS `callback_url` / workspace default webhooks with signature verification ([Video Generation – Webhooks](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).
- **`generate_audio`:** defaults to `true` for models that support audio output ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).
- If both `frame_images` and `input_references` are set, **`frame_images` wins** (image-to-video) ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).
- **Zero Data Retention (ZDR): video generation is not eligible.** With ZDR enforcement enabled, OpenRouter will **not route** video generation requests ([Video Generation – Zero Data Retention](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)).
- Pricing is model/SKU-specific (`pricing_skus` on video models API); typically per second of output and/or video tokens ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation); live `/api/v1/videos/models`).

---

## 4. Audio / TTS via OpenRouter

### Can you do TTS through OpenRouter?

**Yes.** Dedicated OpenAI-compatible endpoint:

`POST https://openrouter.ai/api/v1/audio/speech`

Returns a **raw audio byte stream** (not JSON) in `mp3` or `pcm` ([Text-to-Speech](https://openrouter.ai/docs/guides/overview/multimodal/tts); [Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview)).

Discovery: `GET https://openrouter.ai/api/v1/models?output_modalities=speech` ([TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)).

### Speech models (snapshot 2026-09-05)

**18 models** with `output_modalities` including `speech` from the Models API:

- `mistralai/voxtral-mini-tts-2603` (also used as a docs example)
- `microsoft/mai-voice-2`, `microsoft/mai-voice-2-flash`
- `minimax/speech-2.8-hd`, `minimax/speech-2.8-turbo`
- `fish-audio/s1`, `fish-audio/s2-pro`, `fish-audio/s2.1-pro`, free variants
- `qwen/qwen-audio-3.0-tts-flash`, `qwen/qwen-audio-3.0-tts-plus`
- `deepgram/aura-2`, `deepgram/flux-tts:free`
- `x-ai/grok-voice-tts-1.0`
- `google/gemini-3.1-flash-tts-preview`
- `canopylabs/orpheus-3b-0.1-ft`, `sesame/csm-1b`, `hexgrad/kokoro-82m`

Docs also show example slugs such as `openai/gpt-4o-mini-tts-2025-12-15` ([TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)). **That OpenAI TTS slug was not present** in `output_modalities=speech` on 2026-09-05 — rely on the live Models API rather than doc examples alone.

### Request / response shape

```json
{
  "model": "mistralai/voxtral-mini-tts-2603",
  "input": "Line of dialogue for the alley chase.",
  "voice": "en_paul_neutral",
  "response_format": "mp3",
  "speed": 1.0
}
```

Parameters: `model`, `input` required; `voice` provider-dependent; `response_format` `mp3`|`pcm` (default `pcm` per docs); `speed`; optional `input_references` for **stateless voice cloning** (≤20 MiB base64 / 15 MiB decoded); `provider.options` ([TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)).

**Response headers:** `Content-Type: audio/mpeg` or `audio/pcm`; `X-Generation-Id` ([TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)).

### Pricing / constraints

- Docs: TTS priced **per character** of input text; check Models page / API ([TTS – Pricing](https://openrouter.ai/docs/guides/overview/multimodal/tts)). Models API snapshot exposes a `prompt` rate field for speech models (treat as the billed character/token rate surfaced by OpenRouter — verify on the model page before budgeting).
- Long text: docs recommend splitting into segments ([TTS – Best Practices](https://openrouter.ai/docs/guides/overview/multimodal/tts)).
- Related: **Speech-to-Text** at `/api/v1/audio/transcriptions` ([Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview)).
- Video models may also emit **baked-in audio** via `generate_audio` on `/api/v1/videos` ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)) — separate from the TTS endpoint.

---

## 5. Multimodal generation map (short-film stack)

```text
Screenplay / shot JSON  →  POST /api/v1/chat/completions
                           (+ response_format.json_schema)

Stills                  →  POST /api/v1/images
                           (optional input_references for consistency)

Clips                   →  POST /api/v1/videos  (async poll/webhook)
                           (optional frame_images from stills)

VO / dialogue audio     →  POST /api/v1/audio/speech
```

Chat multimodal **inputs** (analyze boards, reference clips) use content parts `image_url`, `input_audio`, `video_url`, `file` on `/api/v1/chat/completions` ([Multimodal overview](https://openrouter.ai/docs/guides/overview/multimodal/overview)) — useful for review, not for generating clips.

---

## 6. Recommended models (as of 2026-09-05 research)

Recommendations are **opinionated defaults for a short-film pipeline**, grounded only in first-party listings/docs above. Re-check availability and SKUs before production.

### Screenplay planning LLM

| Priority | Model | Why (first-party basis) |
| --- | --- | --- |
| **Primary** | `anthropic/claude-sonnet-4.6` | Large context (1M), `structured_outputs` + `tools` on Models API; strong default for long scripts/JSON shot lists at lower cost than Opus |
| **Premium** | `anthropic/claude-opus-4.8` or `openai/gpt-6-astra` | Same structured-output flags; higher completion rates — use for final polish / harder narrative structure |
| **Cost / speed** | `openai/gpt-5.4` or `google/gemini-3.1-pro-preview` | Structured outputs supported; Gemini also multimodal if you feed reference stills into planning |

Always set `response_format.type = "json_schema"` with `strict: true` for shot lists ([Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)).

### Stills (image)

| Priority | Model | Why |
| --- | --- | --- |
| **Primary cinematic stills** | `openai/gpt-image-2` | Featured in Image Generation docs; streaming; quality/aspect controls; 16:9 film framing ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)) |
| **High-res / Google stack** | `google/gemini-3-pro-image` | Up to 4K on AI Studio endpoint; strong reference-image count (API endpoints snapshot) |
| **Budget / volume stills** | `bytedance-seed/seedream-5-0-pro` or `bytedance-seed/seedream-4.5` | Dedicated image models with clear per-image / resolution pricing on endpoints API |
| **Style / FLUX look** | `black-forest-labs/flux.2-pro` | Listed on Image Models API; provider passthrough for steps/guidance documented for FLUX family ([Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)) |

### Clips (video)

| Priority | Model | Why |
| --- | --- | --- |
| **Primary short cinematic clips** | `google/veo-3.1` or `google/veo-3.1-fast` | First-class docs examples; 4/6/8s; 720p–4K; audio toggle; good fit for shot-length clips ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)) |
| **Budget Veo** | `google/veo-3.1-lite` | Same duration set; lower `pricing_skus` in API snapshot |
| **Longer beats (up to ~15–30s)** | `minimax/hailuo-3` / `hailuo-3-max` or `alibaba/wan-3.0` | Docs feature Hailuo; Wan 3.0 lists durations through 30s on Videos Models API |
| **Still→motion** | `alibaba/wan-2.7` or Kling / Seedance variants | Docs explicitly show `frame_images` / `input_references` with Wan 2.7 ([Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)) |
| **OpenAI stack** | `openai/sora-2-pro` | Available on Videos Models API; 4–20s; 720p/1080p — higher per-second SKUs in snapshot |

### TTS (if needed for VO)

| Priority | Model | Why |
| --- | --- | --- |
| **Default** | `mistralai/voxtral-mini-tts-2603` | Documented TTS example model; present on speech Models API |
| **Expressive / styles** | `microsoft/mai-voice-2` | Docs cover Azure style / `styledegree` provider options ([TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)) |
| **Voice cloning** | `fish-audio/s2.1-pro` | Docs show cloning via `input_references` with this model family ([TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)) |

---

## 7. What this research does **not** claim

- No claim that every listed model is equally good for film continuity, character consistency, or lip-sync — OpenRouter docs do not provide quality rankings for short-film use; only capabilities, parameters, and pricing surfaces.
- No claim that OpenAI TTS examples in docs are currently routable if absent from `output_modalities=speech`.
- Video **understanding** (input) ≠ video **generation** (output).
- Chat server-tool image generation is **beta** and may change ([Server tools – Image Generation](https://openrouter.ai/docs/guides/features/server-tools/image-generation)).

---

## 8. Source index (URLs read / queried)

| Resource | URL |
| --- | --- |
| Docs home / index | https://openrouter.ai/docs · https://openrouter.ai/docs/llms.txt |
| Multimodal overview | https://openrouter.ai/docs/guides/overview/multimodal/overview |
| Image generation guide | https://openrouter.ai/docs/guides/overview/multimodal/image-generation |
| Video generation guide | https://openrouter.ai/docs/guides/overview/multimodal/video-generation |
| TTS guide | https://openrouter.ai/docs/guides/overview/multimodal/tts |
| Structured outputs | https://openrouter.ai/docs/guides/features/structured-outputs |
| Server tool image gen (beta) | https://openrouter.ai/docs/guides/features/server-tools/image-generation |
| Video submit API | https://openrouter.ai/docs/api/api-reference/video-generation/submit-a-video-generation-request |
| Image generate API | https://openrouter.ai/docs/api/api-reference/images/generate-an-image |
| Models API | https://openrouter.ai/api/v1/models |
| Image models API | https://openrouter.ai/api/v1/images/models |
| Video models API | https://openrouter.ai/api/v1/videos/models |
| Speech filter | https://openrouter.ai/api/v1/models?output_modalities=speech |
| Image filter | https://openrouter.ai/api/v1/models?output_modalities=image |
| Video filter | https://openrouter.ai/api/v1/models?output_modalities=video |

**Docs/API snapshot timestamp:** 2026-09-05 UTC.
