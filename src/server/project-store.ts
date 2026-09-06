import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ulid } from "ulid";
import type { Brief, FilmPlan, ProjectId, ProjectMeta } from "../shared";

export type ProjectRecord = {
  id: ProjectId;
  displayTitle: string;
  createdAt: string;
  updatedAt: string;
  brief: Brief;
  filmPlan?: FilmPlan;
};

export type ProjectStore = {
  createProject(input: {
    brief: Brief;
    filmPlan: FilmPlan;
  }): Promise<ProjectRecord>;
  getProject(id: ProjectId): Promise<ProjectRecord | null>;
};

export function createProjectStore(dataDir: string): ProjectStore {
  const projectsDir = join(dataDir, "projects");

  async function writeJson(path: string, value: unknown) {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }

  return {
    async createProject({ brief, filmPlan }) {
      const id = `prj_${ulid()}` as ProjectId;
      const now = new Date().toISOString();
      const dir = join(projectsDir, id);
      await mkdir(join(dir, "assets", "stills"), { recursive: true });
      await mkdir(join(dir, "assets", "voiceover"), { recursive: true });
      await mkdir(join(dir, "assets", "clips"), { recursive: true });

      const meta: ProjectMeta = {
        id,
        displayTitle: filmPlan.title,
        createdAt: now,
        updatedAt: now,
      };

      await writeJson(join(dir, "meta.json"), meta);
      await writeJson(join(dir, "brief.json"), brief);
      await writeJson(join(dir, "film-plan.json"), filmPlan);

      return {
        ...meta,
        brief,
        filmPlan,
      };
    },

    async getProject(id) {
      const dir = join(projectsDir, id);
      try {
        const [meta, brief, filmPlan] = await Promise.all([
          readFile(join(dir, "meta.json"), "utf8").then(
            (text) => JSON.parse(text) as ProjectMeta,
          ),
          readFile(join(dir, "brief.json"), "utf8").then(
            (text) => JSON.parse(text) as Brief,
          ),
          readFile(join(dir, "film-plan.json"), "utf8").then(
            (text) => JSON.parse(text) as FilmPlan,
          ),
        ]);
        return {
          id: meta.id,
          displayTitle: meta.displayTitle,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
          brief,
          filmPlan,
        };
      } catch {
        return null;
      }
    },
  };
}
