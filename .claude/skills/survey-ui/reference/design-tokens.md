# Contract: Design Tokens

**Feature**: [004-survey-design-system](../spec.md) | **Layer**: `src/styles/tokens/`

All design values are CSS custom properties named `--ds-<category>-<name>`. Components MUST
reference semantic tokens (tier 2); only tier 1 (`primitives.css`) may contain literal
values. This document is the human-readable half of the contract: the automated check
(`src/app/shared/design-system/design-token.contract.spec.ts`) fails when a shipped token is
missing here, when a documented token no longer exists, when a literal colour escapes the
primitive layer, or when a documented pair stops meeting its contrast minimum.

## Tier 1 — Primitives (`tokens/primitives.css`)

The only stylesheet allowed to contain literal colour values. Reference anchors sampled from
`public/theme-preview.png` are marked ▣.

| Token                 | Value                                      | Use                                                                                                                                                            |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ds-maroon-*`       | 50 `#fff5f6` → 900 `#3d0000`               | Primary brand ramp. ▣ `maroon-700 = #800000` is the approved brand maroon                                                                                      |
| `--ds-blue-*`         | 50 `#eef1ff` → 900 `#0a105e`               | Secondary ramp. ▣ `blue-600 = #1524d9` is the reference selected-answer blue                                                                                   |
| `--ds-pink-*`         | 50 `#fff5f7` → 900 `#6f1e30`               | Tertiary ramp. ▣ `pink-400 = #fbafbc` is the reference page canvas                                                                                             |
| `--ds-neutral-*`      | 0 `#ffffff` → 950 `#111111`                | Ink, surfaces, borders, tiles. ▣ `neutral-200 = #e5e5e5` tile, `neutral-900 = #202020` ink, `neutral-600 = #6e6e6e` muted text, `neutral-300 = #c7c7c7` border |
| `--ds-success-*`      | 50 `#f1faf4` → 800 `#0f4d2c`               | Success tint, border, and text steps                                                                                                                           |
| `--ds-warning-*`      | 50 `#fffaf0` → 800 `#6b4500`               | Warning tint, border, and text steps                                                                                                                           |
| `--ds-danger-*`       | 50 → 800, aliasing the maroon ramp         | Errors stay inside the brand family (deliberate: the reference's error tone is the brand tone)                                                                 |
| `--ds-info-*`         | 100, 300, 600, 700, aliasing the blue ramp | Informational tone; avoids introducing a fourth hue family                                                                                                     |
| `--ds-alpha-ink-*`    | `rgb(32 32 32 / 4% … 60%)`                 | Shadows, scrims, hairlines                                                                                                                                     |
| `--ds-alpha-white-*`  | `rgb(255 255 255 / 60% … 80%)`             | Sheen, shimmer, inverse overlays                                                                                                                               |
| `--ds-alpha-maroon-*` | `rgb(128 0 0 / 10% … 16%)`                 | Brand panel shadow tint                                                                                                                                        |
| `--ds-alpha-blue-*`   | `rgb(21 36 217 / 14% … 30%)`               | Selection tint and focus ring                                                                                                                                  |

## Tier 2 — Semantic colour (`tokens/semantic.css`)

| Token                             | Maps to                | Use                                                                                   |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `--ds-color-canvas`               | `--ds-pink-400`        | Page backdrop behind the survey panel (tertiary role)                                 |
| `--ds-color-canvas-subtle`        | `--ds-pink-50`         | Inset tint on the canvas                                                              |
| `--ds-color-canvas-strong`        | `--ds-pink-500`        | Canvas accent bars/borders                                                            |
| `--ds-color-surface`              | `--ds-neutral-0`       | Panels, cards, dropdown overlays                                                      |
| `--ds-color-surface-muted`        | `--ds-neutral-100`     | Tiles, buttons, quiet fills                                                           |
| `--ds-color-surface-sunken`       | `--ds-neutral-50`      | Drop zones, inset wells                                                               |
| `--ds-color-surface-tile`         | `--ds-neutral-200`     | Answer tile fill (▣ the reference tile neutral, one step darker than a muted surface) |
| `--ds-color-surface-raised`       | `--ds-neutral-0`       | Elevated surfaces above the canvas                                                    |
| `--ds-color-surface-inverse`      | `--ds-neutral-900`     | Inverse surfaces                                                                      |
| `--ds-color-text`                 | `--ds-neutral-900`     | Primary text on surfaces                                                              |
| `--ds-color-text-secondary`       | `--ds-neutral-700`     | Secondary text: captions, default step labels                                         |
| `--ds-color-text-muted`           | `--ds-neutral-600`     | Muted text: question prompts, help text                                               |
| `--ds-color-text-subtle`          | `--ds-neutral-500`     | Large/decorative text only (checked at the large-text threshold)                      |
| `--ds-color-text-inverse`         | `--ds-neutral-0`       | Text on inverse surfaces                                                              |
| `--ds-color-text-on-canvas`       | `--ds-neutral-900`     | Text placed directly on the pink canvas                                               |
| `--ds-color-text-muted-on-canvas` | `--ds-neutral-700`     | Muted text on the pink canvas                                                         |
| `--ds-color-text-on-primary`      | `--ds-neutral-0`       | Text/icons on the primary fill                                                        |
| `--ds-color-text-on-selection`    | `--ds-neutral-0`       | Text/icons on the selection fill                                                      |
| `--ds-color-text-on-success`      | `--ds-neutral-0`       | Text/icons on the success fill                                                        |
| `--ds-color-text-on-danger`       | `--ds-neutral-0`       | Text/icons on the danger fill                                                         |
| `--ds-color-border`               | `--ds-neutral-200`     | Decorative separators between surfaces                                                |
| `--ds-color-border-subtle`        | `--ds-neutral-100`     | Hairlines inside a surface                                                            |
| `--ds-color-border-strong`        | `--ds-neutral-300`     | Emphasised decorative borders                                                         |
| `--ds-color-border-interactive`   | `--ds-neutral-500`     | The only border that identifies an interactive control; meets 3:1                     |
| `--ds-color-primary`              | `--ds-maroon-700`      | Primary brand role: chrome, active step, primary button, errors                       |
| `--ds-color-primary-strong`       | `--ds-maroon-800`      | Pressed primary                                                                       |
| `--ds-color-primary-hover`        | `--ds-maroon-600`      | Hovered primary                                                                       |
| `--ds-color-primary-soft`         | `--ds-maroon-50`       | Primary tinted fill                                                                   |
| `--ds-color-primary-border`       | `--ds-maroon-200`      | Primary tinted border                                                                 |
| `--ds-color-primary-contrast`     | `--ds-neutral-0`       | Text on primary (alias of the on-primary role)                                        |
| `--ds-color-selection`            | `--ds-blue-600`        | Secondary role: selected answer fill, focus accents                                   |
| `--ds-color-selection-strong`     | `--ds-blue-700`        | Selected borders, selected option text                                                |
| `--ds-color-selection-hover`      | `--ds-blue-700`        | Hovered selection fill                                                                |
| `--ds-color-selection-soft`       | `--ds-blue-50`         | Selection tint for hover/preview states                                               |
| `--ds-color-selection-border`     | `--ds-blue-200`        | Selection tinted border                                                               |
| `--ds-color-selection-contrast`   | `--ds-neutral-0`       | Text on selection (alias)                                                             |
| `--ds-color-tertiary`             | `--ds-pink-400`        | Tertiary role: canvas and tertiary accents, usable standalone                         |
| `--ds-color-tertiary-soft`        | `--ds-pink-100`        | Tertiary tint                                                                         |
| `--ds-color-tertiary-strong`      | `--ds-pink-700`        | Tertiary text/icon on light surfaces (meets AA)                                       |
| `--ds-color-tertiary-border`      | `--ds-pink-300`        | Tertiary border                                                                       |
| `--ds-color-success`              | `--ds-success-700`     | Success text and "answered" markers                                                   |
| `--ds-color-success-soft`         | `--ds-success-100`     | Success tinted fill                                                                   |
| `--ds-color-success-border`       | `--ds-success-300`     | Success border                                                                        |
| `--ds-color-warning`              | `--ds-warning-700`     | Warning text                                                                          |
| `--ds-color-warning-soft`         | `--ds-warning-100`     | Warning tinted fill                                                                   |
| `--ds-color-warning-border`       | `--ds-warning-300`     | Warning border                                                                        |
| `--ds-color-danger`               | `--ds-danger-600`      | Error text, invalid borders                                                           |
| `--ds-color-danger-strong`        | `--ds-danger-700`      | Error headline text on the danger tint                                                |
| `--ds-color-danger-soft`          | `--ds-danger-50`       | Error tinted fill                                                                     |
| `--ds-color-danger-border`        | `--ds-danger-200`      | Error border                                                                          |
| `--ds-color-info`                 | `--ds-info-600`        | Informational text and icons                                                          |
| `--ds-color-info-soft`            | `--ds-info-100`        | Informational tinted fill                                                             |
| `--ds-color-info-border`          | `--ds-info-300`        | Informational border                                                                  |
| `--ds-color-focus-ring`           | `--ds-alpha-blue-30`   | Focus ring halo colour                                                                |
| `--ds-color-focus-ring-core`      | `--ds-color-selection` | Focus ring core colour (opaque; used for contrast checks)                             |
| `--ds-focus-ring-width`           | `3px`                  | Ring width; never below 2px                                                           |
| `--ds-focus-ring-offset`          | `2px`                  | Ring offset from the control                                                          |
| `--ds-focus-ring`                 | composite              | `0 0 0 var(--ds-focus-ring-width) var(--ds-color-focus-ring)`                         |
| `--ds-color-scrim`                | `--ds-alpha-ink-45`    | Drawer/modal backdrop                                                                 |
| `--ds-color-overlay-shadow`       | `--ds-alpha-ink-12`    | Overlay shadow tint                                                                   |

## Tier 2 — Typography (`tokens/typography.css`)

| Token                        | Value                                                                                                            | Use                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `--ds-font-display`          | `Georgia, 'Iowan Old Style', 'Times New Roman', Times, serif`                                                    | Survey titles and display numerals        |
| `--ds-font-text`             | `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif` | Prompts, body copy, controls              |
| `--ds-font-mono`             | `ui-monospace, SFMono-Regular, …`                                                                                | Code snippets                             |
| `--ds-font-size-*`           | `3xs` 0.6875rem → `5xl` fluid `clamp(2.25rem, …, 3.5rem)`                                                        | Type scale; `md` (1rem) is the body floor |
| `--ds-line-height-tight`     | `1.1`                                                                                                            | Display headings                          |
| `--ds-line-height-snug`      | `1.25`                                                                                                           | Titles and prompts                        |
| `--ds-line-height-normal`    | `1.5`                                                                                                            | Controls and UI text                      |
| `--ds-line-height-relaxed`   | `1.65`                                                                                                           | Long copy                                 |
| `--ds-letter-spacing-tight`  | `-0.02em`                                                                                                        | Display headings                          |
| `--ds-letter-spacing-normal` | `0`                                                                                                              | Body and prompts                          |
| `--ds-letter-spacing-wide`   | `0.04em`                                                                                                         | Badges                                    |
| `--ds-letter-spacing-caps`   | `0.08em`                                                                                                         | Eyebrow labels                            |
| `--ds-font-weight-regular`   | `400`                                                                                                            | Body                                      |
| `--ds-font-weight-medium`    | `500`                                                                                                            | Question prompts                          |
| `--ds-font-weight-semibold`  | `600`                                                                                                            | Labels, buttons                           |
| `--ds-font-weight-bold`      | `700`                                                                                                            | Display titles, eyebrows                  |
| `--ds-measure-narrow`        | `34ch`                                                                                                           | Tile captions                             |
| `--ds-measure`               | `62ch`                                                                                                           | Body copy                                 |
| `--ds-measure-wide`          | `75ch`                                                                                                           | Question prompts                          |

## Tier 2 — Space, radius, elevation, motion, layout, layering (`tokens/space.css`)

| Token                           | Value                                                                                                                           | Use                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `--ds-space-*`                  | `0`, `3xs` 2px, `2xs` 4px, `xs` 8px, `sm` 12px, `md` 16px, `lg` 24px, `xl` 32px, `2xl` 40px, `3xl` 48px, `4xl` 64px, `5xl` 80px | 4px-base spacing scale (2px step for hairlines)                                |
| `--ds-space-fluid-lg`           | `clamp(1.5rem, 1rem + 2vw, 2.5rem)`                                                                                             | Section rhythm                                                                 |
| `--ds-space-fluid-xl`           | `clamp(2rem, 1.25rem + 3vw, 4rem)`                                                                                              | Panel padding                                                                  |
| `--ds-radius-*`                 | `xs` 4px, `sm` 8px, `md` 10px, `lg` 14px, `xl` 20px, `2xl` 28px, `pill` 999px                                                   | True to the reference: `md` for tiles, `2xl` for panels                        |
| `--ds-shadow-*`                 | `1` resting → `4` floating, plus `panel`                                                                                        | Elevation ramp                                                                 |
| `--ds-shadow-inset-hairline`    | inset 1px ink hairline                                                                                                          | Subtle inset definition                                                        |
| `--ds-duration-*`               | `instant` 80ms, `fast` 140ms, `base` 220ms, `slow` 340ms, `slower` 560ms                                                        | Motion steps                                                                   |
| `--ds-ease-standard`            | `cubic-bezier(0.2, 0, 0, 1)`                                                                                                    | State changes                                                                  |
| `--ds-ease-emphasized`          | `cubic-bezier(0.2, 0.9, 0.1, 1)`                                                                                                | Entrances                                                                      |
| `--ds-ease-exit`                | `cubic-bezier(0.4, 0, 1, 1)`                                                                                                    | Exits                                                                          |
| `--ds-ease-spring`              | `cubic-bezier(0.34, 1.42, 0.64, 1)`                                                                                             | Selected-tile confirmation                                                     |
| `--ds-enter-distance`           | `0.625rem`                                                                                                                      | Entrance travel distance (collapses to `0` under reduced motion)               |
| `--ds-enter-delay`              | `0ms`                                                                                                                           | Stagger knob, overridden per list item                                         |
| `--ds-container-max`            | `72rem`                                                                                                                         | Canvas content width                                                           |
| `--ds-container-pad`            | `clamp(1rem, 4vw, 2rem)`                                                                                                        | Canvas gutters                                                                 |
| `--ds-panel-max`                | `60rem`                                                                                                                         | Survey panel width                                                             |
| `--ds-touch-target`             | `2.75rem` (44px)                                                                                                                | Minimum interactive size                                                       |
| `--ds-sidebar-width`            | `19rem`                                                                                                                         | Survey navigation rail                                                         |
| `--ds-icon-size`                | `1.25rem`                                                                                                                       | Default icon/marker size                                                       |
| `--ds-layout-*`                 | `xs` 1rem, `sm` 1.5rem, `md` 2rem, `lg` 2.5rem, `xl` 3rem, `2xl` 3.5rem                                                         | Component-internal layout steps that must not collide with the spacing scale   |
| `--ds-control-height`           | `calc(var(--ds-space-sm) * 2 + var(--ds-line-height-normal) * var(--ds-font-size-lg) + 2 * 1px)`                                | Height of every single-line answer control (text box, dropdown field)          |
| `--ds-select-list-max-height`   | `min(16rem, 32vh)`                                                                                                              | Viewport of an open option list inside the dropdown panel                      |
| `--ds-select-panel-max-height`  | `min(20rem, 45vh)`                                                                                                              | Ceiling for the whole dropdown panel (filter + option list)                    |
| `--ds-select-option-min-height` | `var(--ds-touch-target)`                                                                                                        | Minimum row height of a dropdown option                                        |
| `--ds-bp-*`                     | `sm` 30rem, `md` 48rem, `lg` 64rem, `xl` 80rem                                                                                  | Breakpoint contract (media queries use these values literally)                 |
| `--ds-z-*`                      | `sticky` 10, `active-card` 20, `overlay` 40, `modal` 50, `toast` 60                                                             | Layering contract; `active-card` lifts the card that owns an open option panel |

## Tier 2 — Icon masks (`tokens/icons.css`)

Alpha masks painted with `background-color`, so icons inherit the current state colour and
are never announced by screen readers (every state that uses one also carries a text or
`aria-*` cue).

| Token               | Use                                     |
| ------------------- | --------------------------------------- |
| `--ds-icon-check`   | Answered/complete cues, checked choices |
| `--ds-icon-alert`   | Error and warning cues                  |
| `--ds-icon-info`    | Informational alerts                    |
| `--ds-icon-chevron` | Disclosure affordance                   |
| `--ds-icon-search`  | Dropdown filter field                   |
| `--ds-icon-close`   | Clear/dismiss affordance                |
| `--ds-icon-file`    | Attachment list items                   |

## Contrast requirements (enforced by the automated check)

Every pair below is asserted by `CONTRAST_PAIRS` in
`src/app/shared/design-system/design-token.contract.ts`.

| Pair                                                                                                                                                                                                                     | Minimum ratio                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `--ds-color-text`, `--ds-color-text-secondary`, `--ds-color-text-muted` on `--ds-color-surface` and `--ds-color-surface-muted`                                                                                           | 4.5:1                                        |
| `--ds-color-text-subtle` on `--ds-color-surface`                                                                                                                                                                         | 3:1 (large text only — documented exception) |
| `--ds-color-primary`, `--ds-color-selection`, `--ds-color-success`, `--ds-color-warning`, `--ds-color-danger` on `--ds-color-surface`                                                                                    | 4.5:1                                        |
| `--ds-color-danger-strong` on `--ds-color-danger-soft`, `--ds-color-success` on `--ds-color-success-soft`, `--ds-color-warning` on `--ds-color-warning-soft`                                                             | 4.5:1                                        |
| `--ds-color-text-on-canvas`, `--ds-color-text-muted-on-canvas`, `--ds-color-primary` on `--ds-color-canvas`                                                                                                              | 4.5:1                                        |
| `--ds-color-text-on-primary` on `--ds-color-primary`, `--ds-color-text-on-selection` on `--ds-color-selection`, `--ds-color-text-on-success` on `--ds-color-success`, `--ds-color-text-on-danger` on `--ds-color-danger` | 4.5:1                                        |
| `--ds-color-border-interactive` on `--ds-color-surface`                                                                                                                                                                  | 3:1                                          |
| `--ds-color-selection` on `--ds-color-surface` and on `--ds-color-surface-muted` (selected-state identification)                                                                                                         | 3:1                                          |
| `--ds-color-focus-ring-core` on `--ds-color-surface` and on `--ds-color-canvas`                                                                                                                                          | 3:1                                          |

## Documented exception

Answer tiles use the reference's borderless neutral fill (`--ds-color-surface-tile`,
`#e5e5e5`) whose 1.28:1 ratio against the white panel is below the 3:1 non-text threshold.
This is accepted because the tile boundary is not what identifies the control: every tile
carries a persistent text or numeric label with at least 12:1 contrast, and the state change
(selected) is carried by the selection fill at 9.18:1 plus a non-colour cue (check mark and
`aria-checked`), which the automated check enforces. Controls whose border is the only
affordance (inputs, buttons, the step rail) use `--ds-color-border-interactive` at 3.23:1 or
stronger.
