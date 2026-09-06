import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ulid } from "ulid";
import type {
  Assembly,
  Brief,
  FilmPlan,
  ProjectId,
  ProjectMeta,
  ProjectStatus,
} from "../shared";

export type ProjectRecord = {
  id: ProjectId;
  displayTitle: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  brief: Brief;
  filmPlan?: FilmPlan;
  assembly?: Assembly;
};

export type ProjectStore = {
  createProject(input: {
    brief: Brief;
    filmPlan: FilmPlan;
    status?: ProjectStatus;
  }): Promise<ProjectRecord>;
  getProject(id: ProjectId): Promise<ProjectRecord | null>;
  listProjects(): Promise<ProjectMeta[]>;
  updateProject(
    id: ProjectId,
    patch: {
      displayTitle?: string;
      status?: ProjectStatus;
      filmPlan?: FilmPlan;
      assembly?: Assembly;
    },
  ): Promise<ProjectRecord>;
  writeAsset(
    id: ProjectId,
    relativePath: string,
    bytes: Uint8Array,
  ): Promise<string>;
  projectDir(id: ProjectId): string;
};

export function createProjectStore(dataDir: string): ProjectStore {
  const projectsDir = join(dataDir, "projects");

  async function writeJson(path: string, value: unknown) {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }

  function dirFor(id: ProjectId) {
    return join(projectsDir, id);
  }

  async function readRecord(id: ProjectId): Promise<ProjectRecord | null> {
    const dir = dirFor(id);
    try {
      const meta = JSON.parse(
        await readFile(join(dir, "meta.json"), "utf8"),
      ) as ProjectMeta;
      const brief = JSON.parse(
        await readFile(join(dir, "brief.json"), "utf8"),
      ) as Brief;
      let filmPlan: FilmPlan | undefined;
      let assembly: Assembly | undefined;
      try {
        filmPlan = JSON.parse(
          await readFile(join(dir, "film-plan.json"), "utf8"),
        ) as FilmPlan;
      } catch {
        filmPlan = undefined;
      }
      try {
        assembly = JSON.parse(
          await readFile(join(dir, "assembly.json"), "utf8"),
        ) as Assembly;
      } catch {
        assembly = undefined;
      }
      return {
        id: meta.id,
        displayTitle: meta.displayTitle,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
        // Incomplete on-disk Projects must not look "ready" (avoids UI/poll confusion).
        status:
          meta.status ??
          (assembly ? "ready" : filmPlan ? "planning" : "failed"),
        brief,
        filmPlan,
        assembly,
      };
    } catch {
      return null;
    }
  }

  return {
    projectDir: dirFor,

    async createProject({ brief, filmPlan, status = "planning" }) {
      const id = `prj_${ulid()}` as ProjectId;
      const now = new Date().toISOString();
      const dir = dirFor(id);
      await mkdir(join(dir, "assets", "stills"), { recursive: true });
      await mkdir(join(dir, "assets", "voiceover"), { recursive: true });
      await mkdir(join(dir, "assets", "clips"), { recursive: true });

      const meta: ProjectMeta = {
        id,
        displayTitle: filmPlan.title,
        createdAt: now,
        updatedAt: now,
        status,
      };

      await writeJson(join(dir, "meta.json"), meta);
      await writeJson(join(dir, "brief.json"), brief);
      await writeJson(join(dir, "film-plan.json"), filmPlan);

      return { ...meta, brief, filmPlan };
    },

    async getProject(id) {
      return readRecord(id);
    },

    async listProjects() {
      await mkdir(projectsDir, { recursive: true });
      const entries = await readdir(projectsDir, { withFileTypes: true });
      const metas: ProjectMeta[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith("prj_")) continue;
        try {
          const meta = JSON.parse(
            await readFile(join(projectsDir, entry.name, "meta.json"), "utf8"),
          ) as ProjectMeta;
          const record = await readRecord(entry.name as ProjectId);
          if (record) {
            metas.push({
              id: record.id,
              displayTitle: record.displayTitle,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
              status: record.status,
            });
          } else {
            metas.push(meta);
          }
        } catch (error) {
          throw new Error(
            `Project ${entry.name} is missing or corrupt: ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          );
        }
      }
      return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async updateProject(id, patch) {
      const current = await readRecord(id);
      if (!current) {
        throw new Error(`Project ${id} not found`);
      }
      const now = new Date().toISOString();
      const dir = dirFor(id);
      const meta: ProjectMeta = {
        id: current.id,
        displayTitle: patch.displayTitle ?? current.displayTitle,
        createdAt: current.createdAt,
        updatedAt: now,
        status: patch.status ?? current.status,
      };
      const filmPlan = patch.filmPlan ?? current.filmPlan;
      const assembly = patch.assembly ?? current.assembly;

      await writeJson(join(dir, "meta.json"), meta);
      if (patch.filmPlan) {
        await writeJson(join(dir, "film-plan.json"), patch.filmPlan);
      }
      if (patch.assembly) {
        await writeJson(join(dir, "assembly.json"), patch.assembly);
      }

      return {
        ...meta,
        brief: current.brief,
        filmPlan,
        assembly,
      };
    },

    async writeAsset(id, relativePath, bytes) {
      const path = join(dirFor(id), relativePath);
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, bytes);
      return relativePath;
    },
  };
}
