import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";
import type { Brief, FilmPlan } from "../shared";
import type { OpenRouterPort, StillResult, VoiceoverResult } from "./openrouter";
import { loadServerConfig } from "./env";
import { createProjectStore } from "./project-store";

const baseBrief: Brief = {
  idea: "A courier cuts through a rainy neon alley to catch the last train.",
  durationTarget: "15s",
  aspectRatio: "16:9",
  includeClips: false,
};

function fixturePlan(): FilmPlan {
  return {
    title: "Neon Alley Shortcut",
    logline: "A courier races the clock through neon rain.",
    durationTarget: "15s",
    aspectRatio: "16:9",
    includeClips: false,
    shots: [
      {
        id: "shot_01",
        stillPrompt: "Wide rainy neon alley",
        voiceover: "Tonight the long way would miss the train.",
        durationSeconds: 3,
      },
      {
        id: "shot_02",
        stillPrompt: "Sneakers in puddles",
        voiceover: "",
        durationSeconds: 4,
      },
    ],
  };
}

const tinyPng = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02,
  0xfe, 0xa7, 0x35, 0x81, 0x84, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

function stillResult(): StillResult {
  return { bytes: tinyPng, contentType: "image/png" };
}

function voiceoverResult(durationSeconds: number): VoiceoverResult {
  return {
    bytes: new TextEncoder().encode(`fake-audio:${durationSeconds}`),
    contentType: "audio/wav",
    durationSeconds,
  };
}

describe("Run API: Film Plan → Stills + Voiceover Assembly", () => {
  test("generates Still/Voiceover assets and Assembly with audio-wins Shot windows", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-assembly-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test-key",
      BLINKAI_DATA_DIR: dataDir,
    });

    const voiceoverCalls: string[] = [];
    const openRouter: OpenRouterPort = {
      async planFilm() {
        return fixturePlan();
      },
      async generateStill() {
        return stillResult();
      },
      async generateVoiceover({ text }) {
        voiceoverCalls.push(text);
        // Audio longer than soft 3s → audio wins
        return voiceoverResult(5);
      },
    };

    const store = createProjectStore(config.dataDir);
    const app = createApp(config, { openRouter, store });

    const response = await app.request("/api/runs?wait=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseBrief),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    const project = body.project;

    expect(project.status).toBe("ready");
    expect(project.assembly.aspectRatio).toBe("16:9");
    expect(project.assembly.beats).toHaveLength(2);

    // shot_01: max(3 soft, 5 audio) = 5; shot_02 silent: soft 4
    expect(project.assembly.beats[0].shotId).toBe("shot_01");
    expect(project.assembly.beats[0].durationSeconds).toBe(5);
    expect(project.assembly.beats[0].startSeconds).toBe(0);
    expect(project.assembly.beats[0].stillAssetPath).toContain("assets/stills/");
    expect(project.assembly.beats[0].voiceoverAssetPath).toContain(
      "assets/voiceover/",
    );

    expect(project.assembly.beats[1].shotId).toBe("shot_02");
    expect(project.assembly.beats[1].durationSeconds).toBe(4);
    expect(project.assembly.beats[1].startSeconds).toBe(5);
    expect(project.assembly.beats[1].stillAssetPath).toContain("assets/stills/");
    expect(project.assembly.beats[1].voiceoverAssetPath).toBeUndefined();

    expect(project.assembly.totalDurationSeconds).toBe(9);
    expect(voiceoverCalls).toEqual(["Tonight the long way would miss the train."]);

    const dir = join(config.dataDir, "projects", project.id);
    await access(join(dir, "assembly.json"));
    await access(join(dir, project.assembly.beats[0].stillAssetPath));
    await access(join(dir, project.assembly.beats[0].voiceoverAssetPath));
    await access(join(dir, project.assembly.beats[1].stillAssetPath));

    const onDisk = JSON.parse(await readFile(join(dir, "assembly.json"), "utf8"));
    expect(onDisk.totalDurationSeconds).toBe(9);

    const loaded = await store.getProject(project.id);
    expect(loaded?.assembly?.totalDurationSeconds).toBe(9);
    expect(loaded?.status).toBe("ready");
  });
});
