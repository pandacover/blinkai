import { describe, expect, test } from "bun:test";
import type { Assembly, FilmPlan } from "../shared";

/** Assembly fixture the Timeline Player can consume without a live Run. */
export const playerAssemblyFixture: Assembly = {
  aspectRatio: "16:9",
  totalDurationSeconds: 7,
  beats: [
    {
      shotId: "shot_01",
      startSeconds: 0,
      durationSeconds: 4,
      stillAssetPath: "assets/stills/shot_01.png",
      voiceoverAssetPath: "assets/voiceover/shot_01.wav",
    },
    {
      shotId: "shot_02",
      startSeconds: 4,
      durationSeconds: 3,
      stillAssetPath: "assets/stills/shot_02.png",
    },
  ],
};

export const playerFilmPlanFixture: FilmPlan = {
  title: "Fixture Pier",
  logline: "A quiet pier at dusk.",
  durationTarget: "15s",
  aspectRatio: "16:9",
  includeClips: false,
  shots: [
    {
      id: "shot_01",
      stillPrompt: "Pier at dusk",
      voiceover: "The tide waits.",
      durationSeconds: 3,
    },
    {
      id: "shot_02",
      stillPrompt: "Lantern glow",
      voiceover: "",
      durationSeconds: 3,
    },
  ],
};

describe("Timeline Player Assembly fixture", () => {
  test("fixture beats are contiguous and audio-wins friendly for the Player", () => {
    expect(playerAssemblyFixture.beats).toHaveLength(2);
    expect(playerAssemblyFixture.beats[0]!.startSeconds).toBe(0);
    expect(
      playerAssemblyFixture.beats[0]!.startSeconds +
        playerAssemblyFixture.beats[0]!.durationSeconds,
    ).toBe(playerAssemblyFixture.beats[1]!.startSeconds);
    expect(playerAssemblyFixture.totalDurationSeconds).toBe(7);
    // Silent shot still has a Still for the Player stage
    expect(playerAssemblyFixture.beats[1]!.stillAssetPath).toContain("stills");
    expect(playerFilmPlanFixture.shots[1]!.voiceover).toBe("");
    expect(playerFilmPlanFixture.aspectRatio).toBe(
      playerAssemblyFixture.aspectRatio,
    );
  });
});
