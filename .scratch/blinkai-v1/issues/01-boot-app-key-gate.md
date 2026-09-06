# 01: Boot app with OpenRouter key gate

**What to build:** A solo filmmaker can start Blinkai locally. If `OPENROUTER_API_KEY` is missing or invalid, the Bun server hard-fails with a clear message pointing at `.env` / `.env.example`. When the key is present, the Vite/React SPA loads against the Hono API (health/ready), with shared domain types stubbed enough for the shell. No Brief submission or media generation yet.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Single-package Bun + Hono API and Vite/React SPA boot per ADR 0001
- [ ] Missing/invalid `OPENROUTER_API_KEY` hard-fails before serving Runs, with `.env` guidance
- [ ] Valid key allows the SPA to load and talk to a basic API readiness endpoint
- [ ] `.env.example` documents `OPENROUTER_API_KEY` and optional `BLINKAI_DATA_DIR`
- [ ] Run API seam test (or equivalent boot test) covers the key hard-fail / ready paths
