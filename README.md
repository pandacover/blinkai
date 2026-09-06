# Blinkai

Solo local short-film generator: Brief → Film Plan → Stills/Voiceover/(optional Clips) → Assembly → Timeline Player.

## Stack

Single package: Bun + Hono API, Vite + React SPA, shared domain types. OpenRouter stays server-side.

## Setup

```bash
bun install
cp .env.example .env   # set OPENROUTER_API_KEY
bun run dev            # API :3000, Vite :5173
bun test
bun run typecheck
```

Optional: `BLINKAI_DATA_DIR` (default `./data`).

## Scripts

- `bun run dev` — API + Vite
- `bun run build` / `bun start` — production (Bun serves `dist/` + API; live OpenRouter port)
- `bun test` — Run API seam tests (fake OpenRouter port)

## Planning

Wayfinder / V1 tickets live under `.scratch/`. Agent skills under `.agents/skills/`.
