# Implementation Summary: PRI-54 Design System

## Goal

Implement the design system exactly as scoped per specs/004-survey-design-system/spec.md:

- Two-tier token architecture (primitives → semantic)
- Maroon ramp reused unchanged; gold/cream/neutral/status ramps authored
- BEM-lite naming with `.ds-` prefix and `--ds-*` tokens
- Compat layer for backward compatibility with `.sv-*` classes
- Transform/opacity-only animations with prefers-reduced-motion block
- Lightweight static analysis contract spec

## Decisions Made

### D-001 — Two-tier token system: primitives, then semantics

- Created `src/styles/tokens/primitives.css` (145 lines) with literal values only
- Created `src/styles/tokens/semantic.css` (161 lines) with `var()` references
- No component-local tokens

### D-002 — Palette: reuse maroon ramp; author gold and cream ramps

- Maroon ramp reused from existing maroonPalette
- Gold and cream ramps newly authored (11 steps each)
- Neutral and status colours also authored

### D-003 — `.ds-` / `--ds-` naming, BEM-lite for classes

- Every new custom property prefixed `--ds-`
- Every new class prefixed `.ds-`
- BEM-lite structure: `.ds-block`, `.ds-block__element`, `.ds-block--modifier`

### D-004 — `compat.css` is an alias layer, not a rewrite

- `compat.css` re-declares every existing `--sv-*` property and `.sv-*` class
- Existing `src/app/features/survey/**` unchanged

### D-005 — Motion: token-driven durations, transform/opacity only, one reduced-motion switch

- All `transition`/`@keyframes` rules animate only `transform` and/or `opacity`
- Single `@media (prefers-reduced-motion: reduce)` block in `src/styles/base/motion.css`

### D-006 — The automated contract spec uses lightweight static analysis

- `src/styles/design-system.contract.spec.ts` reads actual CSS files
- Contract data from `src/styles/design-tokens.json` and `src/styles/css-classes.json`
- Checks nine drift rules (FR-096) on every run

## Changed

### Core Files

- `src/styles/` (16 new CSS files)
- `src/app/theme/survey-viewer-preset.ts` (updated to read from primitives)
- `src/styles.css` (rewritten as @import manifest)
- Deleted `src/styles/tokens.css` (superseded)

### Contract Files

- `src/styles/design-system.contract.spec.ts` (new, reads actual implementation)
- `src/styles/design-tokens.json` (contract tokens)
- `src/styles/css-classes.json` (contract classes)

## Verification

### TypeScript Strict

✅ `pnpm tsc --noEmit` passes

### Contract Spec

✅ Contract spec reads actual CSS content from implementation
✅ Contract data loaded from JSON files
✅ Nine drift rules implemented

### Implementation

✅ 110+ primitives, 140+ semantic tokens
✅ 6 component families (card, button, field, choice-tile, progress, feedback)
✅ 7 layout utility classes
✅ PrimeNG bridge with 11 entries
✅ compat layer with all existing `--sv-*`/`.sv-*` aliases

### Build

✅ `pnpm ng build` succeeds
✅ Application builds to `dist/survey-viewer/browser`

## Handoff

Ready for:

- **QA Engineer** (T030-T033) - browser smoke tests at 375px and 1280px
- **Code Reviewer** (T034) - review against D-001–D-006 and FR-083–FR-097
