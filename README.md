# Dynamic Survey Viewer

An Angular web app that renders multi-page surveys from validated JSON config, collects answers
(including 0–3 file attachments per question), validates them, and submits them through a typed
boundary. New surveys are added with a JSON file plus a manifest entry — no code change.

All work follows [Spec Kit](https://github.com/github/spec-kit). The project rules are in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

## Requirements

- Node.js 24+
- pnpm 12+

## Commands

| Command                  | What it does                                     |
| ------------------------ | ------------------------------------------------ |
| `pnpm install`           | Install dependencies                             |
| `pnpm start`             | Dev server on http://localhost:4200              |
| `pnpm run build`         | Production build to `dist/survey-viewer/browser` |
| `pnpm test`              | Unit tests (Vitest)                              |
| `pnpm run test:coverage` | Unit tests with coverage, fails under 80%        |
| `pnpm run typecheck`     | `tsc --noEmit` for app and spec configs          |
| `pnpm run format`        | Write Prettier formatting                        |
| `pnpm run format:check`  | Check Prettier formatting                        |

## Quality gates

CI runs, in order: install → `format:check` → `typecheck` → `test:coverage` → `build`. Coverage
must stay at or above 80%. Reviewers also run a browser smoke test at 375px and 1280px.

## Layout

```
src/app/core/models/       survey contract types
src/app/core/validators/   JSON config and answer validation
src/app/core/services/     survey loading and submission
src/app/theme/             maroon brand preset (design tokens only)
src/styles.css             global tokens and accessibility styles
.specify/                  Spec Kit templates, scripts, and the constitution
specs/NNN-feature-name/    per-feature Spec Kit artifacts
```

Business logic belongs in `src/app/core/**`, never in templates.

## Deployment

The app is a static SPA with an index fallback.

- Vercel: [`vercel.json`](vercel.json)
- Cloudflare Workers static assets: [`wrangler.jsonc`](wrangler.jsonc)

Both serve from `dist/survey-viewer/browser`. No secrets are stored in this repository.
