# Contract: Design Tokens

**Feature**: [`004-survey-design-system`](../spec.md) | **Status**: Normative — the contract spec
(`tasks.md` US3) checks the shipped CSS against this file 1:1, in both directions (FR-096d / SC-035).

Every `--ds-*` custom property that exists anywhere under `src/styles/**/*.css` MUST have a row below.
Every row below MUST exist in the shipped CSS. Adding, renaming, or removing a token means editing this
file in the same change.

Two tiers (`spec.md` D-001): **Primitive** = literal value, lives only in `tokens/primitives.css`.
**Semantic** = `var()` reference to one or more primitives (directly or via another semantic token), lives
in `tokens/semantic.css` or a component file's local scope is never allowed — semantics are global.

## 1. Primitives (`tokens/primitives.css`)

The only file in this feature allowed to contain a literal colour, length, duration, or easing value.

### 1.1 Colour — primary (maroon), reused unchanged from `src/styles/tokens.css`

| Token                             | Value     |
| --------------------------------- | --------- |
| `--ds-primitive-color-maroon-50`  | `#fbf2f2` |
| `--ds-primitive-color-maroon-100` | `#f5dcdc` |
| `--ds-primitive-color-maroon-200` | `#ebb8b8` |
| `--ds-primitive-color-maroon-300` | `#dd8e8e` |
| `--ds-primitive-color-maroon-400` | `#c96161` |
| `--ds-primitive-color-maroon-500` | `#b03c3c` |
| `--ds-primitive-color-maroon-600` | `#96292d` |
| `--ds-primitive-color-maroon-700` | `#800000` |
| `--ds-primitive-color-maroon-800` | `#6a0000` |
| `--ds-primitive-color-maroon-900` | `#560000` |
| `--ds-primitive-color-maroon-950` | `#3b0000` |

### 1.2 Colour — secondary (metallic gold), new (`research.md` R1)

| Token                           | Value     |
| ------------------------------- | --------- |
| `--ds-primitive-color-gold-50`  | `#fdf8ec` |
| `--ds-primitive-color-gold-100` | `#faedc8` |
| `--ds-primitive-color-gold-200` | `#f3db91` |
| `--ds-primitive-color-gold-300` | `#eac665` |
| `--ds-primitive-color-gold-400` | `#dfb13e` |
| `--ds-primitive-color-gold-500` | `#c9972b` |
| `--ds-primitive-color-gold-600` | `#b07f22` |
| `--ds-primitive-color-gold-700` | `#8f661c` |
| `--ds-primitive-color-gold-800` | `#705019` |
| `--ds-primitive-color-gold-900` | `#5a4015` |
| `--ds-primitive-color-gold-950` | `#332408` |

### 1.3 Colour — tertiary (warm cream), new (`research.md` R1)

| Token                            | Value     |
| -------------------------------- | --------- |
| `--ds-primitive-color-cream-50`  | `#fffdfb` |
| `--ds-primitive-color-cream-100` | `#fdf9f2` |
| `--ds-primitive-color-cream-200` | `#faf3ea` |
| `--ds-primitive-color-cream-300` | `#f3e7d8` |
| `--ds-primitive-color-cream-400` | `#e8d6bc` |
| `--ds-primitive-color-cream-500` | `#d9be97` |
| `--ds-primitive-color-cream-600` | `#c4a374` |
| `--ds-primitive-color-cream-700` | `#a3815a` |
| `--ds-primitive-color-cream-800` | `#7c6244` |
| `--ds-primitive-color-cream-900` | `#574531` |
| `--ds-primitive-color-cream-950` | `#332a1d` |

### 1.4 Colour — neutral (warm-tinted gray), new

| Token                              | Value     |
| ---------------------------------- | --------- |
| `--ds-primitive-color-white`       | `#ffffff` |
| `--ds-primitive-color-neutral-50`  | `#f8f6f3` |
| `--ds-primitive-color-neutral-100` | `#f1ede7` |
| `--ds-primitive-color-neutral-200` | `#e4ded5` |
| `--ds-primitive-color-neutral-300` | `#cfc6b8` |
| `--ds-primitive-color-neutral-400` | `#a99e8e` |
| `--ds-primitive-color-neutral-500` | `#8a8072` |
| `--ds-primitive-color-neutral-600` | `#6b6259` |
| `--ds-primitive-color-neutral-700` | `#52493f` |
| `--ds-primitive-color-neutral-800` | `#39322a` |
| `--ds-primitive-color-neutral-900` | `#2b2320` |
| `--ds-primitive-color-neutral-950` | `#1a1512` |

### 1.5 Colour — status (success / warning / error / info), new

| Token                              | Value     | Token                              | Value     |
| ---------------------------------- | --------- | ---------------------------------- | --------- |
| `--ds-primitive-color-success-50`  | `#eaf7f0` | `--ds-primitive-color-warning-50`  | `#fdf1e3` |
| `--ds-primitive-color-success-500` | `#2e9360` | `--ds-primitive-color-warning-500` | `#c27c00` |
| `--ds-primitive-color-success-600` | `#1e7a4c` | `--ds-primitive-color-warning-600` | `#9a5b00` |
| `--ds-primitive-color-success-700` | `#15603a` | `--ds-primitive-color-warning-700` | `#7a4700` |
| `--ds-primitive-color-error-50`    | `#fbeae9` | `--ds-primitive-color-info-50`     | `#eaf1fb` |
| `--ds-primitive-color-error-500`   | `#d33a30` | `--ds-primitive-color-info-500`    | `#3e74be` |
| `--ds-primitive-color-error-600`   | `#b3261e` | `--ds-primitive-color-info-600`    | `#2a5ba0` |
| `--ds-primitive-color-error-700`   | `#8c1d17` | `--ds-primitive-color-info-700`    | `#1e4578` |

### 1.6 Typography

| Token                                  | Value                                                      |
| -------------------------------------- | ---------------------------------------------------------- |
| `--ds-primitive-font-family-base`      | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `--ds-primitive-font-size-xs`          | `0.75rem` (12px)                                           |
| `--ds-primitive-font-size-sm`          | `0.875rem` (14px)                                          |
| `--ds-primitive-font-size-base`        | `1rem` (16px)                                              |
| `--ds-primitive-font-size-md`          | `1.125rem` (18px)                                          |
| `--ds-primitive-font-size-lg`          | `1.25rem` (20px)                                           |
| `--ds-primitive-font-size-xl`          | `1.5rem` (24px)                                            |
| `--ds-primitive-font-size-2xl`         | `1.875rem` (30px)                                          |
| `--ds-primitive-font-size-3xl`         | `2.25rem` (36px)                                           |
| `--ds-primitive-font-weight-regular`   | `400`                                                      |
| `--ds-primitive-font-weight-medium`    | `500`                                                      |
| `--ds-primitive-font-weight-semibold`  | `600`                                                      |
| `--ds-primitive-font-weight-bold`      | `700`                                                      |
| `--ds-primitive-line-height-tight`     | `1.2`                                                      |
| `--ds-primitive-line-height-snug`      | `1.35`                                                     |
| `--ds-primitive-line-height-normal`    | `1.5`                                                      |
| `--ds-primitive-line-height-relaxed`   | `1.65`                                                     |
| `--ds-primitive-letter-spacing-tight`  | `-0.01em`                                                  |
| `--ds-primitive-letter-spacing-normal` | `0em`                                                      |
| `--ds-primitive-letter-spacing-wide`   | `0.02em`                                                   |
| `--ds-primitive-letter-spacing-caps`   | `0.08em`                                                   |

### 1.7 Spacing (steps 0–7 preserved byte-for-byte from `--sv-space-*`; 8–9 new)

| Token                                    | Value                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `--ds-primitive-space-0`                 | `0`                                                                      |
| `--ds-primitive-space-1`                 | `0.25rem`                                                                |
| `--ds-primitive-space-2`                 | `0.5rem`                                                                 |
| `--ds-primitive-space-3`                 | `0.75rem`                                                                |
| `--ds-primitive-space-4`                 | `1rem`                                                                   |
| `--ds-primitive-space-5`                 | `1.5rem`                                                                 |
| `--ds-primitive-space-6`                 | `2rem`                                                                   |
| `--ds-primitive-space-7`                 | `3rem`                                                                   |
| `--ds-primitive-space-8`                 | `4rem`                                                                   |
| `--ds-primitive-space-9`                 | `6rem`                                                                   |
| `--ds-primitive-space-touch-min`         | `44px` (FR-091; not part of the ascending scale — a fixed WCAG constant) |
| `--ds-primitive-space-content-max-width` | `56rem` (preserved from `--sv-content-max-width`)                        |
| `--ds-primitive-space-focus-ring-width`  | `2px` (preserved from `--sv-focus-ring-width`)                           |
| `--ds-primitive-space-focus-ring-offset` | `2px` (preserved from `--sv-focus-ring-offset`)                          |

### 1.8 Radius

| Token                        | Value                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `--ds-primitive-radius-sm`   | `4px`                                                                                |
| `--ds-primitive-radius-md`   | `8px`                                                                                |
| `--ds-primitive-radius-lg`   | `12px`                                                                               |
| `--ds-primitive-radius-xl`   | `16px`                                                                               |
| `--ds-primitive-radius-pill` | `999px` (terminal value, excluded from the ascending-scale check — `research.md` R4) |
| `--ds-primitive-radius-full` | `50%` (terminal value, same exclusion)                                               |

### 1.9 Elevation

| Token                           | Value                                                                   |
| ------------------------------- | ----------------------------------------------------------------------- |
| `--ds-primitive-shadow-resting` | `0 1px 2px rgba(43, 35, 32, 0.06), 0 1px 3px rgba(43, 35, 32, 0.10)`    |
| `--ds-primitive-shadow-raised`  | `0 2px 4px rgba(43, 35, 32, 0.08), 0 4px 8px rgba(43, 35, 32, 0.12)`    |
| `--ds-primitive-shadow-overlay` | `0 8px 16px rgba(43, 35, 32, 0.12), 0 16px 32px rgba(43, 35, 32, 0.16)` |

`rgba(43, 35, 32, …)` is `neutral-900` (`#2b2320`) — shadows are tinted warm-neutral, not pure black, and
this `rgba()` literal is only legal here because it lives in `tokens/primitives.css`.

### 1.10 Motion

| Token                                     | Value                        |
| ----------------------------------------- | ---------------------------- |
| `--ds-primitive-motion-duration-instant`  | `0ms`                        |
| `--ds-primitive-motion-duration-fast`     | `120ms`                      |
| `--ds-primitive-motion-duration-base`     | `200ms`                      |
| `--ds-primitive-motion-duration-slow`     | `320ms`                      |
| `--ds-primitive-motion-easing-standard`   | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ds-primitive-motion-easing-decelerate` | `cubic-bezier(0, 0, 0, 1)`   |
| `--ds-primitive-motion-easing-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` |

## 2. Semantic tokens (`tokens/semantic.css`)

Every value below is a `var()` expression. Component classes (`contracts/css-classes.md`) consume these,
never the primitives in §1 directly.

### 2.1 Colour ramps, re-exposed by role

`--ds-color-primary-{50|100|200|300|400|500|600|700|800|900|950}` → `var(--ds-primitive-color-maroon-*)`
`--ds-color-secondary-{50…950}` → `var(--ds-primitive-color-gold-*)`
`--ds-color-tertiary-{50…950}` → `var(--ds-primitive-color-cream-*)`
`--ds-color-neutral-{50…950}` → `var(--ds-primitive-color-neutral-*)`
`--ds-color-success-{50|500|600|700}`, `-warning-*`, `-error-*`, `-info-*` → matching `--ds-primitive-color-*-*`

### 2.2 Colour roles (what components actually reference)

| Token                                                                                  | Value                                                                                        | Usage                                                                                    |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `--ds-color-primary`                                                                   | `var(--ds-color-primary-700)`                                                                | Primary buttons, links, brand accents                                                    |
| `--ds-color-primary-hover`                                                             | `var(--ds-color-primary-800)`                                                                | Primary button hover/active background                                                   |
| `--ds-color-primary-active`                                                            | `var(--ds-color-primary-900)`                                                                | Primary button pressed background                                                        |
| `--ds-color-on-primary`                                                                | `var(--ds-primitive-color-white)`                                                            | Text/icons on a primary-filled surface                                                   |
| `--ds-color-secondary`                                                                 | `var(--ds-color-secondary-600)`                                                              | Gradient stops, icons, large/bold accent text (≥18.66px) — **not** normal body text (R1) |
| `--ds-color-secondary-text`                                                            | `var(--ds-color-secondary-700)`                                                              | Gold text at normal body size (AA-verified)                                              |
| `--ds-color-tertiary-surface`                                                          | `var(--ds-color-tertiary-200)`                                                               | Page background                                                                          |
| `--ds-color-surface`                                                                   | `var(--ds-primitive-color-white)`                                                            | Card / panel background                                                                  |
| `--ds-color-surface-sunken`                                                            | `var(--ds-color-tertiary-50)`                                                                | Input background, subtle recessed areas                                                  |
| `--ds-color-text`                                                                      | `var(--ds-color-neutral-900)`                                                                | Default body/heading text                                                                |
| `--ds-color-text-muted`                                                                | `var(--ds-color-neutral-600)`                                                                | Secondary/description text                                                               |
| `--ds-color-text-on-primary`                                                           | `var(--ds-primitive-color-white)`                                                            | Text on primary-filled surfaces                                                          |
| `--ds-color-border-default`                                                            | `var(--ds-color-neutral-500)`                                                                | Default input/choice-tile border (AA non-text 3:1)                                       |
| `--ds-color-border-subtle`                                                             | `var(--ds-color-neutral-300)`                                                                | Decorative dividers, card borders (shadow carries the separation)                        |
| `--ds-color-border-selected`                                                           | `var(--ds-color-primary-700)`                                                                | Selected choice-tile / focused field border                                              |
| `--ds-color-focus-ring`                                                                | `var(--ds-color-primary-700)`                                                                | Keyboard focus ring (all interactive elements)                                           |
| `--ds-color-success` / `-warning` / `-error` / `-info`                                 | `var(--ds-color-*-600)`                                                                      | Status text/icon, AA-verified                                                            |
| `--ds-color-success-surface` / `-warning-surface` / `-error-surface` / `-info-surface` | `var(--ds-color-*-50)`                                                                       | Status banner background                                                                 |
| `--ds-color-progress-track`                                                            | `var(--ds-color-tertiary-200)`                                                               | Progress bar track                                                                       |
| `--ds-color-progress-fill`                                                             | `linear-gradient(90deg, var(--ds-color-primary-700) 0%, var(--ds-color-secondary-600) 100%)` | Progress bar fill (maroon→gold)                                                          |

### 2.3 Typography roles

| Token                                                 | Value                                  |
| ----------------------------------------------------- | -------------------------------------- |
| `--ds-font-family`                                    | `var(--ds-primitive-font-family-base)` |
| `--ds-font-size-{xs\|sm\|base\|md\|lg\|xl\|2xl\|3xl}` | `var(--ds-primitive-font-size-*)`      |
| `--ds-font-weight-{regular\|medium\|semibold\|bold}`  | `var(--ds-primitive-font-weight-*)`    |
| `--ds-line-height-{tight\|snug\|normal\|relaxed}`     | `var(--ds-primitive-line-height-*)`    |
| `--ds-letter-spacing-{tight\|normal\|wide\|caps}`     | `var(--ds-primitive-letter-spacing-*)` |

### 2.4 Spacing, sizing, radius, elevation, motion roles

| Token                                                   | Value                                                 |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `--ds-space-{0…9}`                                      | `var(--ds-primitive-space-*)`                         |
| `--ds-size-control-min`                                 | `var(--ds-primitive-space-touch-min)` (44px — FR-091) |
| `--ds-size-content-max-width`                           | `var(--ds-primitive-space-content-max-width)`         |
| `--ds-size-focus-ring-width`                            | `var(--ds-primitive-space-focus-ring-width)`          |
| `--ds-size-focus-ring-offset`                           | `var(--ds-primitive-space-focus-ring-offset)`         |
| `--ds-radius-{sm\|md\|lg\|xl\|pill\|full}`              | `var(--ds-primitive-radius-*)`                        |
| `--ds-shadow-{resting\|raised\|overlay}`                | `var(--ds-primitive-shadow-*)`                        |
| `--ds-motion-duration-{instant\|fast\|base\|slow}`      | `var(--ds-primitive-motion-duration-*)`               |
| `--ds-motion-easing-{standard\|decelerate\|accelerate}` | `var(--ds-primitive-motion-easing-*)`                 |

## 2.5 Icon masks (`tokens/icons.css`, PRI-66)

A third tier alongside primitive/semantic: each `--ds-icon-*` token is a single-piece value — a
percent-encoded `url("data:image/svg+xml,...")` of a black-geometry glyph on a transparent
background. There is no primitive/semantic split for icons: the value itself carries no colour
decision to alias, only a shape. (The glyph's own `#000000` fill/stroke is percent-encoded to
`%23000000` by the data-URI encoding, so no raw `#`/named-colour text exists in the file — this is
not an exception to the FR-096b colour-token rule, the literal hex is simply not present as text.)

Consumers apply the token as `mask-image` (`-webkit-mask-image` for Safari), not `background-image`
— the element's own `background-color`, set to a semantic colour role, supplies the tint through the
mask. Never consumed as a literal colour; never rendered without adjacent text or an `aria-*` cue at
the call site (consuming tasks' responsibility, not this layer's).

| Token                   | Glyph                                     | Scoped use                                                            |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `--ds-icon-clipboard`   | Clipboard with two rule lines             | Default page-icon badge (`SurveyPage.icon = null`) and the brand mark |
| `--ds-icon-id-card`     | ID card with a photo circle and two lines | Page-icon badge, `PageIcon` enum value `'id-card'`                    |
| `--ds-icon-file-shield` | Shield outline                            | Page-icon badge, `PageIcon` enum value `'file-shield'`                |
| `--ds-icon-laptop-file` | Laptop with a document tray               | Page-icon badge, `PageIcon` enum value `'laptop-file'`                |
| `--ds-icon-menu`        | Three horizontal bars                     | Mobile drawer open toggle                                             |
| `--ds-icon-close`       | X (two crossed lines)                     | Mobile drawer close control                                           |
| `--ds-icon-clock`       | Clock face with hands                     | Time-estimate pill (`estimatedMinutes`)                               |

`PageIcon`'s four enum values (`id-card`, `file-shield`, `laptop-file`, `clipboard` — `clipboard` is
the default/fallback) map 1:1 to `--ds-icon-${icon}`, so a consumer can key the mask straight off the
model value without a lookup table.

## 3. Verified contrast pairs (checked by the contract spec, FR-096f)

Computed with the WCAG 2.1 relative-luminance formula (`research.md` R1). `minRatio` 4.5 = normal text,
3 = large text (≥18.66px bold / ≥24px regular) or non-text UI (borders, icons conveying state).

| Foreground                                                       | Background                                | Context     | Ratio   | Min |
| ---------------------------------------------------------------- | ----------------------------------------- | ----------- | ------- | --- |
| `--ds-color-text` (`neutral-900`)                                | `--ds-color-surface` (white)              | normal-text | 15.40:1 | 4.5 |
| `--ds-color-text` (`neutral-900`)                                | `--ds-color-tertiary-surface` (cream-200) | normal-text | 13.98:1 | 4.5 |
| `--ds-color-text-muted` (`neutral-600`)                          | `--ds-color-surface` (white)              | normal-text | 5.97:1  | 4.5 |
| `--ds-color-text-muted` (`neutral-600`)                          | `--ds-color-tertiary-surface` (cream-200) | normal-text | 5.42:1  | 4.5 |
| `--ds-color-on-primary` (white)                                  | `--ds-color-primary` (maroon-700)         | normal-text | 10.95:1 | 4.5 |
| `--ds-color-secondary-text` (gold-700)                           | `--ds-color-surface` (white)              | normal-text | 5.14:1  | 4.5 |
| `--ds-color-secondary-text` (gold-700)                           | `--ds-color-tertiary-surface` (cream-200) | normal-text | 4.67:1  | 4.5 |
| `--ds-color-secondary` (gold-600)                                | `--ds-color-surface` (white)              | large-text  | 3.56:1  | 3   |
| `--ds-color-border-default` (`neutral-500`)                      | `--ds-color-surface` (white)              | non-text-ui | 3.88:1  | 3   |
| `--ds-color-border-default` (`neutral-500`)                      | `--ds-color-tertiary-surface` (cream-200) | non-text-ui | 3.52:1  | 3   |
| `--ds-color-success` (success-600)                               | `--ds-color-surface` (white)              | normal-text | 5.33:1  | 4.5 |
| `--ds-color-success` (success-600)                               | `--ds-color-tertiary-surface` (cream-200) | normal-text | 4.84:1  | 4.5 |
| `--ds-color-on-primary` (white)                                  | `--ds-color-success` (success-600)        | normal-text | 5.33:1  | 4.5 |
| `--ds-color-warning` (warning-600)                               | `--ds-color-surface` (white)              | normal-text | 5.43:1  | 4.5 |
| `--ds-color-warning` (warning-600)                               | `--ds-color-tertiary-surface` (cream-200) | normal-text | 4.93:1  | 4.5 |
| `--ds-color-on-primary` (white)                                  | `--ds-color-warning` (warning-600)        | normal-text | 5.43:1  | 4.5 |
| `--ds-color-error` (error-600)                                   | `--ds-color-surface` (white)              | normal-text | 6.54:1  | 4.5 |
| `--ds-color-error` (error-600)                                   | `--ds-color-tertiary-surface` (cream-200) | normal-text | 5.94:1  | 4.5 |
| `--ds-color-on-primary` (white)                                  | `--ds-color-error` (error-600)            | normal-text | 6.54:1  | 4.5 |
| `--ds-color-info` (info-600)                                     | `--ds-color-surface` (white)              | normal-text | 6.77:1  | 4.5 |
| `--ds-color-info` (info-600)                                     | `--ds-color-tertiary-surface` (cream-200) | normal-text | 6.15:1  | 4.5 |
| `--ds-color-on-primary` (white)                                  | `--ds-color-info` (info-600)              | normal-text | 6.77:1  | 4.5 |
| `--ds-color-tertiary-300` (cream-300, sidebar/dark-surface text) | `--ds-color-primary-950` (maroon-950)     | normal-text | 14.53:1 | 4.5 |

A token pair not listed here is not yet covered by the contract spec's contrast check. A new pairing
(foreground token + background token actually used together for text or a meaningful UI boundary) must be
added here, with its ratio computed, before it ships in a component class.

## 4. PrimeNG bridge (`integrations/primeng-bridge.css`, FR-092 / FR-096i)

`survey-viewer-preset.ts` already sets `--p-primary-*` and `--p-highlight-*` via `definePreset` (sourced
from `tokens/primitives.css`'s maroon ramp — `research.md` R2). This bridge covers the remaining PrimeNG
(Aura) variables this app's rendered components (dropdown, checkbox, radiobutton, inputtext, button,
message/toast) read, re-pointing each to a `--ds-*` token so unstyled PrimeNG chrome matches.

| PrimeNG variable                    | `--ds-*` token               | Used by                                                     |
| ----------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `--p-content-background`            | `--ds-color-surface`         | page/app background                                         |
| `--p-content-border-color`          | `--ds-color-border-subtle`   | panel/card borders                                          |
| `--p-text-color`                    | `--ds-color-text`            | default text in all PrimeNG components                      |
| `--p-text-muted-color`              | `--ds-color-text-muted`      | helper/placeholder text                                     |
| `--p-border-radius`                 | `--ds-radius-md`             | default component corner radius                             |
| `--p-focus-ring-color`              | `--ds-color-focus-ring`      | focus outline on all focusable PrimeNG components           |
| `--p-focus-ring-width`              | `--ds-size-focus-ring-width` | focus outline thickness on all focusable PrimeNG components |
| `--p-form-field-border-color`       | `--ds-color-border-default`  | dropdown, inputtext, checkbox, radiobutton default border   |
| `--p-form-field-hover-border-color` | `--ds-color-primary-400`     | form field hover border                                     |
| `--p-form-field-focus-border-color` | `--ds-color-border-selected` | form field focus border                                     |
| `--p-highlight-background`          | `--ds-color-primary-50`      | selected option background (dropdown panel)                 |
| `--p-highlight-color`               | `--ds-color-primary-800`     | selected option text (dropdown panel)                       |

The contract spec's PrimeNG check (FR-096i) enumerates exactly the eleven rows above as the required,
fully-mapped set.
