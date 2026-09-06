import type { Hono } from "hono";
import type { ProjectId } from "../shared";

export async function waitForProjectReady(
  app: Hono,
  projectId: ProjectId,
  options: { timeoutMs?: number; intervalMs?: number } = {},
) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const intervalMs = options.intervalMs ?? 20;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const response = await app.request(`/api/projects/${projectId}`);
    if (!response.ok) {
      throw new Error(`poll failed: ${response.status}`);
    }
    const body = await response.json();
    if (body.project.status === "ready") {
      return body.project;
    }
    if (body.project.status === "failed") {
      throw new Error("project failed");
    }
    await Bun.sleep(intervalMs);
  }
  throw new Error(`timed out waiting for project ${projectId}`);
}
