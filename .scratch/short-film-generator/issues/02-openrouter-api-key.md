# 02 — OpenRouter API key supply and storage

Type: grilling
Status: claimed

## Question

For a solo local Blinkai app, how does the user supply the OpenRouter API key, and where is it stored?

Consider: `.env` / server-only env, a first-run settings field written to local config, OS keychain, or paste-per-session. Constraint: the key must not be shipped in a public frontend bundle if the app is ever exposed beyond localhost.

Resolution should name the storage location, who reads it (Bun server vs browser), and the threat we are accepting.
