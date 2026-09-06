import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dir, "../..");
const serverEntry = resolve(appRoot, "src/server/index.ts");

describe("server boot hard-fail", () => {
  test("exits non-zero with .env guidance when OPENROUTER_API_KEY is unset", async () => {
    const proc = Bun.spawn(["bun", "run", serverEntry], {
      cwd: appRoot,
      env: {
        ...process.env,
        OPENROUTER_API_KEY: "",
        PORT: "0",
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stderr, exitCode] = await Promise.all([
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("OPENROUTER_API_KEY");
    expect(stderr).toContain(".env");
    expect(stderr).toContain(".env.example");
  });
});
