import { describe, expect, test } from "bun:test";
import { mkdtemp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";
import type { Brief, FilmPlan } from "../shared";
import type { OpenRouterPort } from "./openrouter";
import { loadServerConfig } from "./env";
import { createProjectStore } from "./project-store";

const tinyPng = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02,
  0xfe, 0xa7, 0x35, 0x81, 0x84, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

describe("Run API: optional Clips", () => {
  test("Include Clips on mixes Still-only and Clip Shots; Clip failure falls back to Still", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-clips-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test",
      BLINKAI_DATA_DIR: dataDir,
    });

    const brief: Brief = {
      idea: "Neon alley dash",
      durationTarget: "15s",
      aspectRatio: "16:9",
      includeClips: true,
    };

    const plan: FilmPlan = {
      title: "Neon Dash",
      logline: "A dash through neon rain.",
      durationTarget: "15s",
      aspectRatio: "16:9",
      includeClips: true,
      shots: [
        {
          id: "shot_01",
          stillPrompt: "Alley wide",
          voiceover: "Go.",
          durationSeconds: 3,
          clipPrompt: "Push into alley",
        },
        {
          id: "shot_02",
          stillPrompt: "Sneakers",
          voiceover: "",
          durationSeconds: 2,
          // no clipPrompt → Still-only
        },
        {
          id: "shot_03",
          stillPrompt: "Train doors",
          voiceover: "Made it.",
          durationSeconds: 3,
          clipPrompt: "FAIL_THIS_CLIP",
        },
      ],
    };

    const openRouter: OpenRouterPort = {
      async planFilm() {
        return plan;
      },
      async generateStill() {
        return { bytes: tinyPng, contentType: "image/png" };
      },
      async generateVoiceover({ text }) {
        return {
          bytes: new TextEncoder().encode(text),
          contentType: "audio/wav",
          durationSeconds: 2.5,
        };
      },
      async generateClip({ prompt, durationSeconds }) {
        if (prompt.includes("FAIL_THIS_CLIP")) {
          throw new Error("provider clip failure");
        }
        return {
          bytes: new TextEncoder().encode("fake-mp4"),
          contentType: "video/mp4",
          durationSeconds: Math.max(4, durationSeconds),
        };
      },
    };

    const store = createProjectStore(config.dataDir);
    const app = createApp(config, { openRouter, store });
    const response = await app.request("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(brief),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    const beats = body.project.assembly.beats;
    expect(beats[0].clipAssetPath).toContain("assets/clips/");
    expect(beats[1].clipAssetPath).toBeUndefined();
    expect(beats[2].clipAssetPath).toBeUndefined();
    expect(beats[2].clipFailed).toBe(true);
    expect(beats[0].stillAssetPath).toBeTruthy();
    expect(beats[2].stillAssetPath).toBeTruthy();

    await access(
      join(config.dataDir, "projects", body.project.id, beats[0].clipAssetPath),
    );
  });

  test("Include Clips off never writes clip assets", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-noclip-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test",
      BLINKAI_DATA_DIR: dataDir,
    });
    let clipCalls = 0;
    const openRouter: OpenRouterPort = {
      ...createPort(),
      async generateClip() {
        clipCalls += 1;
        return {
          bytes: new Uint8Array([1]),
          contentType: "video/mp4",
          durationSeconds: 4,
        };
      },
    };
    function createPort(): OpenRouterPort {
      return {
        async planFilm({ brief }) {
          return {
            title: "No Clips",
            logline: brief.idea,
            durationTarget: brief.durationTarget,
            aspectRatio: brief.aspectRatio,
            includeClips: false,
            shots: [
              {
                id: "shot_01",
                stillPrompt: "Still only",
                voiceover: "Hello",
                durationSeconds: 3,
              },
            ],
          };
        },
        async generateStill() {
          return { bytes: tinyPng, contentType: "image/png" };
        },
        async generateVoiceover() {
          return {
            bytes: new Uint8Array([1]),
            contentType: "audio/wav",
            durationSeconds: 2,
          };
        },
      };
    }

    const app = createApp(config, {
      openRouter,
      store: createProjectStore(config.dataDir),
    });
    const response = await app.request("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idea: "Quiet pier",
        durationTarget: "15s",
        aspectRatio: "16:9",
        includeClips: false,
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project.assembly.beats[0].clipAssetPath).toBeUndefined();
    expect(clipCalls).toBe(0);
  });
});
