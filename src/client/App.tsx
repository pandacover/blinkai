import { useEffect, useState, type FormEvent } from "react";
import type { AspectRatio, Brief, DurationTarget, FilmPlan, ProjectId } from "@shared";

type ReadyResponse = {
  ready: boolean;
  service: string;
};

type ApiStatus =
  | { kind: "loading" }
  | { kind: "ready"; service: string }
  | { kind: "error"; message: string };

type ProjectView = {
  id: ProjectId;
  displayTitle: string;
  brief: Brief;
  filmPlan?: FilmPlan;
};

type BriefFormState = {
  idea: string;
  durationTarget: DurationTarget;
  mood: string;
  visualStyle: string;
  aspectRatio: AspectRatio;
  includeClips: boolean;
};

const initialBrief: BriefFormState = {
  idea: "",
  durationTarget: "15s",
  mood: "",
  visualStyle: "",
  aspectRatio: "16:9",
  includeClips: false,
};

export function App() {
  const [status, setStatus] = useState<ApiStatus>({ kind: "loading" });
  const [form, setForm] = useState<BriefFormState>(initialBrief);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectView | null>(null);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message ?? "Could not start Run");
      }
      setProject(body.project as ProjectView);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not start Run",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <header className="shell__header">
        <p className="shell__brand">Blinkai</p>
        <h1 className="shell__title">Short film generator</h1>
        <p className="shell__lede">
          Write a Brief, start a Run, and inspect the Film Plan before media
          generation.
        </p>
      </header>

      <section className="shell__status" aria-live="polite">
        {status.kind === "loading" && <p>Checking API readiness…</p>}
        {status.kind === "ready" && (
          <p>
            API ready (<code>{status.service}</code>).
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

      {status.kind === "ready" && (
        <form className="brief" onSubmit={onSubmit}>
          <label className="brief__field">
            <span>Idea</span>
            <textarea
              required
              rows={4}
              value={form.idea}
              onChange={(event) =>
                setForm((current) => ({ ...current, idea: event.target.value }))
              }
              placeholder="A courier cuts through a rainy neon alley to catch the last train."
            />
          </label>

          <div className="brief__row">
            <label className="brief__field">
              <span>Duration Target</span>
              <select
                value={form.durationTarget}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationTarget: event.target.value as DurationTarget,
                  }))
                }
              >
                <option value="15s">15s</option>
                <option value="30s">30s</option>
              </select>
            </label>

            <label className="brief__field">
              <span>Aspect Ratio</span>
              <select
                value={form.aspectRatio}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    aspectRatio: event.target.value as AspectRatio,
                  }))
                }
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
            </label>
          </div>

          <label className="brief__field">
            <span>Mood (optional)</span>
            <input
              value={form.mood}
              onChange={(event) =>
                setForm((current) => ({ ...current, mood: event.target.value }))
              }
              placeholder="tense, hopeful"
            />
          </label>

          <label className="brief__field">
            <span>Visual Style (optional)</span>
            <input
              value={form.visualStyle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  visualStyle: event.target.value,
                }))
              }
              placeholder="neon noir, watercolor"
            />
          </label>

          <label className="brief__check">
            <input
              type="checkbox"
              checked={form.includeClips}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  includeClips: event.target.checked,
                }))
              }
            />
            <span>Include Clips</span>
          </label>

          {submitError && <p className="shell__error">{submitError}</p>}

          <button className="brief__submit" type="submit" disabled={submitting}>
            {submitting ? "Planning…" : "Start Run"}
          </button>
        </form>
      )}

      {project?.filmPlan && (
        <section className="plan" aria-label="Film Plan">
          <h2 className="plan__title">{project.filmPlan.title}</h2>
          <p className="plan__logline">{project.filmPlan.logline}</p>
          <p className="plan__meta">
            Project <code>{project.id}</code> · {project.filmPlan.durationTarget}{" "}
            · {project.filmPlan.aspectRatio}
            {project.filmPlan.includeClips ? " · Include Clips" : ""}
          </p>
          <ol className="plan__shots">
            {project.filmPlan.shots.map((shot) => (
              <li key={shot.id} className="plan__shot">
                <p className="plan__shot-id">{shot.id}</p>
                <p>
                  <strong>Still:</strong> {shot.stillPrompt}
                </p>
                <p>
                  <strong>Voiceover:</strong>{" "}
                  {shot.voiceover || <em>(silent)</em>}
                </p>
                {shot.clipPrompt && (
                  <p>
                    <strong>Clip:</strong> {shot.clipPrompt}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
