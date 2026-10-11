# Tasks: Survey Design System

**Branch**: `001-survey-management` | **Date**: 2026-10-11 | **Stage**: `/speckit-tasks`
**Author**: Solution Architect

**Input**: Design documents from `specs/004-survey-design-system/`

**Prerequisites**: [`plan.md`](./plan.md) (required), [`spec.md`](./spec.md) (user stories),
[`research.md`](./research.md), [`data-model.md`](./data-model.md),
[`contracts/design-tokens.md`](./contracts/design-tokens.md),
[`contracts/css-classes.md`](./contracts/css-classes.md)

**Constitution**: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) v1.0.0 — binding.

**Tests**: **Required, not optional.** User Story 3 — the automated contract spec — *is* the feature's own
enforcement mechanism (FR-096); it is not a follow-on verification step, it is deliverable work with its
own phase below. Principle IV's `pnpm vitest run --coverage` gate is unconditional; no test may be skipped
and no file added to `coverage.exclude` to make it pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, and no dependency on an incomplete task.
- **[Story]**: `[US1]`–`[US5]`, mapping to the five user stories in `spec.md`. Foundational and Polish
  tasks carry no story label, matching 001's convention for layers more than one story depends on.
- Every task names an exact file path and a done-condition that can be checked.

## Ownership

One implementing owner; two verifying owners, matching the parent issue's four-way split (PRI-53–PRI-56).

| Owner                | Owns                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Angular Engineer**   | Everything under `src/styles/**`, `src/styles.css`, and `src/app/theme/survey-viewer-preset.ts` (+ its spec). Phases 1–6. |
| **QA Engineer**        | Runs the gates, the reduced-motion/keyboard scenario (US4), and the 375px/1280px browser smoke test. Phase 7, T030–T034. |
| **Code Reviewer**      | Reviews after Phase 7 against D-001–D-006 and FR-083–FR-097, and writes no fix (Principle IV: spec, code, review are three different agents). |

The Solution Architect owns no task here: this stage hands the plan over.

## Path conventions

Single-project Angular SPA, per [`plan.md`](./plan.md) §Project Structure. All new files live under
`src/styles/`; the one exception is `src/app/theme/survey-viewer-preset.ts`. Test files sit beside their
subject as `*.spec.ts`.

## Why this task list is layer-first, not story-first

Constitution Principle II requires the contract (here: `contracts/design-tokens.md` and
`contracts/css-classes.md`) to be complete before implementation — already true, since this plan's Phase 1
output is those two files. Within implementation, every component class in Phase 4 depends on every token
in Phase 2 existing first, and User Story 1 ("a respondent sees a themed survey") is only true once Phases
2–6 are *all* done — there is no partial-token version of a themed survey. So this list is organised
**layer-first**: Phases 2–3 are the token/base layer every story depends on (no story label, same
rationale 001 used for its WP1–WP3), Phase 4 is the component layer that makes US1 visibly true, Phase 5
is the integration layer, Phase 6 is US3's own deliverable (the contract spec), and Phase 7 is where
US2/US4/US5 are verified against finished, running code.

---

## Phase 1: Setup

- [ ] **T001** Confirm no new runtime or dev dependency is required (`research.md` R5 explicitly rejects
      adding `postcss`). Done when `package.json` is unchanged by this feature.

*(Single confirmation task — there is no scaffolding step beyond what Phase 2 creates directly.)*

---

## Phase 2: Foundational — Tokens (blocks every later phase)

- [ ] **T002** Create `src/styles/tokens/primitives.css` implementing all ten subsections of
      `contracts/design-tokens.md` §1 (colour ×5 ramps, typography, spacing, radius, elevation, motion).
      Done when every token listed in §1 exists with the exact documented value, and no other literal
      colour/length/duration value appears anywhere in the file.
- [ ] **T003 [P]** Create `src/styles/tokens/semantic.css` implementing all of `contracts/design-tokens.md`
      §2. Done when every token listed in §2 exists, each value is a `var()` expression referencing only
      §1 primitives (directly or via another semantic token), and no literal value appears in the file.

---

## Phase 3: Base & Layout

*Depends on Phase 2.*

- [ ] **T004 [P]** Create `src/styles/base/reset.css` — a minimal modern reset (box-sizing, margin
      removal, media defaults), no `--ds-*` token usage required since a reset has no colour/spacing
      opinions of its own. Done when `html, body` margin/box-sizing rules currently inline in
      `src/styles.css` are relocated here unchanged.
- [ ] **T005 [P]** Create `src/styles/base/typography.css` implementing default element type (`body`,
      `h1`–`h6`, `p`, `a`) from the typography semantic tokens (`contracts/design-tokens.md` §2.3). Done
      when every font-family/size/weight/line-height value in the file is a `var(--ds-font-*|--ds-line-
      height-*)` reference.
- [ ] **T006 [P]** Create `src/styles/base/focus.css` with the `:where(a, button, input, select, textarea,
      [tabindex]):focus-visible` rule from `src/styles.css`, rebuilt from `--ds-color-focus-ring`,
      `--ds-size-focus-ring-width`, `--ds-size-focus-ring-offset`. Done when the old inline rule is
      removed from `src/styles.css` and this file reproduces it token-for-token.
- [ ] **T007 [P]** Create `src/styles/base/motion.css` with the single `@media (prefers-reduced-motion:
      reduce)` block (FR-095) that overrides every `--ds-motion-duration-*` token to near-zero at `:root`.
      Done when the block exists exactly once in `src/styles/**` and names all four duration tokens.
- [ ] **T008 [P]** Create `src/styles/layout/utilities.css` implementing `contracts/css-classes.md` §1
      (`.ds-container`, `.ds-stack` + modifiers, `.ds-cluster`, `.ds-visually-hidden`, `.ds-skip-link`).
      Done when every class in §1 exists, each sourcing colour/spacing/radius only from `--ds-*` tokens,
      and the old `.sv-shell`/`.sv-skip-link`/`.sv-visually-hidden` rules are removed from
      `src/styles.css` (they move to `compat.css` in Phase 5, not deleted outright).

---

## Phase 4: Components — User Story 1 (respondent sees a cohesive, on-brand, accessible survey)

**Goal**: every `.ds-*` component class in `contracts/css-classes.md` §2–§7 exists, token-driven, 44px
minimum targets where required.

**Independent Test** (from `spec.md`): load the customer-feedback demo survey and visually/automatically
confirm every card, button, choice tile, and the progress bar read from `--ds-*` tokens with the
maroon/gold/cream palette, at 375px and 1280px.

*Depends on Phase 2 (tokens). Each file below is independent of the others — safe to parallelise.*

- [ ] **T009 [P] [US1]** Create `src/styles/components/card.css` implementing `contracts/css-classes.md`
      §2 (`.ds-card`, `.ds-card--raised`).
- [ ] **T010 [P] [US1]** Create `src/styles/components/button.css` implementing §3 (`.ds-btn` and its four
      modifiers/states). Done when `.ds-btn`'s computed `min-height`/`min-width` is `44px`
      (`var(--ds-size-control-min)`) and its only animated properties are `transform`/`opacity` (FR-094).
- [ ] **T011 [P] [US1]** Create `src/styles/components/field.css` implementing §4 (`.ds-field` and its
      five elements/modifiers). Done when `.ds-input`'s min-height is `var(--ds-size-control-min)`.
- [ ] **T012 [P] [US1]** Create `src/styles/components/choice-tile.css` implementing §5 (`.ds-choice-tile`
      and its five elements/modifiers). Done when the tile's computed min block size is
      `var(--ds-size-control-min)` and the `--selected` modifier's only transitioned properties are
      `transform`/`opacity`.
- [ ] **T013 [P] [US1]** Create `src/styles/components/progress.css` implementing §6
      (`.ds-progress`/`__bar`/`__label`). Done when `.ds-progress__bar`'s fill transition animates
      `transform: scaleX(calc(var(--progress-fill-percent) / 100))`, not `width`/`inline-size` (FR-094),
      and `--progress-fill-percent` is consumed, never defined, in CSS (it is set inline per element by
      the consuming component — `contracts/css-classes.md` §6 explains why it is deliberately not
      `--ds-`-prefixed).
- [ ] **T014 [P] [US1]** Create `src/styles/components/feedback.css` implementing §7 (`.ds-alert` and its
      four tone modifiers), each tone using its matching `--ds-color-{tone}` / `--ds-color-{tone}-surface`
      pair from the verified contrast table.

---

## Phase 5: Integrations & Compat

*Depends on Phases 2–4 (the bridge and compat layer reference tokens/classes that must already exist).*

- [ ] **T015 [US1]** Create `src/styles/integrations/primeng-bridge.css` implementing all eleven rows of
      `contracts/design-tokens.md` §4. Done when every `--p-*` variable listed there is set to the
      documented `var(--ds-*)` value, at `:root` scope.
- [ ] **T016 [US1]** Update `src/app/theme/survey-viewer-preset.ts` so `maroonPalette` is generated from
      (or kept identical to and commented as sourced from) `tokens/primitives.css`'s `--ds-primitive-
      color-maroon-*` values, replacing its dependency on the now-deleted `src/styles/tokens.css`. Done
      when the hex values are unchanged (byte-for-byte) and the file's header comment points at
      `tokens/primitives.css` instead of `tokens.css`.
- [ ] **T017 [US1]** Update `src/app/theme/survey-viewer-preset.spec.ts`'s drift check to read
      `tokens/primitives.css` instead of the deleted `src/styles/tokens.css`. Done when the spec still
      fails if the preset's palette and the primitives file disagree.
- [ ] **T018 [US1]** Create `src/styles/compat.css` re-declaring every `--sv-*` custom property from the
      old `src/styles/tokens.css` as `var(--ds-*)` (per `data-model.md` `CompatAlias`), and re-declaring
      `.sv-shell`, `.sv-skip-link`, `.sv-visually-hidden` as aliases reproducing the computed styles of
      `.ds-container`, `.ds-skip-link`, `.ds-visually-hidden` respectively. Done when a CSS file that still
      references any pre-existing `--sv-*` name or `.sv-*` class renders identically to before this
      feature.
- [ ] **T019 [US1]** Delete `src/styles/tokens.css` (superseded by `tokens/primitives.css` +
      `tokens/semantic.css`, with `compat.css` carrying its old names forward).
- [ ] **T020 [US1]** Rewrite `src/styles.css` as the ordered `@import` manifest described in
      `research.md` R3 (PrimeFlex, then `tokens/primitives.css`, `tokens/semantic.css`, `base/*`,
      `layout/utilities.css`, `components/*`, `integrations/primeng-bridge.css`, `compat.css` last). Done
      when `pnpm ng build` succeeds and the file contains no rule of its own beyond the `@import`
      statements.

---

## Phase 6: User Story 3 — The system enforces itself (the contract spec)

**Goal**: one Vitest spec file that fails the build on any of the nine drift classes in FR-096, matching
`research.md` R5's approach.

**Independent Test** (from `spec.md`): introduce each of the nine drift classes one at a time into a
scratch CSS fixture, confirm the spec fails naming the specific rule and location, then remove it and
confirm green.

*Depends on Phases 2–5 (there must be real, finished CSS to check).*

- [ ] **T021 [US3]** Create `src/styles/design-system.contract.spec.ts` with the shared groundwork: glob
      and read every `src/styles/**/*.css` and `src/app/**/*.css` file as text; parse
      `contracts/design-tokens.md` and `contracts/css-classes.md` tables into the `DesignToken`/
      `ComponentClass`/`ContrastPair`/`PrimeNgBridgeEntry` shapes from `data-model.md`.
- [ ] **T022 [US3]** In the same file, test: no unresolved `var(--ds-*)` reference exists (FR-096a). Include
      one deliberately-broken fixture case.
- [ ] **T023 [US3]** Test: no literal colour value (hex/rgb/hsl/named, including inside `var()` fallbacks)
      exists outside `tokens/primitives.css` (FR-096b). Include a fixture case covering a `var()` fallback
      literal, per `spec.md`'s edge case for this.
- [ ] **T024 [US3]** Test: no raw length literal on a spacing-shaped property (`margin`, `padding`, `gap`,
      `inset`, and their longhands) exists outside `src/styles/tokens/` (FR-096c). Include one
      deliberately-broken fixture case (SC-034).
- [ ] **T025 [US3]** Test: every `--ds-*` token and `.ds-*` class in shipped CSS has a matching row in
      `contracts/*.md`, and every row in `contracts/*.md` exists in shipped CSS — both directions
      (FR-096d / SC-035). Include two deliberately-broken fixture cases, one per direction (SC-034).
- [ ] **T026 [US3]** Test: every documented `TokenScale` (colour ramps, the finite radius scale, the
      spacing scale, the font-size scale, the motion-duration scale) is strictly ascending by its
      `sortKey`, excluding named terminal values (`pill`, `full`) (FR-096e). Include one
      deliberately-broken fixture case (SC-034).
- [ ] **T027 [US3]** Test: every row in `contracts/design-tokens.md` §3 computes to at least its documented
      `minRatio` using the WCAG relative-luminance formula (FR-096f / SC-036). Include one
      deliberately-broken fixture case — a pair just under its threshold (SC-034).
- [ ] **T028 [US3]** Test: `base/motion.css` contains exactly one `@media (prefers-reduced-motion: reduce)`
      block overriding all four duration tokens (FR-096g), and every `transition`/`@keyframes` property
      list across `src/styles/**` and `src/app/**/*.css` contains only `transform` and/or `opacity`
      (FR-096h). Include two deliberately-broken fixture cases, one per rule (SC-034).
- [ ] **T029 [US3]** Test: every row in `contracts/design-tokens.md` §4 (PrimeNG bridge) is declared in
      `integrations/primeng-bridge.css` (FR-096i). Include one deliberately-broken fixture case — a
      bridge row with no matching declaration (SC-034). Done when T022–T029 all pass against the real
      shipped CSS from Phases 2–5 with zero manual exclusions, every one of the nine drift classes in
      FR-096 has at least one fixture proving the spec catches it (SC-034), and `pnpm vitest run
      src/styles --reporter=dot` is green.

---

## Phase 7: Verification & Polish

*Depends on Phase 6. Owned by QA Engineer (T030–T033) and Code Reviewer (T034).*

- [ ] **T030 [US5]** Run `pnpm vitest run src/app/features/survey --reporter=dot` and confirm every
      existing 001–003 spec passes unmodified — zero test files edited to tolerate a behavioural change
      (SC-037/SC-039's test-side half).
- [ ] **T031 [US4]** Manual/automated pass: with `prefers-reduced-motion: reduce` emulated, confirm every
      transition/animation in a themed survey page resolves in under 20ms (SC-038's measured threshold);
      with keyboard-only navigation, confirm a visible focus ring on every button, field, and choice tile.
- [ ] **T032 [US2]** Confirm (by inspection, since Phase 6 already proves the machine-checkable half via
      SC-035) that the companion implementation's diff touches only the files listed in `plan.md`
      §Project Structure — zero `.ts`/`.html` changes under `src/app/features/survey/**` (SC-039).
- [ ] **T033** Add/confirm an `axe-core` check against a themed survey page at 375px and 1280px reports
      zero WCAG 2.1 AA violations (SC-040), reusing the pattern already established by 001 (D20).
- [ ] **T034** Run the full gate sequence and record the output: `pnpm prettier --check .`, `pnpm tsc
      --noEmit`, `pnpm vitest run --coverage`, `pnpm ng build`, then the 375px/1280px browser smoke test.
      Code Reviewer reviews against D-001–D-006 and FR-083–FR-097 once all gates are green.

---

## Summary

34 tasks. T001 is a confirmation, not implementation work. T002–T020 (Phases 2–5) are the design system
itself. T021–T029 (Phase 6) are User Story 3's own deliverable — the contract spec. T030–T034 (Phase 7)
verify User Stories 2, 4, and 5 and run the project's standard gates.
