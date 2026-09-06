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

export type AppEnv = {
  Variables: {
    config: ServerConfig;
  };
};

export type CreateAppOptions = {
  /** Absolute path to Vite build output; enables SPA static serving when present. */
  staticDir?: string;
  openRouter?: OpenRouterPort;
  store?: ProjectStore;
};

export function createApp(
  config: ServerConfig,
  options: CreateAppOptions = {},
): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const openRouter = options.openRouter ?? createFakeOpenRouterPort();
  const store = options.store ?? createProjectStore(config.dataDir);

  app.use("*", async (c, next) => {
    c.set("config", config);
    await next();
  });

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
      const project = await store.createProject({ brief, filmPlan });
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
