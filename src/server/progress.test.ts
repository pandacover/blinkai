import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";
import { loadServerConfig } from "./env";
import { createFakeOpenRouterPort } from "./fake-openrouter";
import { createProjectStore } from "./project-store";
import { waitForProjectReady } from "./test-helpers";
import type { OpenRouterPort } from "./openrouter";

describe("Run API progress", () => {
  test("async Run exposes real status transitions via project polling", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-progress-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test",
      BLINKAI_DATA_DIR: dataDir,
    });

    let releaseStills!: () => void;
    const stillsGate = new Promise<void>((resolve) => {
      releaseStills = resolve;
    });

    const base = createFakeOpenRouterPort();
    const openRouter: OpenRouterPort = {
      planFilm: (input) => base.planFilm(input),
      async generateStill(input) {
        await stillsGate;
        return base.generateStill(input);
      },
      generateVoiceover: (input) => base.generateVoiceover(input),
      generateClip: (input) => base.generateClip!(input),
    };

    const app = createApp(config, {
      openRouter,
      store: createProjectStore(config.dataDir),
    });

    const created = await app.request("/api/runs?async=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idea: "Progress alley",
        durationTarget: "15s",
        aspectRatio: "16:9",
        includeClips: false,
      }),
    });
    expect(created.status).toBe(202);
    const createdBody = await created.json();
    expect(createdBody.project.filmPlan).toBeTruthy();
    expect(createdBody.project.assembly).toBeFalsy();
    expect(["planning", "stills"]).toContain(createdBody.project.status);

    await Bun.sleep(20);
    const mid = await app.request(`/api/projects/${createdBody.project.id}`);
    const midBody = await mid.json();
    expect(midBody.project.status).toBe("stills");

    releaseStills();
    const ready = await waitForProjectReady(app, createdBody.project.id);
    expect(ready.status).toBe("ready");
    expect(ready.assembly.beats.length).toBeGreaterThan(0);
  });

  test("default Run waits for Assembly (no client poll required)", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-wait-default-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test",
      BLINKAI_DATA_DIR: dataDir,
    });
    const app = createApp(config, {
      openRouter: createFakeOpenRouterPort(),
      store: createProjectStore(config.dataDir),
    });

    const response = await app.request("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idea: "Sync alley finish",
        durationTarget: "15s",
        aspectRatio: "16:9",
        includeClips: false,
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project.status).toBe("ready");
    expect(body.project.assembly?.beats?.length).toBeGreaterThan(0);
  });

  test("stream Run pushes status events then done (no Project GET needed)", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-stream-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test",
      BLINKAI_DATA_DIR: dataDir,
    });

    let releaseStills!: () => void;
    const stillsGate = new Promise<void>((resolve) => {
      releaseStills = resolve;
    });

    const base = createFakeOpenRouterPort();
    const openRouter: OpenRouterPort = {
      planFilm: (input) => base.planFilm(input),
      async generateStill(input) {
        await stillsGate;
        return base.generateStill(input);
      },
      generateVoiceover: (input) => base.generateVoiceover(input),
      generateClip: (input) => base.generateClip!(input),
    };

    const app = createApp(config, {
      openRouter,
      store: createProjectStore(config.dataDir),
    });

    const response = await app.request("/api/runs?stream=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idea: "Stream alley",
        durationTarget: "15s",
        aspectRatio: "16:9",
        includeClips: false,
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("ndjson");
    expect(response.body).toBeTruthy();

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const statuses: string[] = [];
    let doneProject: { status: string; assembly?: { beats: unknown[] } } | null =
      null;

    const readUntil = async (predicate: () => boolean) => {
      while (!predicate()) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as {
            type: string;
            status?: string;
            project?: { status: string; assembly?: { beats: unknown[] } };
            message?: string;
          };
          if (event.type === "status" && event.status) {
            statuses.push(event.status);
          }
          if (event.type === "done") {
            doneProject = event.project ?? null;
          }
          if (event.type === "error") {
            throw new Error(event.message ?? "stream error");
          }
        }
      }
    };

    await readUntil(() => statuses.includes("stills"));
    expect(statuses).toContain("planning");
    expect(statuses).toContain("stills");
    expect(doneProject).toBeNull();

    releaseStills();
    await readUntil(() => doneProject !== null);
    expect(statuses).toContain("voiceover");
    expect(statuses).toContain("ready");
    expect(doneProject?.status).toBe("ready");
    expect(doneProject?.assembly?.beats?.length).toBeGreaterThan(0);
    await reader.cancel();
  });

});
