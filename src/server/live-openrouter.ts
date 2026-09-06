import type { FilmPlan } from "../shared";
import type {
  ClipResult,
  OpenRouterPort,
  PlanningInput,
  StillResult,
  VoiceoverResult,
} from "./openrouter";

/** Pinned V1 roster — no silent fallbacks. */
export const OPENROUTER_ROSTER = {
  filmPlan: "deepseek/deepseek-chat-v3-0324",
  stills: "google/gemini-2.5-flash-image-preview",
  voiceover: "openai/gpt-audio",
  clips: "google/veo-2",
} as const;

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type LiveOpenRouterOptions = {
  apiKey: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
};

/**
 * Real OpenRouter adapters for Film Plan / Stills / Voiceover / Clips.
 * Failures throw with actionable messages (no silent model fallbacks).
 * Voiceover omits `voice` so the provider default is used.
 */
export function createLiveOpenRouterPort(
  options: LiveOpenRouterOptions,
): OpenRouterPort {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";

  async function openRouter(
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `OpenRouter ${path} failed (${response.status}). Check OPENROUTER_API_KEY and model access. ${detail.slice(0, 400)}`,
      );
    }
    return response;
  }

  return {
    async planFilm({ brief }: PlanningInput): Promise<FilmPlan> {
      const system = `You are Blinkai's Film Plan planner. Return ONLY JSON matching:
{"title":string,"logline":string,"durationTarget":"15s"|"30s","aspectRatio":"16:9"|"9:16","includeClips":boolean,"shots":[{"id":string,"stillPrompt":string,"voiceover":string,"durationSeconds":number,"clipPrompt"?:string}]}
Rules: echo durationTarget/aspectRatio/includeClips from the Brief. Empty voiceover requires durationSeconds. clipPrompt only when includeClips is true, and optional per shot.`;

      const user = JSON.stringify({
        idea: brief.idea,
        durationTarget: brief.durationTarget,
        aspectRatio: brief.aspectRatio,
        includeClips: brief.includeClips,
        ...(brief.mood ? { mood: brief.mood } : {}),
        ...(brief.visualStyle ? { visualStyle: brief.visualStyle } : {}),
      });

      const response = await openRouter("/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model: OPENROUTER_ROSTER.filmPlan,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(
          `OpenRouter Film Plan model ${OPENROUTER_ROSTER.filmPlan} returned empty content.`,
        );
      }
      const parsed = JSON.parse(content) as FilmPlan;
      return parsed;
    },

    async generateStill({ prompt }): Promise<StillResult> {
      const response = await openRouter("/images/generations", {
        method: "POST",
        body: JSON.stringify({
          model: OPENROUTER_ROSTER.stills,
          prompt,
          size: "1280x720",
        }),
      });
      const payload = (await response.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };
      const first = payload.data?.[0];
      if (first?.b64_json) {
        return {
          bytes: Uint8Array.from(Buffer.from(first.b64_json, "base64")),
          contentType: "image/png",
        };
      }
      if (first?.url) {
        const image = await fetchImpl(first.url);
        if (!image.ok) {
          throw new Error(
            `OpenRouter Still download failed (${image.status}) for model ${OPENROUTER_ROSTER.stills}.`,
          );
        }
        return {
          bytes: new Uint8Array(await image.arrayBuffer()),
          contentType: image.headers.get("content-type") ?? "image/png",
        };
      }
      throw new Error(
        `OpenRouter Still model ${OPENROUTER_ROSTER.stills} returned no image data.`,
      );
    },

    async generateVoiceover({ text }): Promise<VoiceoverResult> {
      // Omit `voice` — provider default per V1 decision.
      const response = await openRouter("/audio/speech", {
        method: "POST",
        body: JSON.stringify({
          model: OPENROUTER_ROSTER.voiceover,
          input: text,
          response_format: "wav",
        }),
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      // Approximate duration from WAV size when header is standard PCM; else soft floor.
      const durationSeconds = Math.max(1.2, bytes.byteLength / 32000);
      return {
        bytes,
        contentType: "audio/wav",
        durationSeconds,
      };
    },

    async generateClip({ prompt, durationSeconds }): Promise<ClipResult> {
      const response = await openRouter("/videos/generations", {
        method: "POST",
        body: JSON.stringify({
          model: OPENROUTER_ROSTER.clips,
          prompt,
          duration: Math.max(4, Math.ceil(durationSeconds)),
        }),
      });
      const payload = (await response.json()) as {
        data?: Array<{ url?: string; b64_json?: string }>;
      };
      const first = payload.data?.[0];
      if (first?.b64_json) {
        return {
          bytes: Uint8Array.from(Buffer.from(first.b64_json, "base64")),
          contentType: "video/mp4",
          durationSeconds: Math.max(4, durationSeconds),
        };
      }
      if (first?.url) {
        const video = await fetchImpl(first.url);
        if (!video.ok) {
          throw new Error(
            `OpenRouter Clip download failed (${video.status}) for model ${OPENROUTER_ROSTER.clips}.`,
          );
        }
        return {
          bytes: new Uint8Array(await video.arrayBuffer()),
          contentType: video.headers.get("content-type") ?? "video/mp4",
          durationSeconds: Math.max(4, durationSeconds),
        };
      }
      throw new Error(
        `OpenRouter Clip model ${OPENROUTER_ROSTER.clips} returned no video data.`,
      );
    },
  };
}
