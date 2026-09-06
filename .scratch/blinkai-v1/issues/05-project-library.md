# 05: Project library

**What to build:** A solo filmmaker can list saved Projects, rename a Project’s display title without changing its opaque id, and reopen a Project into the Timeline Player without regenerating media.

**Blocked by:** 04 — Timeline Player for a Project

**Status:** ready-for-agent

- [ ] Library lists Projects from `BLINKAI_DATA_DIR` with display titles from metadata
- [ ] Rename updates display title only; folder id unchanged
- [ ] Reopen loads existing Brief/Film Plan/Assembly/assets into the Timeline Player
- [ ] Missing/corrupt Project fails loudly without deleting siblings
- [ ] Run/Project API tests cover list, rename, and get/reopen
