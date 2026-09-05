# blinkai agent notes

Greenfield short-film generator webapp. Stack intent: TypeScript, Bun, OpenRouter.

## Agent skills

Skills live in `.agents/skills/` (vendored from [mattpocock/skills](https://github.com/mattpocock/skills); see `.agents/skills/SOURCE.md`).

### Issue tracker

Local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default role strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/` (created lazily). See `docs/agents/domain.md`.

## Wayfinder

This effort is charted with `/wayfinder`. Plan decisions on the map; do not implement the product inside the map unless Notes explicitly say otherwise. After the map clears: `/to-spec` → `/to-tickets` → `/implement`.
