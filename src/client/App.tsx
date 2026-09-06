import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  Assembly,
  AspectRatio,
  Brief,
  DurationTarget,
  FilmPlan,
  ProjectId,
  ProjectMeta,
  ProjectStatus,
} from "@shared";
import { TimelinePlayer } from "./TimelinePlayer";

type ReadyResponse = { ready: boolean; service: string };

type ApiStatus =
  | { kind: "loading" }
  | { kind: "ready"; service: string }
  | { kind: "error"; message: string };

type ProjectView = {
  id: ProjectId;
  displayTitle: string;
  status: ProjectStatus;
  brief: Brief;
  filmPlan?: FilmPlan;
  assembly?: Assembly;
};

type BriefFormState = {
  idea: string;
  durationTarget: DurationTarget;
  mood: string;
  visualStyle: string;
  aspectRatio: AspectRatio;
  includeClips: boolean;
};

type RunStage = "idle" | "planning" | "stills" | "voiceover" | "clips" | "ready";

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
  const [runStage, setRunStage] = useState<RunStage>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [library, setLibrary] = useState<ProjectMeta[]>([]);
  const [renameValue, setRenameValue] = useState("");
  const [view, setView] = useState<"create" | "library" | "player">("create");

  async function refreshLibrary() {
    const response = await fetch("/api/projects");
    if (!response.ok) return;
    const body = await response.json();
    setLibrary(body.projects as ProjectMeta[]);
  }

  useEffect(() => {
    let cancelled = false;
    async function checkReady() {
      try {
        const response = await fetch("/api/ready");
        if (!response.ok) throw new Error(`API readiness failed (${response.status})`);
        const body = (await response.json()) as ReadyResponse;
        if (!cancelled) setStatus({ kind: "ready", service: body.service });
        await refreshLibrary();
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

  const stageLabel = useMemo(() => {
    switch (runStage) {
      case "planning":
        return "Planning Film Plan…";
      case "stills":
        return "Generating Stills…";
      case "voiceover":
        return "Generating Voiceover…";
      case "clips":
        return "Generating Clips…";
      case "ready":
        return "Assembly ready";
      default:
        return null;
    }
  }, [runStage]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    setRunStage("planning");
    const stageTimer = window.setTimeout(() => setRunStage("stills"), 200);
    const stageTimer2 = window.setTimeout(() => setRunStage("voiceover"), 500);
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
      setRunStage("ready");
      setProject(body.project as ProjectView);
      setRenameValue((body.project as ProjectView).displayTitle);
      setView("player");
      await refreshLibrary();
    } catch (error) {
      setRunStage("idle");
      setSubmitError(
        error instanceof Error ? error.message : "Could not start Run",
      );
    } finally {
      window.clearTimeout(stageTimer);
      window.clearTimeout(stageTimer2);
      setSubmitting(false);
    }
  }

  async function openProject(id: ProjectId) {
    const response = await fetch(`/api/projects/${id}`);
    const body = await response.json();
    if (!response.ok) {
      setSubmitError(body.message ?? "Could not open Project");
      return;
    }
    setProject(body.project as ProjectView);
    setRenameValue((body.project as ProjectView).displayTitle);
    setView("player");
  }

  async function renameProject() {
    if (!project || !renameValue.trim()) return;
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayTitle: renameValue.trim() }),
    });
    const body = await response.json();
    if (!response.ok) {
      setSubmitError(body.message ?? "Could not rename Project");
      return;
    }
    setProject(body.project as ProjectView);
    await refreshLibrary();
  }

  return (
    <main className="shell">
      <header className="shell__header">
        <p className="shell__brand">Blinkai</p>
        <h1 className="shell__title">Short film generator</h1>
        <p className="shell__lede">
          Brief → Film Plan → Stills/Voiceover Assembly → Timeline Player.
        </p>
        <nav className="shell__nav">
          <button type="button" onClick={() => setView("create")}>
            New Run
          </button>
          <button type="button" onClick={() => { void refreshLibrary(); setView("library"); }}>
            Library
          </button>
          {project?.assembly && (
            <button type="button" onClick={() => setView("player")}>
              Timeline Player
            </button>
          )}
        </nav>
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
            API not reachable: {status.message}. Start the Bun server and ensure{" "}
            <code>OPENROUTER_API_KEY</code> is set in <code>.env</code>.
          </p>
        )}
        {stageLabel && <p className="shell__stage">{stageLabel}</p>}
        {submitError && <p className="shell__error">{submitError}</p>}
      </section>

      {view === "create" && status.kind === "ready" && (
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
          <button className="brief__submit" type="submit" disabled={submitting}>
            {submitting ? "Running…" : "Start Run"}
          </button>
        </form>
      )}

      {view === "library" && (
        <section className="library" aria-label="Project library">
          <h2>Projects</h2>
          {library.length === 0 ? (
            <p>No saved Projects yet.</p>
          ) : (
            <ul className="library__list">
              {library.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => void openProject(item.id)}>
                    <strong>{item.displayTitle}</strong>
                    <span>
                      <code>{item.id}</code> · {item.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view === "player" && project && (
        <section className="project" aria-label="Project">
          <div className="project__rename">
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              aria-label="Display title"
            />
            <button type="button" onClick={() => void renameProject()}>
              Rename
            </button>
          </div>
          <p className="plan__meta">
            <code>{project.id}</code> · {project.status}
            {project.filmPlan
              ? ` · ${project.filmPlan.durationTarget} · ${project.filmPlan.aspectRatio}`
              : ""}
          </p>
          {project.filmPlan && (
            <div className="plan">
              <h2 className="plan__title">{project.filmPlan.title}</h2>
              <p className="plan__logline">{project.filmPlan.logline}</p>
              <p className="plan__meta">
                {project.filmPlan.durationTarget} · {project.filmPlan.aspectRatio}
                {project.filmPlan.includeClips ? " · Include Clips" : " · Stills + Voiceover"}
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
            </div>
          )}
          {project.assembly ? (
            <TimelinePlayer projectId={project.id} assembly={project.assembly} filmPlan={project.filmPlan} />
          ) : (
            <p>Assembly not ready yet.</p>
          )}
        </section>
      )}
    </main>
  );
}
