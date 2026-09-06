import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";
import type { Brief, FilmPlan } from "../shared";
import type { OpenRouterPort } from "./openrouter";
import { loadServerConfig } from "./env";
import { createProjectStore } from "./project-store";

const baseBrief: Brief = {
  idea: "A courier cuts through a rainy neon alley to catch the last train.",
  durationTarget: "15s",
  aspectRatio: "16:9",
  includeClips: false,
};

function fixturePlan(brief: Brief): FilmPlan {
  return {
    title: "Neon Alley Shortcut",
    logline: "A courier cuts through a rainy neon alley and makes it to the last train.",
    durationTarget: brief.durationTarget,
    aspectRatio: brief.aspectRatio,
    includeClips: brief.includeClips,
    shots: [
      {
        id: "shot_01",
        stillPrompt: "Wide cinematic still of a rainy neon alley at night",
        voiceover: "Tonight the long way would miss the train.",
        durationSeconds: 3,
        ...(brief.includeClips
          ? {
              clipPrompt:
                "Slow push into a rainy neon alley at night, courier starting to run",
            }
          : {}),
      },
      {
        id: "shot_02",
        stillPrompt: "Medium shot of worn sneakers splashing through puddles",
        voiceover: "So she took the alley the maps pretend isn't there.",
        durationSeconds: 3,
      },
    ],
  };
}

describe("Run API: Brief → Film Plan Project", () => {
  test("creates a persisted Project with Film Plan via injectable OpenRouter port", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-run-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test-key",
      BLINKAI_DATA_DIR: dataDir,
    });

    let seenPlanningInput: unknown;
    const openRouter: OpenRouterPort = {
      async planFilm(input) {
        seenPlanningInput = input;
        return fixturePlan(input.brief);
      },
      async generateStill() {
        return { bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" };
      },
      async generateVoiceover({ text }) {
        return {
          bytes: new TextEncoder().encode(text),
          contentType: "audio/wav",
          durationSeconds: 2,
        };
      },
    };

    const store = createProjectStore(config.dataDir);
    const app = createApp(config, { openRouter, store });

    const response = await app.request("/api/runs?wait=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...baseBrief,
        mood: "  ",
        visualStyle: "",
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();

    expect(body.project.id).toMatch(/^prj_[0-9A-HJKMNP-TV-Z]{26}$/i);
    expect(body.project.filmPlan.title).toBe("Neon Alley Shortcut");
    expect(body.project.filmPlan.includeClips).toBe(false);
    expect(
      body.project.filmPlan.shots.every(
        (shot: { clipPrompt?: string }) => shot.clipPrompt === undefined,
      ),
    ).toBe(true);

    expect(seenPlanningInput).toEqual({
      brief: {
        idea: baseBrief.idea,
        durationTarget: "15s",
        aspectRatio: "16:9",
        includeClips: false,
      },
    });

    const loaded = await store.getProject(body.project.id);
    expect(loaded?.brief.idea).toBe(baseBrief.idea);
    expect(loaded?.filmPlan?.title).toBe("Neon Alley Shortcut");
    expect(loaded?.brief).not.toHaveProperty("mood");
    expect(loaded?.brief).not.toHaveProperty("visualStyle");
  });

  test("Include Clips on allows optional clipPrompt on Shots in the Film Plan", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-clips-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test-key",
      BLINKAI_DATA_DIR: dataDir,
    });

    const openRouter: OpenRouterPort = {
      async planFilm(input) {
        return fixturePlan(input.brief);
      },
      async generateStill() {
        return { bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" };
      },
      async generateVoiceover({ text }) {
        return {
          bytes: new TextEncoder().encode(text),
          contentType: "audio/wav",
          durationSeconds: 2,
        };
      },
    };

    const app = createApp(config, {
      openRouter,
      store: createProjectStore(config.dataDir),
    });

    const response = await app.request("/api/runs?wait=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...baseBrief, includeClips: true }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project.filmPlan.includeClips).toBe(true);
    expect(body.project.filmPlan.shots[0].clipPrompt).toContain("neon alley");
    expect(body.project.filmPlan.shots[1].clipPrompt).toBeUndefined();
  });

  test("rejects a Brief with blank Idea", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-invalid-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test-key",
      BLINKAI_DATA_DIR: dataDir,
    });

    const app = createApp(config, {
      openRouter: {
        async planFilm() {
          throw new Error("should not be called");
        },
        async generateStill() {
          throw new Error("should not be called");
        },
        async generateVoiceover() {
          throw new Error("should not be called");
        },
      },
      store: createProjectStore(config.dataDir),
    });

    const response = await app.request("/api/runs?wait=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...baseBrief, idea: "   " }),
    });

    expect(response.status).toBe(400);
  });
});
