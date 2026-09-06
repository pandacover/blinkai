import type { FilmPlan } from "../shared";
import type {
  ClipResult,
  OpenRouterPort,
  PlanningInput,
  StillResult,
  VoiceoverResult,
} from "./openrouter";
import { shortestClipDurationSeconds } from "./clip-duration";

/** Pinned V1 roster — no silent fallbacks. */
export const OPENROUTER_ROSTER = {
  filmPlan: "deepseek/deepseek-v4-flash-0731",
  stills: "bytedance-seed/seedream-5-0-pro",
  voiceover: "hexgrad/kokoro-82m",
  clips: "google/veo-3.1-fast",
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
function durationSecondsFromWav(bytes: Uint8Array): number {
  // PCM WAV: byteRate at offset 28 when RIFF/WAVE fmt is standard.
  if (
    bytes.byteLength >= 44 &&
    bytes[0] === 0x52 &&
    bytes[8] === 0x57 &&
    bytes[20] === 1
  ) {
    const byteRate =
      bytes[28]! |
      (bytes[29]! << 8) |
      (bytes[30]! << 16) |
      (bytes[31]! << 24);
    const dataSize = bytes.byteLength - 44;
    if (byteRate > 0) {
      return Math.max(0.25, dataSize / byteRate);
    }
  }
  // Non-WAV / unexpected container: conservative floor from payload size.
  return Math.max(1.2, bytes.byteLength / 32000);
}

export function createLiveOpenRouterPort(
  options: LiveOpenRouterOptions,
): OpenRouterPort {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";

  async function openRouter(
    path: string,
    init: RequestInit,
    timeoutMs = 60_000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `OpenRouter ${path} timed out after ${timeoutMs}ms. Check network/model availability, or unset BLINKAI_USE_LIVE_OPENROUTER to use the fake port.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
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
        `OpenRouter Still model ${OPENROUTER_ROSTER.stills} returned no Still data.`,
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
      const durationSeconds = durationSecondsFromWav(bytes);
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
          duration: shortestClipDurationSeconds(durationSeconds),
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
          durationSeconds: shortestClipDurationSeconds(durationSeconds),
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
          durationSeconds: shortestClipDurationSeconds(durationSeconds),
        };
      }
      throw new Error(
        `OpenRouter Clip model ${OPENROUTER_ROSTER.clips} returned no Clip data.`,
      );
    },
  };
}
