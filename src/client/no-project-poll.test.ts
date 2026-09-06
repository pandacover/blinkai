import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression for infinite GET /api/projects/:id polling.
 * User DevTools showed initiator App.tsx:115 = pollUntilReady's fetch in the
 * pre-wait=1 client. That loop must not return.
 */
describe("client Run must not poll Project status", () => {
  const source = readFileSync(join(import.meta.dir, "App.tsx"), "utf8");

  test("does not define pollUntilReady", () => {
    expect(source).not.toMatch(/\bpollUntilReady\b/);
  });

  test("does not while-loop fetch /api/projects/:id", () => {
    expect(source).not.toMatch(
      /while\s*\([^)]*\)\s*\{[\s\S]{0,400}?fetch\(\s*[`'"]\/api\/projects\/\$\{/,
    );
  });

  test("starts Runs with wait=1 (server completes Assembly)", () => {
    expect(source).toContain("/api/runs?wait=1");
  });
});
