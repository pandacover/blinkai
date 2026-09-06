import { useEffect, useState } from "react";
import type { Brief } from "@shared";

type ReadyResponse = {
  ready: boolean;
  service: string;
};

type ApiStatus =
  | { kind: "loading" }
  | { kind: "ready"; service: string }
  | { kind: "error"; message: string };

const shellBrief: Brief = {
  idea: "",
  durationTarget: "15s",
  aspectRatio: "16:9",
  includeClips: false,
};

export function App() {
  const [status, setStatus] = useState<ApiStatus>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function checkReady() {
      try {
        const response = await fetch("/api/ready");
        if (!response.ok) {
          throw new Error(`API readiness failed (${response.status})`);
        }
        const body = (await response.json()) as ReadyResponse;
        if (!cancelled) {
          setStatus({ kind: "ready", service: body.service });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not reach the Blinkai API",
          });
        }
      }
    }

    void checkReady();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell">
      <header className="shell__header">
        <p className="shell__brand">Blinkai</p>
        <h1 className="shell__title">Short film generator</h1>
        <p className="shell__lede">
          Turn a Brief into an assembled Film. Brief submission arrives in the
          next slice — this shell only proves the app boots against the API.
        </p>
      </header>

      <section className="shell__status" aria-live="polite">
        {status.kind === "loading" && <p>Checking API readiness…</p>}
        {status.kind === "ready" && (
          <p>
            API ready (<code>{status.service}</code>). Shared Brief shape loaded
            for duration <code>{shellBrief.durationTarget}</code>.
          </p>
        )}
        {status.kind === "error" && (
          <p className="shell__error">
            API not reachable: {status.message}. Start the Bun server (`bun run
            dev:api`) and ensure <code>OPENROUTER_API_KEY</code> is set in{" "}
            <code>.env</code>.
          </p>
        )}
      </section>
    </main>
  );
}
