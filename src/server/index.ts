import { resolve } from "node:path";
import { createApp } from "./app";
import { exitOnBootFailure } from "./boot";
import { loadServerConfig } from "./env";

const appRoot = resolve(import.meta.dir, "../..");

let config;
try {
  config = loadServerConfig(process.env as Record<string, string | undefined>, {
    appRoot,
  });
} catch (error) {
  exitOnBootFailure(error);
}

const staticDir = resolve(appRoot, "dist");
const app = createApp(config, { staticDir });
const port = Number(process.env.PORT ?? 3000);

console.log(`Blinkai API listening on http://localhost:${port}`);
console.log(`Project data directory: ${config.dataDir}`);

export default {
  port,
  fetch: app.fetch,
};
