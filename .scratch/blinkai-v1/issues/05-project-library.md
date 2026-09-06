# 05: Project library

**What to build:** A solo filmmaker can list saved Projects, rename a Project’s display title without changing its opaque id, and reopen a Project into the Timeline Player without regenerating media.

**Blocked by:** 04 — Timeline Player for a Project

**Status:** ready-for-human

- [x] Library lists Projects from `BLINKAI_DATA_DIR` with display titles from metadata
- [x] Rename updates display title only; folder id unchanged
- [x] Reopen loads existing Brief/Film Plan/Assembly/assets into the Timeline Player
- [x] Missing/corrupt Project fails loudly without deleting siblings
- [x] Run/Project API tests cover list, rename, and get/reopen

## Comments

- 2026-09-06: GET /api/projects list, PATCH rename displayTitle, reopen via GET /api/projects/:id into Player; library UI.
