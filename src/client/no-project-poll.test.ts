import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression: unbounded pollUntilReady / watchRunProgress spammed GET /api/projects/:id
 * while Stills were in flight (looked like an infinite DevTools loop).
 * Progress must come from the Run NDJSON stream — never a Project GET poll loop.
 */
describe("client Run progress watching", () => {
  const source = readFileSync(join(import.meta.dir, "App.tsx"), "utf8");

  test("does not define poll helpers that GET Project status in a loop", () => {
    expect(source).not.toMatch(/async function pollUntilReady\b/);
    expect(source).not.toMatch(/function pollUntilReady\b/);
    expect(source).not.toMatch(/async function watchRunProgress\b/);
    expect(source).not.toMatch(/function watchRunProgress\b/);
  });

  test("starts Runs in stream mode (no async Project GET poll)", () => {
    expect(source).toContain("/api/runs?stream=1");
    expect(source).not.toContain("/api/runs?async=1");
  });

  test("consumes NDJSON status events from the Run stream", () => {
    expect(source).toContain("consumeRunStream");
    expect(source).toContain('includes("ndjson")');
    expect(source).toContain('type === "status"');
    expect(source).toContain('type === "done"');
    expect(source).toContain('type === "error"');
  });

  test("renders a Run progress stepper", () => {
    expect(source).toContain("run-progress");
    expect(source).toContain("RUN_STEPS");
  });
});
