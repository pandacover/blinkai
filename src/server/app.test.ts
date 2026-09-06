import { describe, expect, test } from "bun:test";
import { createApp } from "./app";
import { loadServerConfig } from "./env";

describe("API readiness", () => {
  test("GET /api/ready reports ready when the key gate has passed", async () => {
    const config = loadServerConfig({
      OPENROUTER_API_KEY: "sk-or-test-key",
      BLINKAI_DATA_DIR: "/tmp/blinkai-ready-test",
    });
    const app = createApp(config);

    const response = await app.request("/api/ready");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      ready: true,
      service: "blinkai",
    });
  });
});
