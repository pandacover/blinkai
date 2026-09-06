/** Shared domain contracts for Brief, Film Plan, Project, and Assembly. */

export type DurationTarget = "15s" | "30s";
export type AspectRatio = "16:9" | "9:16";

/** The user's starting input that kicks off a Run. */
export type Brief = {
  idea: string;
  durationTarget: DurationTarget;
  mood?: string;
  visualStyle?: string;
  aspectRatio: AspectRatio;
  includeClips: boolean;
};

export type ShotId = string;

/** One ordered visual unit on the Film Plan. */
export type Shot = {
  id: ShotId;
  stillPrompt: string;
  voiceover: string;
  durationSeconds?: number;
  clipPrompt?: string;
};

/** Structured textual blueprint produced before media generation. */
export type FilmPlan = {
  title: string;
  logline: string;
  durationTarget: DurationTarget;
  aspectRatio: AspectRatio;
  includeClips: boolean;
  shots: Shot[];
};

/** Locally saved Run identity (one Project = one Run). */
export type ProjectId = `prj_${string}`;

export type ProjectStatus =
  | "planning"
  | "stills"
  | "voiceover"
  | "clips"
  | "ready"
  | "failed";

export type ProjectMeta = {
  id: ProjectId;
  displayTitle: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
};

/** How a Clip fits inside an audio-wins Shot window. */
export type ClipFit = "cut" | "hold" | "still-fallback";

/** Playable beat timing for the Timeline Player. */
export type AssemblyBeat = {
  shotId: ShotId;
  startSeconds: number;
  durationSeconds: number;
  stillAssetPath?: string;
  voiceoverAssetPath?: string;
  clipAssetPath?: string;
  /** Source Clip length before cut/hold against the Shot window. */
  clipSourceDurationSeconds?: number;
  /** cut = Clip longer than window; hold = shorter; still-fallback = generation failed. */
  clipFit?: ClipFit;
  /** When a Clip fails, Player falls back to the Still for the whole window. */
  clipFailed?: boolean;
};

/** Manifest that combines Shots/assets into one Film for the Timeline Player. */
export type Assembly = {
  aspectRatio: AspectRatio;
  totalDurationSeconds: number;
  beats: AssemblyBeat[];
};
