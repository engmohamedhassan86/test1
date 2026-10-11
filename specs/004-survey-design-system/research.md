# Research & Decisions: Survey Design System

**Branch**: `001-survey-management` | **Date**: 2026-10-11 | **Spec**: [`spec.md`](./spec.md)

Six decisions (D-001–D-006) are already recorded in `spec.md` because they shape user-visible scope and
testing (two-tier tokens, palette sourcing, naming, `compat.css`, motion, contract-spec tooling). This
file records the remaining implementation-level research needed before `data-model.md` and the contracts
can be written: the concrete hex/number values, the PrimeNG variable list, and the verification method.

## R1 — Gold and cream ramp values, and why these specific steps

**Decision**: Author gold (secondary) and cream (tertiary) as 11-step ramps (50–950), matching the shape
of the existing maroon ramp. Values are listed in full in `contracts/design-tokens.md` §Primitives.

**Method**: Every step intended for text/icon use was checked with a relative-luminance contrast
calculator (WCAG formula) against the two backgrounds it is expected to sit on (white `#ffffff` and
cream-200 `#FAF3EA`), before being accepted into the ramp. Steps that only ever appear as a fill, border,
or gradient stop (never as text) were not individually verified — they are checked instead as a
**contrast pair** wherever the catalogue pairs them with text (`contracts/design-tokens.md` §Verified
contrast pairs), which is the set the contract spec actually enforces (FR-096f).

**Result (selected pairs, see contracts for the full table)**:

| Pair                                                              | Ratio             | AA threshold             | Verdict                              |
| ----------------------------------------------------------------- | ----------------- | ------------------------ | ------------------------------------ |
| gold-700 `#8F661C` on white                                       | 5.14:1            | 4.5:1 (normal text)      | pass                                 |
| gold-700 `#8F661C` on cream-200                                   | 4.67:1            | 4.5:1                    | pass                                 |
| gold-600 `#B07F22` on white                                       | 3.56:1            | 3:1 (large text/UI only) | pass for large/UI, fails normal text |
| neutral-900 `#2B2320` on white/cream-200                          | 15.40:1 / 13.98:1 | 4.5:1                    | pass                                 |
| neutral-600 `#6B6259` (muted text) on white/cream-200             | 5.97:1 / 5.42:1   | 4.5:1                    | pass                                 |
| neutral-500 `#8A8072` (default border) on white/cream-200         | 3.88:1 / 3.52:1   | 3:1 (non-text UI)        | pass                                 |
| success-600/warning-700/error-700/info-700 on white and cream-200 | 4.84:1–6.77:1     | 4.5:1                    | pass                                 |

**Rejected**: a literal "metallic gold" (`#D4AF37`-class hue) as the text-bearing step. It reads closer to
2.9:1 against white — below even the large-text threshold — so it is reserved for gold-500/600
(fills, gradient stops, icon glyphs, large/bold labels ≥18.66px) and never used for normal body text.

## R2 — PrimeNG variables to bridge

**Decision**: `integrations/primeng-bridge.css` maps a fixed, enumerated list of PrimeNG (Aura theme)
CSS custom properties to `--ds-*` semantic tokens — the ones this app's actually-rendered PrimeNG
components (dropdown, checkbox, radiobutton, inputtext, button, message/toast) read for colour, surface,
text, border, radius, and focus. The full list is in `contracts/design-tokens.md` §PrimeNG bridge.

**Why an enumerated list, not "all of them"**: PrimeNG's Aura theme exposes several hundred `--p-*`
variables across every component it ships, most unused by this app. FR-096i only requires that variables
_this app actually depends on_ are mapped — an open-ended "every possible PrimeNG variable" requirement
would be unbounded and untestable. The enumerated list is itself the contract: the automated spec checks
exactly those names, and extending PrimeNG usage to a new component means extending the list first
(a one-line addition to the contract, then the bridge).

**Relationship to `survey-viewer-preset.ts`**: the preset already sets `--p-primary-*` and
`--p-highlight-*` correctly via `definePreset`. The bridge in this feature covers the variables the preset
does **not** set — surface/content/border/form-field/focus-ring — so the full PrimeNG surface matches the
design system without hand-tuning every one of those in TypeScript. `survey-viewer-preset.ts` itself is
updated (FR-083/D-002) to read its maroon values from `tokens/primitives.css`'s values, keeping one source
of truth instead of two files that must be kept in step by a drift-check spec.

## R3 — File layout inside each directory

**Decision**:

```
src/styles/
├── tokens/
│   ├── primitives.css        # literal values only: colour, type, space, radius, elevation, motion
│   └── semantic.css          # --ds-* role tokens, each var()-referencing a primitive
├── base/
│   ├── reset.css              # minimal modern reset
│   ├── typography.css         # default element type (body, h1–h6, p, a)
│   ├── focus.css               # focus-visible ring (replaces the rule inline in styles.css today)
│   └── motion.css              # the one @media (prefers-reduced-motion: reduce) block (FR-095)
├── layout/
│   └── utilities.css          # .ds-container / .ds-stack / .ds-cluster / .ds-visually-hidden / .ds-skip-link
├── components/
│   ├── card.css
│   ├── button.css
│   ├── field.css
│   ├── choice-tile.css
│   ├── progress.css
│   └── feedback.css
├── integrations/
│   └── primeng-bridge.css
└── compat.css
```

`src/styles.css` (the one file Angular actually loads, per `angular.json` §styles) becomes an ordered
`@import` manifest of the files above, replacing its current inline rules. Order: PrimeFlex, then
`tokens/primitives.css`, then `tokens/semantic.css`, then `base/*`, `layout/utilities.css`,
`components/*`, `integrations/primeng-bridge.css`, and `compat.css` last — so compatibility aliases can
reference anything defined earlier.

**Why no extra `index.css`**: `src/styles.css` already is the single entry point Angular's build loads
(`angular.json` → `"styles": ["src/styles.css"]`). An `src/styles/index.css` that `src/styles.css` then
imports would be one indirection with no caller other than itself — rejected as an unneeded seam.

## R4 — Spacing/radius/elevation/motion primitive values

**Decision**:

- **Spacing**: keep the eight existing `--sv-space-*` values unchanged (0, 0.25rem, 0.5rem, 0.75rem, 1rem,
  1.5rem, 2rem, 3rem — steps 0–7) and add two larger steps (4rem, 6rem — steps 8–9) for page-level
  rhythm the current scale has no room for. Ascending order is preserved by construction.
- **Radius**: `sm` 4px, `md` 8px, `lg` 12px, `xl` 16px — a strictly ascending finite scale — plus two
  named, non-numeric terminal values, `pill` (999px) and `full` (50%), documented separately because they
  are categorically "as round as geometrically possible for this shape," not a further step in the
  ascending sequence. The contract spec's ordering check (FR-096e) is scoped to the finite numeric
  members (`sm`…`xl`); `pill`/`full` are excluded by name, not by being silently out of order.
- **Elevation**: three steps — `resting` (cards at rest), `raised` (hover/active), `overlay`
  (dropdown panels, modals) — each a `box-shadow` primitive tinted with `neutral-900` at low alpha, not
  pure black, to match the warm palette.
- **Motion**: durations `instant` (0ms), `fast` (120ms), `base` (200ms), `slow` (320ms); easings
  `standard`, `decelerate`, `accelerate` as `cubic-bezier()` primitives.

**Why these numbers**: spacing and the maroon ramp are the two places continuity with the shipped app
matters most — changing either would visibly shift already-reviewed layouts. Radius and elevation follow
the reference image (rounded cards, soft shadow) without inventing more steps than the six component
families actually need. Motion durations are standard Material/Aura-adjacent values already familiar to
anyone who has touched PrimeNG's own transition tokens, so they compose predictably with un-bridged
PrimeNG animation.

## R5 — Contract-spec verification approach (expands D-006)

**Decision**: one Vitest spec file, `src/styles/design-system.contract.spec.ts` (or
`__fixtures__`-adjacent location the Angular Engineer picks, named in `tasks.md`), that:

1. Globs every `src/styles/**/*.css` and every `src/app/**/*.css` file as text.
2. Extracts: every `--ds-*` custom property _definition_ (`--ds-foo:`) and _usage_ (`var(--ds-foo`); every
   literal colour (`#[0-9a-f]{3,8}`, `rgb(`, `rgba(`, `hsl(`, `hsla(`, and the CSS named-colour list);
   every raw length on a spacing-shaped property (`margin`, `padding`, `gap`, `inset`, and their
   longhands); every class selector (`\.ds-[a-zA-Z0-9_-]+`); every `transition`/`@keyframes` property
   list.
3. Diffs token/class usage against `contracts/design-tokens.md` / `contracts/css-classes.md` (parsed as
   markdown tables), and diffs the primitive-only rule, the spacing-outside-tokens rule, and the
   compositor-only rule against `tokens/primitives.css` vs. the rest.
4. Computes contrast ratios for the pairs table in `contracts/design-tokens.md` using the same relative-
   luminance formula used in this research (no new dependency — about 15 lines of arithmetic).
5. Confirms a `prefers-reduced-motion: reduce` block exists and names at least the four duration tokens.
6. Confirms every PrimeNG variable in `contracts/design-tokens.md` §PrimeNG bridge appears as a property
   in `integrations/primeng-bridge.css` mapped to a `var(--ds-*)` value.

**Why one file, not nine**: the nine checks share the same CSS-reading and markdown-table-parsing
groundwork; splitting them into nine spec files would duplicate that setup nine times for no isolation
benefit — a single check's fixture-driven test cases (one broken-fixture case per drift class, per
User Story 3) give the same per-rule failure granularity inside one file.
