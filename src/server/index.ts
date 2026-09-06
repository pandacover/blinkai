import { resolve } from "node:path";
import { createApp } from "./app";
import { exitOnBootFailure } from "./boot";
import { loadServerConfig } from "./env";
import { createLiveOpenRouterPort } from "./live-openrouter";

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
const openRouter = createLiveOpenRouterPort({
  apiKey: config.openRouterApiKey,
});
const app = createApp(config, { staticDir, openRouter });
const port = Number(process.env.PORT ?? 3000);

console.log(`Blinkai API listening on http://localhost:${port}`);
console.log(`Project data directory: ${config.dataDir}`);
console.log("OpenRouter: live adapters (tests still inject the fake port)");

export default {
  port,
  fetch: app.fetch,
};
