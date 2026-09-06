import type { Brief, FilmPlan } from "../shared";
import type { OpenRouterPort } from "./openrouter";

/** Deterministic fake OpenRouter Film Plan port for local/dev/tests. */
export function createFakeOpenRouterPort(): OpenRouterPort {
  return {
    async planFilm({ brief }) {
      return buildFakeFilmPlan(brief);
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
  if (trimmed.length <= 48) {
    return trimmed;
  }
  return `${trimmed.slice(0, 45).trimEnd()}...`;
}
