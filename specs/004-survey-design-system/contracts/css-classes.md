# Contract: CSS Classes

**Feature**: [`004-survey-design-system`](../spec.md) | **Status**: Normative — the contract spec
(`tasks.md` US3) checks the shipped CSS against this file 1:1, in both directions (FR-096d / FR-090 /
SC-035).

Every `.ds-*` selector that exists anywhere under `src/styles/**/*.css` MUST have a row below. Every row
below MUST exist in the shipped CSS. Naming is BEM-lite (`spec.md` D-003): `.ds-block`,
`.ds-block__element`, `.ds-block--modifier`. `kind` is `block`, `element`, or `modifier`.

## 1. Layout utilities (`layout/utilities.css`)

| Class | Kind | Purpose | Required markup | Tokens consumed |
| --- | --- | --- | --- | --- |
| `.ds-container` | block | Max-width, centred content wrapper (replaces `.sv-shell`) | Any element; typically the page's top-level wrapper | `--ds-size-content-max-width`, `--ds-space-4` |
| `.ds-stack` | block | Vertical flex layout with a token-driven gap | A parent with block-level children | `--ds-space-4` (default gap) |
| `.ds-stack--sm` / `.ds-stack--lg` | modifier | Tighter/looser stack gap | Applied alongside `.ds-stack` | `--ds-space-2` / `--ds-space-6` |
| `.ds-cluster` | block | Horizontal flex layout, wraps, token-driven gap (button rows, badge rows) | A parent with inline-block-level children | `--ds-space-3` |
| `.ds-visually-hidden` | block | Visually hidden, still exposed to assistive technology (replaces `.sv-visually-hidden`) | Any element whose text content must reach a screen reader only | none (position/clip only) |
| `.ds-skip-link` | block | Off-screen until focused, then pinned top-left (replaces `.sv-skip-link`) | `<a href="#main">` as the first focusable element in the document | `--ds-color-primary`, `--ds-color-on-primary`, `--ds-space-2`, `--ds-radius-sm` |

## 2. Card (`components/card.css`)

| Class | Kind | Purpose | Required markup | Tokens consumed |
| --- | --- | --- | --- | --- |
| `.ds-card` | block | White surface, soft shadow, rounded corners — the base panel for a question group, confirmation screen, etc. | Any container element | `--ds-color-surface`, `--ds-shadow-resting`, `--ds-radius-lg`, `--ds-space-5` |
| `.ds-card--raised` | modifier | Elevated state for an interactive/hovered card | Applied alongside `.ds-card` | `--ds-shadow-raised` |

## 3. Button (`components/button.css`)

| Class | Kind | Purpose | Required markup | Tokens consumed |
| --- | --- | --- | --- | --- |
| `.ds-btn` | block | Base button: min 44×44px target, token-driven padding/radius/font, focus ring, `transform`-only pressed state | `<button>` or `<a role="button">` | `--ds-size-control-min`, `--ds-space-3`/`--ds-space-5`, `--ds-radius-pill`, `--ds-font-weight-semibold`, `--ds-color-focus-ring`, `--ds-motion-duration-fast` |
| `.ds-btn--primary` | modifier | Solid maroon pill, white text — the primary CTA | Applied alongside `.ds-btn` | `--ds-color-primary`, `--ds-color-primary-hover`, `--ds-color-primary-active`, `--ds-color-on-primary` |
| `.ds-btn--secondary` | modifier | Gold-bordered or subtly-filled secondary action | Applied alongside `.ds-btn` | `--ds-color-secondary-700` (border/text), `--ds-color-surface` |
| `.ds-btn--ghost` | modifier | Transparent background, maroon text (e.g. "Save draft") | Applied alongside `.ds-btn` | `--ds-color-primary`, transparent background |
| `.ds-btn:disabled`, `.ds-btn[aria-disabled="true"]` | modifier (state) | Reduced-opacity, non-interactive | Applied alongside `.ds-btn` | `--ds-color-neutral-400` |

## 4. Field (`components/field.css`)

| Class | Kind | Purpose | Required markup | Tokens consumed |
| --- | --- | --- | --- | --- |
| `.ds-field` | block | Vertical wrapper for one labelled control: label, control, optional hint, optional error | `<div class="ds-field">` containing a `.ds-field__label`, one control, and optionally `.ds-field__hint`/`.ds-field__error` | `--ds-space-2` (internal gap) |
| `.ds-field__label` | element | Label text style, carries the optional required marker | `<label class="ds-field__label">`, with a `<span class="ds-field__required">` child when required | `--ds-font-weight-medium`, `--ds-color-text` |
| `.ds-field__required` | element | Required-field marker (asterisk) | `<span class="ds-field__required" aria-hidden="true">*</span>` | `--ds-color-error` |
| `.ds-field__hint` | element | Muted helper text below the control | `<p class="ds-field__hint">` | `--ds-color-text-muted`, `--ds-font-size-sm` |
| `.ds-field__error` | element | Validation error text, paired with `aria-describedby` on the control | `<p class="ds-field__error" id="…">` | `--ds-color-error`, `--ds-font-size-sm` |
| `.ds-input` | block | Base text/number/date control chrome: border, radius, 44px min height, focus ring | `<input class="ds-input">` or `<textarea class="ds-input">` | `--ds-color-border-default`, `--ds-color-border-selected`, `--ds-radius-md`, `--ds-size-control-min`, `--ds-color-focus-ring` |
| `.ds-input--invalid` | modifier | Error border/state on a control that failed validation | Applied alongside `.ds-input`, with `aria-invalid="true"` on the element | `--ds-color-error` |

## 5. Choice tile (`components/choice-tile.css`)

| Class | Kind | Purpose | Required markup | Tokens consumed |
| --- | --- | --- | --- | --- |
| `.ds-choice-tile` | block | Bordered, rounded tile wrapping a radio/checkbox with a bold title and muted description | `<label class="ds-choice-tile">` containing a `.ds-choice-tile__control`, `.ds-choice-tile__title`, and optional `.ds-choice-tile__description` | `--ds-color-border-default`, `--ds-radius-lg`, `--ds-space-4`, `--ds-size-control-min` |
| `.ds-choice-tile--selected` | modifier | Selected state: primary-coloured border and subtle tinted background | Applied alongside `.ds-choice-tile` when its control is checked | `--ds-color-border-selected`, `--ds-color-primary-50` |
| `.ds-choice-tile--disabled` | modifier | Disabled state | Applied alongside `.ds-choice-tile` | `--ds-color-neutral-300`, `--ds-color-text-muted` |
| `.ds-choice-tile__control` | element | Positions the native `<input type="radio"\|"checkbox">` | `<input class="ds-choice-tile__control">` as the tile's first child | none (layout only) |
| `.ds-choice-tile__title` | element | Bold option title | `<span class="ds-choice-tile__title">` | `--ds-font-weight-semibold`, `--ds-color-text` |
| `.ds-choice-tile__description` | element | Muted option description | `<span class="ds-choice-tile__description">` | `--ds-color-text-muted`, `--ds-font-size-sm` |

## 6. Progress (`components/progress.css`)

| Class | Kind | Purpose | Required markup | Tokens consumed |
| --- | --- | --- | --- | --- |
| `.ds-progress` | block | Rounded track container | `<div class="ds-progress" role="progressbar" aria-valuenow="…" aria-valuemin="0" aria-valuemax="100">` | `--ds-color-progress-track`, `--ds-radius-pill` |
| `.ds-progress__bar` | element | Filled bar; the consuming component sets an inline `style="--progress-fill-percent: <0-100>"` on the element, and the class's `transform: scaleX(calc(var(--progress-fill-percent) / 100))` reads it (FR-094: animates `transform`, never `width`/`inline-size`) | `<div class="ds-progress__bar" style="--progress-fill-percent: 33">` inside `.ds-progress` | `--ds-color-progress-fill`, `--ds-radius-pill`, `--ds-motion-duration-base`, `--ds-motion-easing-standard` |
| `.ds-progress__label` | element | Small accent-coloured label (e.g. "33% Completed") | `<span class="ds-progress__label">` | `--ds-color-secondary-text`, `--ds-font-size-sm`, `--ds-font-weight-semibold` |

`--progress-fill-percent` is deliberately **not** prefixed `--ds-` — it is a per-instance style hook set by
the component markup, not a catalogued design token, and it has no row in `contracts/design-tokens.md`.
Prefixing it `--ds-` would make the contract spec's "every `--ds-*` must be either a defined token or
resolve to one" check (FR-096a/d) produce a false positive, since this value is deliberately never
*defined* in any CSS file — only consumed by `.ds-progress__bar` and set inline per element.

## 7. Feedback (`components/feedback.css`)

| Class | Kind | Purpose | Required markup | Tokens consumed |
| --- | --- | --- | --- | --- |
| `.ds-alert` | block | Base feedback banner (validation summary, submission result) | `<div class="ds-alert" role="alert">` or `role="status"` per the announcer service's existing convention | `--ds-radius-md`, `--ds-space-4`, `--ds-color-border-subtle` |
| `.ds-alert--error` | modifier | Error-toned banner | Applied alongside `.ds-alert` | `--ds-color-error`, `--ds-color-error-surface` |
| `.ds-alert--success` | modifier | Success-toned banner | Applied alongside `.ds-alert` | `--ds-color-success`, `--ds-color-success-surface` |
| `.ds-alert--warning` | modifier | Warning-toned banner | Applied alongside `.ds-alert` | `--ds-color-warning`, `--ds-color-warning-surface` |
| `.ds-alert--info` | modifier | Informational banner | Applied alongside `.ds-alert` | `--ds-color-info`, `--ds-color-info-surface` |

A live-region announcement (the `announcer` service) reuses `.ds-visually-hidden` (§1) rather than a new
class — the smallest useful seam, since visual hiding is the only CSS concern and `aria-live` is set in
TypeScript, not CSS.

## Non-goals (explicitly not catalogued here)

- No size-variant modifiers (`.ds-btn--sm`, `.ds-btn--lg`): the 44px minimum is enforced on the base
  `.ds-btn`, and this feature has no identified second caller needing a smaller/larger button (`spec.md`
  "smallest useful seam"). Add one when a second caller needs it, and add its contract row then.
- No sidebar/page-shell classes: the reference image's navigation chrome is demo-app chrome, not part of
  this survey viewer's page structure (`spec.md` Assumptions).
- No classes for `features/survey/*` components themselves: those keep their current Angular component
  stylesheets; they consume the classes/tokens above without new component-specific classes being added by
  this feature (FR-097).
