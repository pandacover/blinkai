import type {
  Assembly,
  AssemblyBeat,
  ClipFit,
  FilmPlan,
  ProjectStatus,
} from "../shared";
import { shortestClipDurationSeconds } from "./clip-duration";
import type { ProjectRecord, ProjectStore } from "./project-store";
import type { OpenRouterPort } from "./openrouter";

function extensionFor(contentType: string, fallback: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  return fallback;
}

/** Shot window = max(soft durationSeconds, Voiceover audio length). */
export function resolveShotWindowSeconds(
  softDurationSeconds: number | undefined,
  voiceoverDurationSeconds: number | undefined,
): number {
  const soft = softDurationSeconds ?? 0;
  const audio = voiceoverDurationSeconds ?? 0;
  const window = Math.max(soft, audio);
  if (window <= 0) {
    throw new Error("Shot window must be > 0 (soft duration or Voiceover length).");
  }
  return window;
}

export async function runMediaPipeline(input: {
  project: ProjectRecord;
  filmPlan: FilmPlan;
  openRouter: OpenRouterPort;
  store: ProjectStore;
  /** When false, skip Clip generation even if prompts exist. */
  generateClips?: boolean;
  /** Fired after each persisted status change (for streamed Run progress). */
  onStatus?: (status: ProjectStatus) => void;
}): Promise<ProjectRecord> {
  const { filmPlan, openRouter, store, onStatus } = input;
  let project = input.project;
  const generateClips = input.generateClips ?? filmPlan.includeClips;

  async function setStatus(
    status: ProjectStatus,
    patch: Parameters<ProjectStore["updateProject"]>[1] = {},
  ) {
    project = await store.updateProject(project.id, { ...patch, status });
    onStatus?.(status);
    return project;
  }

  await setStatus("stills");

  const stillPaths = new Map<string, string>();
  for (const shot of filmPlan.shots) {
    const still = await openRouter.generateStill({ prompt: shot.stillPrompt });
    const ext = extensionFor(still.contentType, "png");
    const relativePath = `assets/stills/${shot.id}.${ext}`;
    await store.writeAsset(project.id, relativePath, still.bytes);
    stillPaths.set(shot.id, relativePath);
  }

  await setStatus("voiceover");

  const voiceoverPaths = new Map<string, string>();
  const voiceoverDurations = new Map<string, number>();
  for (const shot of filmPlan.shots) {
    const line = shot.voiceover.trim();
    if (!line) {
      if (shot.durationSeconds == null) {
        throw new Error(
          `Shot ${shot.id} has empty Voiceover and is missing soft durationSeconds.`,
        );
      }
      continue;
    }
    const voiceover = await openRouter.generateVoiceover({ text: line });
    const ext = extensionFor(voiceover.contentType, "wav");
    const relativePath = `assets/voiceover/${shot.id}.${ext}`;
    await store.writeAsset(project.id, relativePath, voiceover.bytes);
    voiceoverPaths.set(shot.id, relativePath);
    voiceoverDurations.set(shot.id, voiceover.durationSeconds);
  }

  const clipPaths = new Map<string, string>();
  const clipSourceDurations = new Map<string, number>();
  const clipFailed = new Set<string>();
  if (generateClips) {
    await setStatus("clips");
    for (const shot of filmPlan.shots) {
      if (!shot.clipPrompt || !openRouter.generateClip) continue;
      const soft = shot.durationSeconds ?? 4;
      const requested = shortestClipDurationSeconds(soft);
      try {
        const clip = await openRouter.generateClip({
          prompt: shot.clipPrompt,
          durationSeconds: requested,
        });
        const ext = extensionFor(clip.contentType, "mp4");
        const relativePath = `assets/clips/${shot.id}.${ext}`;
        await store.writeAsset(project.id, relativePath, clip.bytes);
        clipPaths.set(shot.id, relativePath);
        clipSourceDurations.set(shot.id, clip.durationSeconds);
      } catch {
        clipFailed.add(shot.id);
      }
    }
  }

  const beats: AssemblyBeat[] = [];
  let cursor = 0;
  for (const shot of filmPlan.shots) {
    const durationSeconds = resolveShotWindowSeconds(
      shot.durationSeconds,
      voiceoverDurations.get(shot.id),
    );
    const beat: AssemblyBeat = {
      shotId: shot.id,
      startSeconds: cursor,
      durationSeconds,
      stillAssetPath: stillPaths.get(shot.id),
      voiceoverAssetPath: voiceoverPaths.get(shot.id),
    };
    if (clipPaths.has(shot.id)) {
      beat.clipAssetPath = clipPaths.get(shot.id);
      const sourceDuration = clipSourceDurations.get(shot.id) ?? durationSeconds;
      beat.clipSourceDurationSeconds = sourceDuration;
      // Exact match / longer → cut to window; shorter → hold last frame.
      beat.clipFit = sourceDuration < durationSeconds - 0.05 ? "hold" : "cut";
    }
    if (clipFailed.has(shot.id)) {
      beat.clipFailed = true;
      beat.clipFit = "still-fallback";
    }
    beats.push(beat);
    cursor += durationSeconds;
  }

  const assembly: Assembly = {
    aspectRatio: filmPlan.aspectRatio,
    totalDurationSeconds: cursor,
    beats,
  };

  await setStatus("ready", { assembly });

  return project;
}
