# 02 — OpenRouter API key supply and storage

Type: grilling
Status: resolved

## Question

For a solo local Blinkai app, how does the user supply the OpenRouter API key, and where is it stored?

Consider: `.env` / server-only env, a first-run settings field written to local config, OS keychain, or paste-per-session. Constraint: the key must not be shipped in a public frontend bundle if the app is ever exposed beyond localhost.

Resolution should name the storage location, who reads it (Bun server vs browser), and the threat we are accepting.

## Answer

- **Storage:** gitignored app-root `.env` with `OPENROUTER_API_KEY`; document the name in `.env.example` (no secret committed). `.gitignore` already allows `.env.example` while ignoring `.env`.
- **Reader:** Bun server only. The browser never receives the key; all OpenRouter calls go through server routes.
- **Missing / invalid key:** hard-fail at Run start with a clear message pointing at `.env` / `.env.example`. No in-app paste and no settings UI in V1.
- **Threat accepted:** anyone with filesystem access to the project can read `.env`; no OS keychain or encryption-at-rest in V1.

Unblocks [10 — Provision OpenRouter API key for local dev](./10-provision-openrouter-key.md).
