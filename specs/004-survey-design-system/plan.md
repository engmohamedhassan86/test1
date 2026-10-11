# Implementation Plan: Survey Design System

**Branch**: `001-survey-management` | **Date**: 2026-10-11 | **Spec**: [`spec.md`](./spec.md)
**Stage**: `/speckit-plan` | **Author**: Solution Architect
**Constitution**: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) v1.0.0

**Input**: Feature specification from [`specs/004-survey-design-system/spec.md`](./spec.md) — no open
clarifications.

**Phase artifacts**

| Artifact                                                     | Phase | Contents                                                                                                                                                                                      |
| ------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`research.md`](./research.md)                               | 0     | Five decisions (R1–R5): palette values and their contrast verification, the PrimeNG variable list, file layout, the remaining primitive scales, and the contract-spec's verification approach |
| [`data-model.md`](./data-model.md)                           | 1     | The catalogue's own typed shape: `DesignToken`, `TokenScale`, `ContrastPair`, `ComponentClass`, `CompatAlias`, `PrimeNgBridgeEntry`, and the validation-rule map                              |
| [`contracts/design-tokens.md`](./contracts/design-tokens.md) | 1     | The full token catalogue — primitives, semantics, verified contrast pairs, PrimeNG bridge                                                                                                     |
| [`contracts/css-classes.md`](./contracts/css-classes.md)     | 1     | The full class catalogue — layout, card, button, field, choice tile, progress, feedback                                                                                                       |
| [`quickstart.md`](./quickstart.md)                           | 1     | How to prove the feature works, gate by gate                                                                                                                                                  |
| `tasks.md`                                                   | 2     | **Not** produced here — `/speckit-tasks` owns it                                                                                                                                              |

## Summary

Replace the single `src/styles/tokens.css` + inline `src/styles.css` rules with a token-driven design
system: a two-tier `--ds-*` custom-property system (primitives, then semantic roles) for colour,
typography, spacing, radius, elevation and motion; base styles; layout utilities; six families of `.ds-*`
component classes; a PrimeNG CSS-variable bridge; and a `compat.css` alias layer so every existing
`--sv-*`/`.sv-*` reference in `src/app/features/survey/**` keeps working unchanged. An automated Vitest
contract spec enforces nine drift rules against this plan's two contract documents on every run.

The technical approach is contracts-first in the same sense as 001: `contracts/design-tokens.md` and
`contracts/css-classes.md` are the complete, checkable surface before any CSS is written, and
`data-model.md` gives the implementer (and the contract spec itself) a typed shape to parse those
documents against rather than inventing a table format ad hoc. Three structural choices carry the design:

1. **Two tiers, not three.** A primitive is a literal value; a semantic token is a role. No
   per-component token tier exists until a second caller needs one (`spec.md` D-001) — this is what makes
   "no literal colour outside `tokens/primitives.css`" (FR-096b) a small, checkable surface instead of an
   open-ended audit.
2. **`compat.css` makes the new system additive, not a rewrite.** Every existing `--sv-*` property and
   `.sv-*` class keeps resolving to the same rendered output, so this feature's companion implementation
   touches zero files under `src/app/features/survey/**` (FR-097/SC-039) — the "existing components keep
   their current structure" constraint is structural, not a promise kept by discipline.
3. **The contract spec is the design system's own immune system.** Every rule in FR-096 is checked against
   the two contract documents this plan produces, so "the catalogue is accurate" and "the catalogue is
   followed" are both machine-verified on every `pnpm vitest run`, not re-audited by a human each time a
   class is added.

## Technical Context

**Language/Version**: CSS custom properties (no preprocessor — the existing repo has none; introducing
Sass/Less for this feature would be a new build-tool dependency with no requirement driving it). TypeScript
6.0 only for the one touched file outside `src/styles/**`: `src/app/theme/survey-viewer-preset.ts`.

**Framework**: Angular 22.2 build pipeline (`angular.json` already loads `src/styles.css` as the sole
global stylesheet — no change to that wiring, only to its contents).

**Primary Dependencies**: None new. PrimeNG 22.1 / `@primeuix/themes` 3 (already present) is the surface
the PrimeNG bridge (§4 of `contracts/design-tokens.md`) targets. The contract spec is plain Vitest + hand-
written parsing (`research.md` R5) — no `postcss`, no CSS-in-JS, no Style Dictionary.

**Storage**: N/A — no data, no persistence.

**Testing**: Vitest 5, consistent with the rest of the repo. One new spec file
(`src/styles/design-system.contract.spec.ts`, exact path owned by `tasks.md`) plus `axe-core` runs (already
a devDependency, added by 001) against a themed page for SC-040. Coverage for `src/styles/**` itself is
N/A (CSS has no statements/branches); the contract spec's own TypeScript logic is covered under the
existing 80% gate like any other `src/app/**`-adjacent test code.

**Target Platform**: Same SPA, same two supported viewports (375px, 1280px), light theme only (dark mode
and `prefers-color-scheme` are out of scope per `spec.md`).

**Performance Goals**: No animation may touch a non-compositor CSS property (FR-094) — transitions stay on
the GPU-accelerated path on low-end mobile, consistent with Principle V's 375px-as-supported-target.

**Constraints**: Zero changes to `src/app/features/survey/**` templates/TypeScript (FR-097). Six existing
`--sv-space-*` values preserved byte-for-byte (FR-086). No new runtime dependency.

**Scale/Scope**: ~110 primitive tokens, ~140 semantic tokens (including the four re-exposed colour ramps),
28 component classes across 6 families plus 7 layout utility classes, 11 PrimeNG bridge entries, 23
verified contrast pairs — all enumerated in full in the two contracts.

## Constitution Check

_Gate: must pass before Phase 0 research. Re-checked after Phase 1 design — still passes, no deviation to
record._

- **Principle I (JSON-driven domain contract)**: not engaged — this feature touches no survey JSON, no
  `core/models`, no `core/validators`. Pass, N/A.
- **Principle II (feature isolation, contracts first)**: satisfied — `contracts/design-tokens.md` and
  `contracts/css-classes.md` are written and reviewed (this plan) before any CSS exists, matching the
  letter of the principle even though the "contract" here is a token/class catalogue rather than a
  TypeScript interface. Pass.
- **Principle III (validation before navigation/submit)**: not engaged — no answer/attachment/submission
  behaviour changes. Pass, N/A.
- **Principle IV (quality gates)**: satisfied by construction — the contract spec is itself a new,
  unconditional gate (FR-096), added to `pnpm vitest run --coverage`, and no existing gate is loosened.
  `research.md` R5 explicitly rejects adding a new devDependency the checks don't need, honouring the
  "no gate may be relaxed… to make a run pass" rule by not reaching for a bigger hammer than required. Pass.
- **Principle V (accessible, responsive, on-brand UX)**: this is the principle the feature most directly
  serves — every colour pairing used for text is contrast-verified (§3 of `contracts/design-tokens.md`),
  44px targets are a named token (FR-091), focus rings remain visible (FR-088), and the maroon brand
  continues to be expressed only through tokens, now with two more documented roles (gold, cream) under
  the same discipline. Pass.

No complexity-tracking entry is needed — no principle is violated or bent.

## Project Structure

### Documentation (this feature)

```text
specs/004-survey-design-system/
├── plan.md                     # this file
├── research.md                 # Phase 0 output
├── data-model.md                # Phase 1 output
├── quickstart.md                 # Phase 1 output
├── contracts/
│   ├── design-tokens.md          # Phase 1 output
│   └── css-classes.md             # Phase 1 output
├── checklists/
│   └── requirements.md            # /speckit-specify quality gate
└── tasks.md                        # Phase 2 output — /speckit-tasks, NOT produced here
```

### Source code (repository root)

Single-project Angular SPA, consistent with 001 §Project Structure — no new top-level directory, only new
content under the existing `src/styles/` and one existing file re-pointed:

```text
src/
├── styles.css                              # EDITED — becomes an ordered @import manifest
├── styles/
│   ├── tokens.css                            # DELETED — superseded by tokens/primitives.css + tokens/semantic.css
│   ├── tokens/
│   │   ├── primitives.css                      # NEW — literal values only (§1 of contracts/design-tokens.md)
│   │   └── semantic.css                         # NEW — --ds-* role tokens (§2)
│   ├── base/
│   │   ├── reset.css                            # NEW
│   │   ├── typography.css                        # NEW
│   │   ├── focus.css                              # NEW — replaces the inline focus-visible rule
│   │   └── motion.css                              # NEW — the one prefers-reduced-motion block (FR-095)
│   ├── layout/
│   │   └── utilities.css                           # NEW — §1 of contracts/css-classes.md
│   ├── components/
│   │   ├── card.css                                 # NEW — §2
│   │   ├── button.css                                # NEW — §3
│   │   ├── field.css                                  # NEW — §4
│   │   ├── choice-tile.css                             # NEW — §5
│   │   ├── progress.css                                 # NEW — §6
│   │   └── feedback.css                                  # NEW — §7
│   ├── integrations/
│   │   └── primeng-bridge.css                             # NEW — §4 of contracts/design-tokens.md
│   ├── compat.css                                          # NEW — --sv-*/.sv-* aliases (FR-093)
│   └── design-system.contract.spec.ts                       # NEW — the automated contract spec (FR-096)
└── app/
    └── theme/
        └── survey-viewer-preset.ts                            # EDITED — reads maroon values from tokens/primitives.css; its drift-check spec updated to compare against the new file instead of the deleted tokens.css
```

No file under `src/app/features/survey/**` is listed above: FR-097 requires none to change as a direct
result of this feature. Any component-level `*.css` file an engineer touches while adopting `--ds-*`/
`.ds-*` directly (optional, not required by this feature) is styling-only and does not appear in this
plan's required file list.

**Structure Decision**: single-project Angular SPA (unchanged from 001). The design system lives entirely
under `src/styles/`, organised exactly as the parent issue specifies
(`tokens/base/layout/components/integrations` + `compat.css`), plus one new spec file co-located under
`src/styles/` per this repo's "tests live beside the source" convention, and one existing TypeScript file
re-pointed to the new primitives.

## Complexity Tracking

_No entries — Constitution Check above has no violation to justify._
