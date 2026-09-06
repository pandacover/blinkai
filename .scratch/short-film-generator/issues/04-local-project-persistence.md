# 04 — Local Project persistence mechanism

Type: grilling
Status: resolved

## Question

Where do Projects live on disk or in the browser for V1 local save?

Options to decide among (or replace): Bun-managed folder under the repo or user home; browser IndexedDB / OPFS; downloadable project archive; hybrid. Constraint: regenerating Stills/Voiceover is expensive, so assets must round-trip with the Film Plan and Brief.

Resolution should name the store, the Project directory/object layout at a high level, and what is in/out of a saved Project.

## Answer

- **Store:** Bun server filesystem (not browser IndexedDB/OPFS, not zip-only).
- **Root:** `BLINKAI_DATA_DIR` env var, default `<app-root>/data`. Projects live at `{BLINKAI_DATA_DIR}/projects/`.
- **Folder id:** opaque `prj_<ulid>/` — display title comes from metadata, not the path.
- **Layout:**
  - `brief.json`
  - `film-plan.json`
  - `assembly.json` (timeline / playable manifest)
  - `assets/stills/`
  - `assets/voiceover/`
  - `assets/clips/` (only when Clip assets exist)
- **In:** Brief, Film Plan, generated assets, Assembly manifest.
- **Out:** API key, model caches, raw OpenRouter request/response logs.
- **Save:** autosave after expensive stages (Film Plan ready, asset batches, Assembly ready); optional display-title rename.
- **Cardinality:** one Project = one Run (matches glossary).
