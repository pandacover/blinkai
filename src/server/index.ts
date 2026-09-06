import { resolve } from "node:path";
import { createApp } from "./app";
import { OpenRouterKeyError, loadServerConfig } from "./env";

const appRoot = resolve(import.meta.dir, "../..");

function printBootFailure(error: unknown): never {
  if (error instanceof OpenRouterKeyError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(`Blinkai failed to start: ${error.message}`);
  } else {
    console.error("Blinkai failed to start.");
  }
  process.exit(1);
}

let config;
try {
  config = loadServerConfig(process.env as Record<string, string | undefined>, {
    appRoot,
  });
} catch (error) {
  printBootFailure(error);
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
