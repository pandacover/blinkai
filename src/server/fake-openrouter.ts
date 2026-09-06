import type { Brief, FilmPlan } from "../shared";
import type { OpenRouterPort } from "./openrouter";

const TINY_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02,
  0xfe, 0xa7, 0x35, 0x81, 0x84, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

/** Deterministic fake OpenRouter port for local/dev/tests. */
export function createFakeOpenRouterPort(): OpenRouterPort {
  return {
    async planFilm({ brief }) {
      return buildFakeFilmPlan(brief);
    },
    async generateStill({ prompt }) {
      void prompt;
      return { bytes: TINY_PNG, contentType: "image/png" };
    },
    async generateVoiceover({ text }) {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const durationSeconds = Math.max(1.5, words * 0.4);
      return {
        bytes: new TextEncoder().encode(`fake-voiceover:${text}`),
        contentType: "audio/wav",
        durationSeconds,
      };
    },
    async generateClip({ prompt, durationSeconds }) {
      void prompt;
      return {
        bytes: new TextEncoder().encode("fake-clip"),
        contentType: "video/mp4",
        durationSeconds: Math.max(4, durationSeconds),
      };
    },
  };
}

export function buildFakeFilmPlan(brief: Brief): FilmPlan {
  const styleBits = [brief.mood, brief.visualStyle].filter(Boolean).join(", ");
  const styleSuffix = styleBits ? `, ${styleBits}` : "";

  const shots: FilmPlan["shots"] = [
    {
      id: "shot_01",
      stillPrompt: `Opening still for: ${brief.idea}${styleSuffix}`,
      voiceover: "The idea takes shape in the first beat.",
      durationSeconds: 3,
    },
    {
      id: "shot_02",
      stillPrompt: `Middle still developing: ${brief.idea}${styleSuffix}`,
      voiceover: "Pressure rises as the story moves forward.",
      durationSeconds: 3,
    },
    {
      id: "shot_03",
      stillPrompt: `Closing still resolving: ${brief.idea}${styleSuffix}`,
      voiceover: "",
      durationSeconds: 3,
    },
  ];

  if (brief.includeClips) {
    shots[0]!.clipPrompt = `Camera push into opening beat of: ${brief.idea}`;
    shots[2]!.clipPrompt = `Gentle resolve move for: ${brief.idea}`;
  }

  return {
    title: titleFromIdea(brief.idea),
    logline: brief.idea,
    durationTarget: brief.durationTarget,
    aspectRatio: brief.aspectRatio,
    includeClips: brief.includeClips,
    shots,
  };
}

function titleFromIdea(idea: string): string {
  const trimmed = idea.trim();
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 45).trimEnd()}...`;
}
