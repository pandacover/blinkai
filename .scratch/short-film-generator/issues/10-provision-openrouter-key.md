# 10 — Provision OpenRouter API key for local dev

Type: task
Status: open
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
