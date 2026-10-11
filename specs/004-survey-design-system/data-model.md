# Data Model: Survey Design System

**Branch**: `001-survey-management` | **Date**: 2026-10-11 | **Spec**: [`spec.md`](./spec.md)

This feature has no application/domain data model — no `Survey`, no `Answer`. Its "data" is the design
system's own catalogue: the tokens and classes it ships, and the rules the contract spec (FR-096) checks
them against. This file is the typed shape of that catalogue, so the contract spec in `tasks.md` has a
contract to parse against rather than inventing its own ad hoc table format.

## Entities

### `TokenTier`

```ts
type TokenTier = 'primitive' | 'semantic';
```

A `primitive` token is a literal value and may only be defined in `tokens/primitives.css`. A `semantic`
token's value is one or more `var()` references to primitive tokens (directly, or through another
semantic token) and may be defined anywhere under `tokens/semantic.css`.

### `DesignToken`

```ts
interface DesignToken {
  name: string; // '--ds-color-primary-700' — always starts '--ds-'
  tier: TokenTier;
  category: TokenCategory;
  value: string; // literal for primitive; a var() expression for semantic
  scale?: ScaleRef; // present if this token is one step of an ordered TokenScale
  usage: string; // one line: where/why this token is used
}

type TokenCategory = 'color' | 'typography' | 'spacing' | 'radius' | 'elevation' | 'motion';
```

Every `DesignToken` in this feature is catalogued as one row of a `contracts/design-tokens.md` table.
`contracts/design-tokens.md` is the canonical list — the contract spec treats "exists in CSS but not in
that file" and "in that file but not in CSS" as equally invalid (FR-096d / SC-035).

### `ScaleRef` / `TokenScale`

```ts
interface ScaleRef {
  scale: string; // e.g. 'color-primary', 'spacing', 'radius', 'font-size'
  step: string | number; // e.g. 700, 'sm', 4
  sortKey: number; // numeric value used to check ascending order
}
```

A `TokenScale` is the set of all `DesignToken`s sharing one `scale` name, ordered by `sortKey`. The
contract spec (FR-096e) asserts `sortKey` is strictly ascending in step-declaration order for every scale
that has one — colour ramps (50→950), the finite radius scale (`sm`→`xl`), the spacing scale (0→9), the
font-size scale, and the motion-duration scale. `pill`/`full` radius values and any token explicitly
marked as a non-scalar terminal value are excluded from this check (R4 in `research.md`).

### `ContrastPair`

```ts
interface ContrastPair {
  foreground: string; // a DesignToken name, resolved to its literal colour
  background: string; // a DesignToken name, resolved to its literal colour
  context: 'normal-text' | 'large-text' | 'non-text-ui';
  minRatio: 4.5 | 3; // 4.5 for normal-text, 3 for large-text/non-text-ui
}
```

Every `ContrastPair` is one row of `contracts/design-tokens.md` §Verified contrast pairs. The contract
spec computes the actual ratio from the two tokens' resolved literal colours and asserts it meets
`minRatio` (FR-096f / SC-036).

### `ComponentClass`

```ts
interface ComponentClass {
  selector: string; // '.ds-card', '.ds-choice-tile__title', '.ds-btn--primary'
  family: ClassFamily;
  kind: 'block' | 'element' | 'modifier';
  purpose: string; // one line
  requiredMarkup: string; // the minimal HTML shape this class expects
  tokensConsumed: string[]; // DesignToken names this class's rules reference
}

type ClassFamily = 'layout' | 'card' | 'button' | 'field' | 'choice-tile' | 'progress' | 'feedback';
```

Every `ComponentClass` is one row of `contracts/css-classes.md`. The same 1:1 match rule as
`DesignToken`/`contracts/design-tokens.md` applies (FR-096d / FR-090 / SC-035).

### `CompatAlias`

```ts
interface CompatAlias {
  legacyName: string; // '--sv-maroon-700' or '.sv-shell'
  kind: 'custom-property' | 'class';
  targetToken?: string; // the --ds-* name it resolves to, for a custom-property alias
  targetClass?: string; // the .ds-* class(es) whose computed styles it reproduces, for a class alias
}
```

Every legacy `--sv-*` property and `.sv-*` class in `src/styles/tokens.css` / `src/styles.css` today has
exactly one `CompatAlias` entry, defined in `compat.css` (FR-093). This is not a markdown-catalogued
entity — `compat.css` is implementation, not a public contract engineers are meant to build new things
against — but it is listed here because `research.md` R1–R3 and `spec.md` D-004 both depend on its shape
being exactly "one legacy name → one new name," never a legacy name computed from several new tokens
(which would make the alias's correctness unverifiable by inspection).

### `PrimeNgBridgeEntry`

```ts
interface PrimeNgBridgeEntry {
  primeNgVariable: string; // '--p-primary-color'
  dsToken: string; // '--ds-color-primary-700'
  usedBy: string[]; // PrimeNG components this app renders that read this variable
}
```

Every entry is one row of `contracts/design-tokens.md` §PrimeNG bridge, and one declaration in
`integrations/primeng-bridge.css`. FR-096i / FR-092 require every entry to exist in both places.

## Relationships

```
TokenScale 1───* DesignToken (primitive)
DesignToken (semantic) *───* DesignToken (primitive)   [a semantic token's value may reference several]
ContrastPair *───2 DesignToken                           [foreground + background, both resolve to a colour]
ComponentClass *───* DesignToken                          [tokensConsumed]
CompatAlias 1───1 DesignToken | ComponentClass            [exactly one target]
PrimeNgBridgeEntry 1───1 DesignToken
```

## Validation rules (owned by the contract spec, FR-096)

| Rule                                              | Checked against                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| No literal colour outside `tokens/primitives.css` | every primitive `DesignToken.value` with `category: 'color'`                                                          |
| No raw spacing length outside `tokens/`           | every CSS file's spacing-shaped properties, excluding `tokens/**`                                                     |
| No unresolved `var(--ds-*)`                       | every `var()` usage vs. every defined `DesignToken.name`                                                              |
| CSS ↔ contract docs match 1:1                     | every `DesignToken`/`ComponentClass` in CSS vs. every row in `contracts/*.md`                                         |
| Scales strictly ascending                         | every `TokenScale`'s members by `sortKey`                                                                             |
| Contrast pairs ≥ AA                               | every `ContrastPair.minRatio`                                                                                         |
| Reduced-motion block present                      | `base/motion.css` defines `@media (prefers-reduced-motion: reduce)` and overrides every motion-duration `DesignToken` |
| Compositor-only animation                         | every `transition`/`@keyframes` property list across `src/styles/**` and `src/app/**/*.css`                           |
| PrimeNG variables mapped                          | every `PrimeNgBridgeEntry` present in `integrations/primeng-bridge.css`                                               |
