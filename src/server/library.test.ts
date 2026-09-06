import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";
import { loadServerConfig } from "./env";
import { createFakeOpenRouterPort } from "./fake-openrouter";
import { createProjectStore } from "./project-store";

const brief = {
  idea: "A lantern keeper lights the harbor before dawn.",
  durationTarget: "15s" as const,
  aspectRatio: "16:9" as const,
  includeClips: false,
};

describe("Project library API", () => {
  test("lists Projects, renames display title, and reopens without regenerating", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "blinkai-library-"));
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test",
      BLINKAI_DATA_DIR: dataDir,
    });
    const store = createProjectStore(config.dataDir);
    const app = createApp(config, {
      openRouter: createFakeOpenRouterPort(),
      store,
    });

    const created = await app.request("/api/runs?wait=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(brief),
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    const id = createdBody.project.id as string;
    const originalTitle = createdBody.project.displayTitle as string;

    const listed = await app.request("/api/projects");
    expect(listed.status).toBe(200);
    const listBody = await listed.json();
    expect(listBody.projects.some((p: { id: string }) => p.id === id)).toBe(true);

    const renamed = await app.request(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayTitle: "Harbor Lantern" }),
    });
    expect(renamed.status).toBe(200);
    const renamedBody = await renamed.json();
    expect(renamedBody.project.id).toBe(id);
    expect(renamedBody.project.displayTitle).toBe("Harbor Lantern");
    expect(renamedBody.project.displayTitle).not.toBe(originalTitle);

    const reopened = await app.request(`/api/projects/${id}`);
    expect(reopened.status).toBe(200);
    const reopenBody = await reopened.json();
    expect(reopenBody.project.filmPlan).toBeTruthy();
    expect(reopenBody.project.assembly).toBeTruthy();
    expect(reopenBody.project.assembly.beats.length).toBeGreaterThan(0);
  });
});
