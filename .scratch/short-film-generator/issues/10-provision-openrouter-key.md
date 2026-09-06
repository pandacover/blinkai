# 10 — Provision OpenRouter API key for local dev

Type: task
Status: claimed
Blocked by: 02

## Question

Nothing to decide: follow the storage choice from [02 — OpenRouter API key supply and storage](./02-openrouter-api-key.md).

Checklist for the human (or agent where possible):

1. Ensure `.env.example` documents `OPENROUTER_API_KEY=` (empty value).
2. Create a gitignored app-root `.env` with a real `OPENROUTER_API_KEY` from https://openrouter.ai/keys.
3. Confirm the Bun server reads the var and hard-fails clearly when it is missing/invalid.
4. Record in the Answer where the key lives and how to rotate it — never commit the secret.


## Answer

_(fill on resolve: where the key landed, how to rotate it, any `.env.example` fields added—without committing secrets)_

## Comments

- Claimed by wayfinder session (ticket 10). AFK progress:
  - [x] `.env.example` at app root documents empty `OPENROUTER_API_KEY=` (and optional `BLINKAI_DATA_DIR`).
  - [x] `.gitignore` already ignores `.env` / `.env.*` while allowing `.env.example`.
  - [x] Throwaway Bun check `scripts/check-openrouter-env.ts` hard-fails with a clear `.env` / `.env.example` message when the key is missing or blank (product Hono server still deferred to `/implement` per map Notes).
  - [ ] **HITL remaining:** create a key at https://openrouter.ai/keys, put `OPENROUTER_API_KEY=...` in gitignored app-root `.env`, then reply so this ticket can be resolved (never paste the secret into chat or commit it).
