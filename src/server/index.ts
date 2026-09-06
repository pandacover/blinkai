import { resolve } from "node:path";
import { createApp } from "./app";
import { exitOnBootFailure } from "./boot";
import { loadServerConfig } from "./env";
import { createFakeOpenRouterPort } from "./fake-openrouter";
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
const useLive = process.env.BLINKAI_USE_LIVE_OPENROUTER === "1";
const openRouter = useLive
  ? createLiveOpenRouterPort({ apiKey: config.openRouterApiKey })
  : createFakeOpenRouterPort();
const app = createApp(config, { staticDir, openRouter });
const port = Number(process.env.PORT ?? 3000);

console.log(`Blinkai API listening on http://localhost:${port}`);
console.log(`Project data directory: ${config.dataDir}`);
console.log(
  useLive
    ? "OpenRouter: LIVE adapters (BLINKAI_USE_LIVE_OPENROUTER=1)"
    : "OpenRouter: FAKE adapters (set BLINKAI_USE_LIVE_OPENROUTER=1 for real models)",
);

export default {
  port,
  fetch: app.fetch,
};
