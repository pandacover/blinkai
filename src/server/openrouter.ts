import { z } from "zod";
import type { AspectRatio, Brief, DurationTarget, FilmPlan } from "../shared";

export const durationTargetSchema = z.enum(["15s", "30s"]);
export const aspectRatioSchema = z.enum(["16:9", "9:16"]);

export const briefInputSchema = z.object({
  idea: z.string(),
  durationTarget: durationTargetSchema.optional().default("15s"),
  mood: z.string().optional(),
  visualStyle: z.string().optional(),
  aspectRatio: aspectRatioSchema.optional().default("16:9"),
  includeClips: z.boolean().optional().default(false),
});

export type BriefInput = z.input<typeof briefInputSchema>;

/** Normalize Brief: require Idea; omit blank Mood / Visual Style. */
export function parseBrief(input: unknown): Brief {
  const parsed = briefInputSchema.parse(input);
  const idea = parsed.idea.trim();
  if (!idea) {
    throw new BriefValidationError("Idea is required.");
  }

  const brief: Brief = {
    idea,
    durationTarget: parsed.durationTarget as DurationTarget,
    aspectRatio: parsed.aspectRatio as AspectRatio,
    includeClips: parsed.includeClips,
  };

  const mood = parsed.mood?.trim();
  if (mood) {
    brief.mood = mood;
  }

  const visualStyle = parsed.visualStyle?.trim();
  if (visualStyle) {
    brief.visualStyle = visualStyle;
  }

  return brief;
}

export class BriefValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BriefValidationError";
  }
}

export type PlanningInput = {
  brief: Brief;
};

export type StillResult = {
  bytes: Uint8Array;
  contentType: string;
};

export type VoiceoverResult = {
  bytes: Uint8Array;
  contentType: string;
  durationSeconds: number;
};

export type ClipResult = {
  bytes: Uint8Array;
  contentType: string;
  durationSeconds: number;
};

export type OpenRouterPort = {
  planFilm(input: PlanningInput): Promise<FilmPlan>;
  generateStill(input: { prompt: string }): Promise<StillResult>;
  generateVoiceover(input: { text: string }): Promise<VoiceoverResult>;
  generateClip?(input: {
    prompt: string;
    durationSeconds: number;
  }): Promise<ClipResult>;
};
