import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Progress watching is allowed, but must be bounded.
 * Regression: unbounded pollUntilReady at App.tsx:115 spammed GET /api/projects/:id.
 */
describe("client Run progress watching", () => {
  const source = readFileSync(join(import.meta.dir, "App.tsx"), "utf8");

  test("does not define an unbounded poll helper by the old name", () => {
    // Allow mentions in comments only if needed; forbid a live helper identifier.
    expect(source).not.toMatch(/async function pollUntilReady\b/);
    expect(source).not.toMatch(/function pollUntilReady\b/);
  });

  test("starts Runs in async mode so status steps can update live", () => {
    expect(source).toContain("/api/runs?async=1");
  });

  test("progress watch stops on ready, failed, and timeout", () => {
    expect(source).toContain("watchRunProgress");
    expect(source).toMatch(/status === "ready"/);
    expect(source).toMatch(/status === "failed"/);
    expect(source).toMatch(/timeoutMs\s*=\s*120_000/);
  });

  test("renders a Run progress stepper", () => {
    expect(source).toContain("run-progress");
    expect(source).toContain("RUN_STEPS");
  });
});
