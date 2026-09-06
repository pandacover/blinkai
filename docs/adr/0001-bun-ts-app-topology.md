# Single-package Bun + Hono API with Vite React SPA

Blinkai V1 is a solo local tool that must keep `OPENROUTER_API_KEY` and all OpenRouter calls on a Bun server while the Timeline Player runs entirely in the browser (Web Audio + rAF). We lock a **single root package** (no workspaces), a **Hono app on Bun** for JSON API + static serving, and a **Vite + React + TypeScript SPA**—not Next/Remix SSR and not a monorepo—so the key never ships in the client bundle and package boundaries stay proportional to one app.

## Considered options

- **Next.js / Remix hybrid:** SSR adds little for a localhost Brief + Timeline Player; fights the Bun-first Destination.
- **Raw `Bun.serve` only:** viable, but Hono gives typed routes and middleware with negligible weight.
- **npm/pnpm workspaces (`apps/*`, `packages/*`):** premature for a solo V1 with one deployable surface.
