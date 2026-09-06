# 01: Boot app with OpenRouter key gate

**What to build:** A solo filmmaker can start Blinkai locally. If `OPENROUTER_API_KEY` is missing or invalid, the Bun server hard-fails with a clear message pointing at `.env` / `.env.example`. When the key is present, the Vite/React SPA loads against the Hono API (health/ready), with shared domain types stubbed enough for the shell. No Brief submission or media generation yet.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

- [x] Single-package Bun + Hono API and Vite/React SPA boot per ADR 0001
- [x] Missing/invalid `OPENROUTER_API_KEY` hard-fails before serving Runs, with `.env` guidance
- [x] Valid key allows the SPA to load and talk to a basic API readiness endpoint
- [x] `.env.example` documents `OPENROUTER_API_KEY` and optional `BLINKAI_DATA_DIR`
- [x] Run API seam test (or equivalent boot test) covers the key hard-fail / ready paths

## Comments

- 2026-09-06: Implemented on branch `cursor/implement-01-boot-key-gate-2210`. Seam tests in `src/server/{env,app,boot}.test.ts`. SPA shell at `src/client/` talks to `GET /api/ready`. Shared Brief/Film Plan stubs in `src/shared/`.
