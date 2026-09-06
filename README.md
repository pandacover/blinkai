# blinkai

Short film generator webapp (TypeScript, Bun, OpenRouter).

## Setup

1. Install [Bun](https://bun.sh).
2. `bun install`
3. Copy `.env.example` → `.env` and set `OPENROUTER_API_KEY` from https://openrouter.ai/keys.
4. Optional: set `BLINKAI_DATA_DIR` (defaults to `<app-root>/data`).

## Develop

```bash
bun run dev        # Hono API (:3000) + Vite SPA (:5173, proxies /api)
bun test           # Run API / boot seam tests
bun run build      # Vite → dist/
bun run start      # Bun serves API + built SPA
```

Missing or blank `OPENROUTER_API_KEY` hard-fails the Bun server with a message pointing at `.env` / `.env.example`.

## Layout

```
src/server/   # Hono app, env key gate, readiness
src/client/   # Vite + React SPA
src/shared/   # Brief / Film Plan / Project types
```

## Planning

This repo uses [Matt Pocock's engineering skills](https://github.com/mattpocock/skills), vendored under `.agents/skills/`.

Impl tickets: `.scratch/blinkai-v1/issues/`. See `AGENTS.md` and `docs/agents/` for tracker conventions.
