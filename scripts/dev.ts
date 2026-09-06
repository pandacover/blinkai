#!/usr/bin/env bun
/**
 * Dev orchestrator: Bun/Hono API + Vite client.
 * Requires OPENROUTER_API_KEY in the environment or a root .env (Bun loads it).
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { exitOnBootFailure } from "../src/server/boot";
import { loadServerConfig } from "../src/server/env";

const appRoot = resolve(import.meta.dir, "..");

try {
  loadServerConfig(process.env as Record<string, string | undefined>, {
    appRoot,
  });
} catch (error) {
  exitOnBootFailure(error);
}

const children = [
  spawn("bun", ["run", "--watch", "src/server/index.ts"], {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  }),
  spawn("bun", ["x", "vite"], {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  }),
];

function shutdown(code = 0) {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });
}
