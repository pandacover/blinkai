# 10 — Provision OpenRouter API key for local dev

Type: task
Status: resolved
Blocked by: 02

## Question

Nothing to decide: follow the storage choice from [02 — OpenRouter API key supply and storage](./02-openrouter-api-key.md).

Checklist for the human (or agent where possible):

1. Ensure `.env.example` documents `OPENROUTER_API_KEY=` (empty value).
2. Create a gitignored app-root `.env` with a real `OPENROUTER_API_KEY` from https://openrouter.ai/keys.
3. Confirm the Bun server reads the var and hard-fails clearly when it is missing/invalid.
4. Record in the Answer where the key lives and how to rotate it — never commit the secret.

## Answer

- **Where:** app-root gitignored `.env` with `OPENROUTER_API_KEY` set (non-empty; not committed; not in git history).
- **Template:** committed `.env.example` documents `OPENROUTER_API_KEY=` and optional `BLINKAI_DATA_DIR=`.
- **Rotate:** replace the value in `.env` (or revoke the key at https://openrouter.ai/keys and paste a new one). Never commit `.env`.
- **Server hard-fail check:** deferred — no Bun/Hono app exists yet (map is still planning). Implement must hard-fail on missing/invalid key per [02](./02-openrouter-api-key.md) and [08](./08-bun-ts-app-topology.md).
