import { serveStatic } from "hono/bun";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Hono } from "hono";
import { ZodError } from "zod";
import type { ServerConfig } from "./env";
import { createFakeOpenRouterPort } from "./fake-openrouter";
import {
  BriefValidationError,
  type OpenRouterPort,
  parseBrief,
} from "./openrouter";
import {
  createProjectStore,
  type ProjectStore,
} from "./project-store";
import { runMediaPipeline } from "./run-pipeline";

export type CreateAppOptions = {
  /** Absolute path to Vite build output; enables SPA static serving when present. */
  staticDir?: string;
  openRouter?: OpenRouterPort;
  store?: ProjectStore;
};

export function createApp(
  config: ServerConfig,
  options: CreateAppOptions = {},
): Hono {
  const app = new Hono();
  const openRouter = options.openRouter ?? createFakeOpenRouterPort();
  const store = options.store ?? createProjectStore(config.dataDir);

  app.get("/api/ready", (c) =>
    c.json({
      ready: true,
      service: "blinkai",
    }),
  );

  app.post("/api/runs", async (c) => {
    try {
      const brief = parseBrief(await c.req.json());
      const filmPlan = await openRouter.planFilm({ brief });
      // Autosave after Film Plan
      let project = await store.createProject({
        brief,
        filmPlan,
        status: "planning",
      });
      // Stills + Voiceover (+ optional Clips later) → Assembly autosave
      project = await runMediaPipeline({
        project,
        filmPlan,
        openRouter,
        store,
      });
      return c.json({ project }, 201);
    } catch (error) {
      if (error instanceof BriefValidationError || error instanceof ZodError) {
        return c.json(
          {
            error: "invalid_brief",
            message:
              error instanceof BriefValidationError
                ? error.message
                : "Brief failed validation.",
          },
          400,
        );
      }
      throw error;
    }
  });

  app.get("/api/projects", async (c) => {
    const projects = await store.listProjects();
    return c.json({ projects });
  });

  app.get("/api/projects/:id", async (c) => {
    const id = c.req.param("id");
    if (!id.startsWith("prj_")) {
      return c.json({ error: "not_found" }, 404);
    }
    const project = await store.getProject(id as `prj_${string}`);
    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ project });
  });

  app.patch("/api/projects/:id", async (c) => {
    const id = c.req.param("id");
    if (!id.startsWith("prj_")) {
      return c.json({ error: "not_found" }, 404);
    }
    const body = await c.req.json();
    const displayTitle =
      typeof body.displayTitle === "string" ? body.displayTitle.trim() : "";
    if (!displayTitle) {
      return c.json(
        { error: "invalid_title", message: "displayTitle is required." },
        400,
      );
    }
    try {
      const project = await store.updateProject(id as `prj_${string}`, {
        displayTitle,
      });
      return c.json({ project });
    } catch {
      return c.json({ error: "not_found" }, 404);
    }
  });

  // Serve Project assets for the Timeline Player
  app.get("/api/projects/:id/assets/*", async (c) => {
    const id = c.req.param("id");
    if (!id.startsWith("prj_")) {
      return c.json({ error: "not_found" }, 404);
    }
    const assetPath = c.req.path.replace(`/api/projects/${id}/`, "");
    if (!assetPath.startsWith("assets/") || assetPath.includes("..")) {
      return c.json({ error: "not_found" }, 404);
    }
    const file = Bun.file(`${store.projectDir(id as `prj_${string}`)}/${assetPath}`);
    if (!(await file.exists())) {
      return c.json({ error: "not_found" }, 404);
    }
    return new Response(file);
  });

  const staticDir = options.staticDir;
  if (staticDir && existsSync(staticDir)) {
    app.use("/*", serveStatic({ root: staticDir }));
    app.get("*", async (c, next) => {
      await next();
      if (c.res.status === 404) {
        const index = Bun.file(resolve(staticDir, "index.html"));
        if (await index.exists()) {
          return c.html(await index.text());
        }
      }
    });
  }

  return app;
}
