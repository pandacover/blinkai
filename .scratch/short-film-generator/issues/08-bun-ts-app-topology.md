# 08 — Bun and TypeScript app topology

Type: grilling
Status: resolved

## Question

What is the V1 app topology on Bun + TypeScript?

Decide server framework (or none), frontend approach (SPA vs server-rendered vs hybrid), and repo layout (single package vs workspace). Standing constraint: OpenRouter calls and API key stay server-side. This is a decision ticket—prefer a concrete recommended stack over an open survey.

## Answer

**V1 topology (locked):**

| Layer | Choice |
| --- | --- |
| **Repo layout** | Single package at repo root — one `package.json`, no workspaces / monorepo |
| **Runtime / package manager** | Bun (TypeScript throughout) |
| **Server** | [Hono](https://hono.dev/) on Bun — JSON API for Run/OpenRouter proxy routes; reads gitignored `.env` (`OPENROUTER_API_KEY`); serves the built SPA in local/prod |
| **Frontend** | Vite + React + TypeScript **SPA** (not SSR / not Next / not Remix) — Brief UI + Timeline Player live in the browser |
| **Shared code** | `src/shared/` for Film Plan types / Zod (or equivalent) imported by server and client |
| **Dev shape** | `bun run dev` runs Bun/Hono API + Vite client (proxy API in dev); production: Bun serves `dist/` + API |

**Suggested tree (guidance for `/to-spec`, not scaffolded here):**

```
/
  package.json
  .env / .env.example
  src/
    server/   # Hono app, OpenRouter routes, env hard-fail
    client/   # React SPA (Brief, Run progress, Timeline Player)
    shared/   # Film Plan + Brief types
  dist/       # Vite build output (served by Bun)
```

**Rejected for V1:** Next/Remix SSR hybrid (Timeline Player is client-native; key must stay off the bundle); raw `Bun.serve` alone (Hono is thin and typed); workspaces (one app, solo maintainer).

ADR: [`docs/adr/0001-bun-ts-app-topology.md`](../../../docs/adr/0001-bun-ts-app-topology.md).

## Comments

- Grilling skipped: standing constraints already forced Bun-server + browser Timeline Player + solo local app; user confirmed no further grilling needed. Locked recommended stack as-is.
