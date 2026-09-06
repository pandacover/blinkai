import { describe, expect, test } from "bun:test";
import {
  OPENROUTER_ROSTER,
  createLiveOpenRouterPort,
} from "./live-openrouter";

describe("Live OpenRouter adapter", () => {
  test("uses pinned roster ids and omits voice on Voiceover requests", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImpl = async (input: string, init?: RequestInit) => {
      const url = input;
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : {};
      calls.push({ url, body });
      if (url.endsWith("/chat/completions")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: "Live",
                    logline: "Live logline",
                    durationTarget: "15s",
                    aspectRatio: "16:9",
                    includeClips: false,
                    shots: [
                      {
                        id: "shot_01",
                        stillPrompt: "still",
                        voiceover: "line",
                        durationSeconds: 3,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/audio/speech")) {
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
      }
      if (url.endsWith("/images/generations")) {
        return new Response(
          JSON.stringify({ data: [{ b64_json: Buffer.from("img").toString("base64") }] }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    };

    const port = createLiveOpenRouterPort({
      apiKey: "sk-or-test",
      fetchImpl,
    });

    const plan = await port.planFilm({
      brief: {
        idea: "Harbor dawn",
        durationTarget: "15s",
        aspectRatio: "16:9",
        includeClips: false,
      },
    });
    expect(plan.title).toBe("Live");
    
    expect(OPENROUTER_ROSTER.filmPlan).toBe("deepseek/deepseek-v4-flash-0731");
    expect(OPENROUTER_ROSTER.stills).toBe("bytedance-seed/seedream-5-0-pro");
    expect(OPENROUTER_ROSTER.voiceover).toBe("hexgrad/kokoro-82m");
    expect(OPENROUTER_ROSTER.clips).toBe("google/veo-3.1-fast");
    expect(calls[0]!.body.model).toBe(OPENROUTER_ROSTER.filmPlan);

    await port.generateStill({ prompt: "pier" });
    expect(calls[1]!.body.model).toBe(OPENROUTER_ROSTER.stills);

    await port.generateVoiceover({ text: "hello" });
    expect(calls[2]!.body.model).toBe(OPENROUTER_ROSTER.voiceover);
    expect(calls[2]!.body).not.toHaveProperty("voice");
  });

  test("loud-fails when OpenRouter returns an error", async () => {
    const port = createLiveOpenRouterPort({
      apiKey: "sk-or-test",
      fetchImpl: async (_input: string, _init?: RequestInit) => new Response("nope", { status: 401 }),
    });
    await expect(
      port.planFilm({
        brief: {
          idea: "x",
          durationTarget: "15s",
          aspectRatio: "16:9",
          includeClips: false,
        },
      }),
    ).rejects.toThrow(/OPENROUTER_API_KEY|401/);
  });
});
