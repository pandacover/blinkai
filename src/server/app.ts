import { serveStatic } from "hono/bun";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Hono } from "hono";
import type { ServerConfig } from "./env";

export type AppEnv = {
  Variables: {
    config: ServerConfig;
  };
};

export type CreateAppOptions = {
  /** Absolute path to Vite build output; enables SPA static serving when present. */
  staticDir?: string;
};

export function createApp(
  config: ServerConfig,
  options: CreateAppOptions = {},
): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

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
