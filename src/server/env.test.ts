import { describe, expect, test } from "bun:test";
import { OpenRouterKeyError, loadServerConfig } from "./env";

describe("OpenRouter key gate", () => {
  test("hard-fails when OPENROUTER_API_KEY is missing", () => {
    expect(() =>
      loadServerConfig({
        OPENROUTER_API_KEY: undefined,
      }),
    ).toThrow(OpenRouterKeyError);

    try {
      loadServerConfig({ OPENROUTER_API_KEY: undefined });
    } catch (error) {
      expect(error).toBeInstanceOf(OpenRouterKeyError);
      expect((error as Error).message).toContain(".env");
      expect((error as Error).message).toContain(".env.example");
      expect((error as Error).message).toContain("OPENROUTER_API_KEY");
    }
  });

  test("hard-fails when OPENROUTER_API_KEY is blank", () => {
    expect(() =>
      loadServerConfig({
        OPENROUTER_API_KEY: "   ",
      }),
    ).toThrow(OpenRouterKeyError);
  });

  test("loads config when OPENROUTER_API_KEY is present", () => {
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test-key",
      BLINKAI_DATA_DIR: "/tmp/blinkai-test-data",
    });

    expect(config.openRouterApiKey).toBe("sk-or-test-key");
    expect(config.dataDir).toBe("/tmp/blinkai-test-data");
  });
});
