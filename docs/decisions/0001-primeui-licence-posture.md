# 1. PrimeUI licensing posture: Community License

- Date: 2026-10-07
- Status: accepted
- Decided by: the PrimeKidz product owner, on issue PRI-9
- Scope: `primeng@22`, `@primeuix/themes@3`

## Context

PrimeNG was Apache-2.0 up to and including v19. From v22 it is part of **PrimeUI**, a commercial
family from PrimeTek Informatics. `primeng` and `@primeuix/themes` both declare
`"license": "SEE LICENSE IN LICENSE.md"`, and `@primeui/license-manager` arrives transitively and
verifies a key at startup.

Two tiers exist:

- **Community License (free)** — requires meeting _all_ of: under $1M USD annual gross revenue,
  fewer than 5 developers, fewer than 10 employees, under $3M USD outside funding. Individuals,
  students, non-profits and non-commercial open source also qualify. Needs a key and annual
  renewal.
- **Commercial License (paid)** — per developer, perpetual, with one year of updates.

Without a valid key the library is not merely noisy. `primeng/fesm2022/primeng-license.mjs` mounts
a red `Invalid PrimeUI License` banner, fixed bottom-right at `z-index: 2147483647`, inside a
**closed** shadow root. It fires from `providePrimeNG()` and again from every component extending
`BaseComponent`. A closed shadow root cannot be reached by any stylesheet or `::part` selector, and
the licence terms forbid removing licence mechanisms — so there is no legitimate way to hide it. A
licence banner over a children's survey page is a release blocker.

Dropping back to the last Apache-2.0 release is not an option that preserves the stack:
`primeng@22` peer-requires `@angular/*: ^22.1.0`, while PrimeNG 19 requires Angular 19. Rejecting
both tiers therefore means a different component library and an amendment to
`.specify/memory/constitution.md`, which names PrimeNG, `@primeuix/themes` and PrimeFlex.

## Decision

Use the **Community License**. PrimeKidz meets all four criteria. The constitution stands
unamended; PrimeNG 22 stays.

The key is supplied through the `PRIMEUI_LICENSE_KEY` environment variable at build time and
reaches `providePrimeNG({ license })` via `src/app/primeui-license.ts`. No tracked file holds a key
value.

## Consequences

- **The key is public after deploy.** `providePrimeNG` runs in the browser, so the key is inlined
  into the client bundle and anyone can read it with View Source. This is inherent to PrimeTek's
  model: verification is an offline Ed25519 signature check with no telemetry and no remote call.
  Holding the key as a secret still matters — it keeps the key out of git and out of pull requests
  — but nobody should later treat its presence in the bundle as a leak.
- **The key must be refreshed on every PrimeNG upgrade, not once a year.** The verifier compares
  the key's expiry against a `RELEASE_DATE` baked into the library (`2026-09-29` in 22.1.2) and
  reports `expired` when the library is newer than the key. Community keys get a 30-day grace
  period, after which the banner returns. Treat a PrimeNG version bump as needing a key check.
- **Community tier covers up to 4 developers.** Crossing any of the four thresholds — revenue,
  developers, employees, outside funding — moves PrimeKidz to the paid tier and this decision must
  be revisited.
- **An absent key stays harmless in development.** `providePrimeNG` skips registration for a falsy
  `license`, so the build, the dev server and the test suite all behave as they did before the key
  existed. The `[PrimeUI] PrimeUI license is not configured.` warning on stderr is expected and is
  deliberately not suppressed.

## Where the variable is set

| Context    | Where                                                               |
| ---------- | ------------------------------------------------------------------- |
| Local      | untracked `.env` — copy `.env.example`                              |
| CI         | GitHub Actions repository secret `PRIMEUI_LICENSE_KEY`              |
| Vercel     | project environment variable, for the Production and Preview scopes |
| Cloudflare | build environment variable on whatever runs `pnpm run build`        |

## The key in use

The owner supplied a key on PRI-9 on 2026-10-07. Its metadata, so a renewal can be recognised
without reading the key itself:

| Field  | Value                                  |
| ------ | -------------------------------------- |
| id     | `d5cf41a7-92d1-4db6-916c-39e375748d7f` |
| tier   | `community`                            |
| type   | `dev` (per-seat, perpetual)            |
| issued | 2026-10-07                             |
| expiry | 2027-10-07                             |

Verified against `@primeui/license-manager@1.1.0` with the `releaseDate: '2026-09-29'` that
`primeng@22.1.2` passes in: `{ valid: true, status: 'active', daysUntilExpiry: 364 }`. The
signature check is real, so this confirms the key, not just its shape.

The key is registered as the Paperclip company secret `PRIMEUI_LICENSE_KEY`, mirrored into a local
untracked `.env`, and set as the GitHub Actions repository secret by the owner on 2026-10-07. The
Vercel and Cloudflare project variables are still to be set, and only matter once a deploy target
exists; the build reads the same variable name in every case.

Because the expiry (2027-10-07) sits after the `RELEASE_DATE` of the PrimeNG in use
(`2026-09-29`), this key covers PrimeNG releases up to 2027-10-07. A PrimeNG release published
after that date reports `expired`, with a 30-day grace period, and needs a refreshed key.

## How the key is checked

`pnpm run check:license` (`scripts/check-primeui-license.mjs`) is the gate. It reads the key from
the environment or `.env`, then runs PrimeNG's own `@primeui/license-manager` against the
`RELEASE_DATE` it reads out of the installed `primeng` — so a PrimeNG upgrade cannot leave the
check validating against a stale date. It exits non-zero on a missing, inactive, grace-period or
tampered key, and prints only the key's id, tier, type and expiry, never the key.

With `--bundle <dir>` it also searches the built JavaScript for the key and for a surviving
`__PRIMEUI_LICENSE_KEY__` placeholder. This matters because `scripts/with-primeui-license.mjs`
deliberately tolerates a missing key: without this check a job with an unset secret produces a
green build and an artefact that paints the banner.

CI runs both forms — the first before the slow gates so a missing secret is reported in seconds,
the second after the build. So from now on a red CI job is the signal that the key is missing or
needs renewing, and a green one is proof the key reached the artefact.
