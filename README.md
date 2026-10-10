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
| `pnpm run typecheck:app` | `tsc --noEmit` for app config                    |

    `pnpm run typecheck:spec`| `tsc --noEmit` for spec config                        |

| `pnpm run format` | Write Prettier formatting |
| `pnpm run format:check` | Check Prettier formatting |

## PrimeUI licence key

PrimeNG 22 is commercially licensed. PrimeKidz uses the free **Community License** — see
[`docs/decisions/0001-primeui-licence-posture.md`](docs/decisions/0001-primeui-licence-posture.md).

Put the key in the `PRIMEUI_LICENSE_KEY` environment variable. Nothing else needs to change:

| Context    | Where to set it                                                     |
| ---------- | ------------------------------------------------------------------- |
| Local      | copy [`.env.example`](.env.example) to `.env` — `.env` is untracked |
| CI         | GitHub Actions repository secret of the same name                   |
| Vercel     | project environment variable, Production and Preview scopes         |
| Cloudflare | build environment variable on whatever runs `pnpm run build`        |

Never commit the key. It is injected at build time by
[`scripts/with-primeui-license.mjs`](scripts/with-primeui-license.mjs) for `pnpm start` and
`pnpm run build`, and by [`vitest.config.ts`](vitest.config.ts) for the tests.

With no key the build, dev server and tests all still pass, and PrimeNG prints
`[PrimeUI] PrimeUI license is not configured.` **In a browser it also shows a red "Invalid PrimeUI
License" banner, so the key is required before release.** The banner lives in a closed shadow root
and the licence forbids removing it — supply a key rather than trying to hide it.

Because `providePrimeNG` runs client-side, the key is readable in the deployed bundle. That is how
PrimeTek's offline verification works and is not a leak.

## Quality gates

CI runs, in order: install → `format:check` → `typecheck:app` → `typecheck:spec` → `test:coverage` → `build`. Coverage
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
docs/decisions/            decision records
scripts/                   build wrappers
```

Business logic belongs in `src/app/core/**`, never in templates.

## Deployment

The app is a static SPA with an index fallback.

- Vercel: [`vercel.json`](vercel.json) — the Vercel GitHub integration is already connected to this
  repository and deploys on merge to `main`. CI does not run a deploy step and needs no Vercel token;
  `vercel.json` only supplies the install command, build command, output directory, and SPA rewrite.
- Cloudflare Workers static assets: [`wrangler.jsonc`](wrangler.jsonc) — committed as a fallback
  target. Nothing deploys it automatically.

Both serve from `dist/survey-viewer/browser`. No secrets are stored in this repository —
`PRIMEUI_LICENSE_KEY` is set on each deploy target, as described above.
