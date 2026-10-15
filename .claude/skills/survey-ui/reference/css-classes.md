# Contract: Design System Classes

**Feature**: [004-survey-design-system](../spec.md) | **Layer**: `src/styles/`

Design-system classes are prefixed `ds-` and are BEM-ish: a block name, a `__part` suffix,
a `--variant` suffix, and an `is-state` class combine into one selector. They may be used by
any screen in the application, and they are what the survey components are styled with. The
automated check fails when a class exists in the shipped CSS but is not documented here, or
when a documented class no longer exists.

Size and motion values always come from tokens; the contract does not restate them.

## Layout — `layout/composition.css`

| Class                                                                                                  | Behaviour                                                              |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `.ds-container`                                                                                        | Centres content, applies the gutter token, caps at the container width |
| `.ds-container--narrow`                                                                                | Narrower cap for survey panels                                         |
| `.ds-section`                                                                                          | Vertical rhythm between sections (sibling combinators apply the gap)   |
| `.ds-section--tight`                                                                                   | Tighter section rhythm                                                 |
| `.ds-section--loose`                                                                                   | Looser section rhythm                                                  |
| `.ds-stack`                                                                                            | Vertical flow with a token gap                                         |
| `.ds-stack--2xs`, `.ds-stack--xs`, `.ds-stack--sm`, `.ds-stack--lg`, `.ds-stack--xl`, `.ds-stack--2xl` | Stack gap steps                                                        |
| `.ds-cluster`                                                                                          | Wrapping inline flow with consistent gaps                              |
| `.ds-cluster--start`                                                                                   | Cluster aligned to the start                                           |
| `.ds-cluster--between`                                                                                 | Cluster spread to the edges                                            |
| `.ds-grid`                                                                                             | Intrinsic grid, one column on mobile                                   |
| `.ds-grid--min-sm`, `.ds-grid--min-md`, `.ds-grid--min-lg`                                             | Grid column minimums                                                   |
| `.ds-split`                                                                                            | Stacked on mobile, rail + content from `--ds-bp-md` upwards            |
| `.ds-rail`                                                                                             | Sticky sidebar column                                                  |
| `.ds-mobile-only`                                                                                      | Visible below `--ds-bp-md` only                                        |
| `.ds-desktop-only`                                                                                     | Visible from `--ds-bp-md` upwards only                                 |

## Surfaces — `components/card.css`

| Class                                                      | Behaviour                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| `.ds-card`                                                 | White surface, hairline border, card radius, resting elevation |
| `.ds-card--panel`                                          | Large panel: panel radius, panel shadow, fluid padding         |
| `.ds-card--question`                                       | Question card with fluid padding                               |
| `.ds-card--raised`                                         | Higher elevation                                               |
| `.ds-card--flat`                                           | No shadow, subtle border                                       |
| `.ds-card--quiet`                                          | Muted fill, no border or shadow                                |
| `.ds-card--pad-sm`, `.ds-card--pad-md`, `.ds-card--pad-lg` | Padding steps                                                  |
| `.ds-card--pad-flush`                                      | No padding (for media/edge-to-edge content)                    |
| `.ds-card__header`                                         | Card header row                                                |
| `.ds-card__title`                                          | Display-role card title                                        |
| `.ds-card__eyebrow`                                        | Eyebrow slot                                                   |
| `.ds-card__body`                                           | Main content slot                                              |
| `.ds-card__footer`                                         | Footer row with spread alignment                               |
| `.ds-card__aside`                                          | Right-aligned aside                                            |
| `.ds-card__media`                                          | Centred media slot                                             |

States applied as classes on `.ds-card`: `is-interactive`, `is-answered` (success accent +
check cue), `is-invalid` (danger border/tint + alert cue), `is-complete`, `is-disabled`.

## Buttons — `components/button.css`

| Class                        | Behaviour                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| `.ds-btn`                    | Base button: 44px minimum height, primary brand variant by default |
| `.ds-btn--secondary`         | Selection-blue variant (secondary brand role)                      |
| `.ds-btn--outline`           | Transparent with brand border                                      |
| `.ds-btn--ghost`             | Transparent until hovered                                          |
| `.ds-btn--subtle`            | Muted surface, neutral label                                       |
| `.ds-btn--danger`            | Danger fill                                                        |
| `.ds-btn--sm`, `.ds-btn--lg` | Size steps                                                         |
| `.ds-btn--pill`              | Fully rounded                                                      |
| `.ds-btn--block`             | Full-width                                                         |
| `.ds-btn--icon`              | Square icon-only target                                            |

## Fields, choices, tiles, files — `components/field.css`

| Class                                                      | Behaviour                                              |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `.ds-field`                                                | Field wrapper owning label, hint, control, and message |
| `.ds-field__label`                                         | Field label                                            |
| `.ds-field__label--required`                               | Adds the required marker                               |
| `.ds-field__hint`                                          | Supporting text                                        |
| `.ds-field__message`                                       | Inline message slot                                    |
| `.ds-field__message--error`, `.ds-field__message--success` | Message tones                                          |
| `.ds-input`                                                | Text input shell                                       |
| `.ds-textarea`                                             | Multi-line input shell                                 |
| `.ds-select`                                               | Native select shell                                    |
| `.ds-choice`                                               | Radio/checkbox row whose hit area is the whole row     |
| `.ds-choice__control`                                      | Custom-drawn radio/checkbox control                    |
| `.ds-choice__label`                                        | Option label                                           |
| `.ds-choice__hint`                                         | Option description                                     |
| `.ds-tile-group`                                           | Tile grid                                              |
| `.ds-tile-group--icons`                                    | Tile grid sized for icon tiles                         |
| `.ds-tile`                                                 | Answer tile                                            |
| `.ds-tile__value`                                          | Tile number/value                                      |
| `.ds-tile__icon`                                           | Tile icon                                              |
| `.ds-tile__caption`                                        | Tile caption                                           |
| `.ds-file`                                                 | File field wrapper                                     |
| `.ds-file__input`                                          | Dashed drop-zone input                                 |
| `.ds-file__list`                                           | Selected file list                                     |
| `.ds-file__item`                                           | Selected file row                                      |

Invalid states are driven by `[aria-invalid="true"]` on the control or the `.ds-field` /
`.ds-tile` state class, never by colour alone. Tile selection uses `.ds-tile.is-selected`;
choice selection is the native `:checked` state.

## Progress and steps — `components/progress.css`

| Class                                                          | Behaviour                                        |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `.ds-progress`                                                 | Progress wrapper                                 |
| `.ds-progress--sm`, `.ds-progress--lg`                         | Track thickness steps                            |
| `.ds-progress--indeterminate`                                  | Travelling indeterminate fill                    |
| `.ds-progress__track`                                          | Track                                            |
| `.ds-progress__fill`                                           | Animated fill (primary by default)               |
| `.ds-progress__fill--selection`, `.ds-progress__fill--success` | Fill tones                                       |
| `.ds-progress__value`                                          | Percentage/meta text                             |
| `.ds-steps`                                                    | Step list wrapper                                |
| `.ds-steps--compact`                                           | Marker-only mobile rail                          |
| `.ds-steps--horizontal`                                        | Horizontal step layout                           |
| `.ds-steps__list`                                              | List reset                                       |
| `.ds-step`                                                     | Step control: marker + label, keyboard reachable |
| `.ds-step__marker`                                             | Number badge                                     |
| `.ds-step__label`                                              | Step title                                       |

Step states: `.ds-step.is-current`, `.ds-step.is-complete` (adds a check cue),
`.ds-step.is-upcoming`, and `:disabled` for unreachable steps.

## Feedback — `components/feedback.css`

| Class                                                                                                         | Behaviour                                         |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `.ds-alert`                                                                                                   | Informational message block with a generated icon |
| `.ds-alert--error`                                                                                            | Error tone (alert icon)                           |
| `.ds-alert--warning`                                                                                          | Warning tone (alert icon)                         |
| `.ds-alert--success`                                                                                          | Success tone (check icon)                         |
| `.ds-alert--quiet`                                                                                            | Neutral tone                                      |
| `.ds-alert__icon`                                                                                             | Icon slot for markup-supplied icons               |
| `.ds-alert__title`                                                                                            | Alert headline                                    |
| `.ds-alert__body`                                                                                             | Alert body                                        |
| `.ds-badge`                                                                                                   | Neutral status pill                               |
| `.ds-badge--primary`, `.ds-badge--selection`, `.ds-badge--success`, `.ds-badge--warning`, `.ds-badge--danger` | Badge tones                                       |
| `.ds-badge--outline`                                                                                          | Outlined badge                                    |
| `.ds-status`                                                                                                  | Inline status text with a leading dot             |
| `.ds-status--success`, `.ds-status--danger`, `.ds-status--muted`                                              | Status tones                                      |

## Typography roles — `base/elements.css`

| Class         | Behaviour                                          |
| ------------- | -------------------------------------------------- |
| `.ds-display` | Serif display role (survey title)                  |
| `.ds-title`   | Serif section title                                |
| `.ds-heading` | Sans section heading                               |
| `.ds-prompt`  | Question prompt role (large, muted, medium weight) |
| `.ds-body`    | Body copy with measure cap                         |
| `.ds-support` | Helper/status text                                 |
| `.ds-eyebrow` | Uppercase tracked label                            |
| `.ds-numeric` | Tabular numerals                                   |
| `.ds-prose`   | Vertical rhythm for prose blocks                   |

## Accessibility helpers — `base/a11y.css`

| Class                 | Behaviour                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `.ds-sr-only`         | Visually hidden but available to assistive technology            |
| `.ds-skip-link`       | Keyboard-revealed skip link                                      |
| `.ds-focus-ring-self` | Opts a control into the shared focus ring                        |
| `.ds-contrast-safe`   | Neutralises text shadows / forces color adjustments for contrast |

## Motion — `components/motion.css`

| Class                 | Behaviour                                            |
| --------------------- | ---------------------------------------------------- |
| `.ds-enter`           | Fade entrance, delay from `--ds-enter-delay`         |
| `.ds-enter--rise`     | Fade + rise entrance                                 |
| `.ds-enter--slide`    | Fade + slide entrance                                |
| `.ds-enter--pop`      | Fade + scale entrance                                |
| `.ds-anim-select`     | Selected-state confirmation pulse                    |
| `.ds-anim-progress`   | Tokenised progress tween                             |
| `.ds-anim-hover-lift` | Pointer hover elevation (hover-capable devices only) |
| `.ds-anim-shimmer`    | Loading shimmer                                      |

Every class in this file is neutralised by the global `prefers-reduced-motion: reduce` block
in `base/a11y.css`; the automated check fails if that block is missing or stops collapsing
the motion tokens.

## Legacy bridge — `compat.css`

Existing templates keep their current markup, so these legacy classes are aliased onto the
design-system equivalents. New markup MUST use the `ds-` classes instead.

| Legacy class                                                                                       | Resolves to                                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `.container`, `.row`, `.col-12`, `.col-md-4`, `.col-md-8`                                          | `.ds-container` and the split-grid column math                                       |
| `.questions`, `.question-block`, `.question-block.answered`                                        | `.ds-card--question` with the answered state                                         |
| `.question-block:has(app-validation-message)`                                                      | Invalid card state (danger border/tint + alert cue)                                  |
| `.form-group`, `.question-fieldset`, `.text-question`                                              | Field/fieldset reset with the prompt role on `legend`                                |
| `.form-label`, `.form-control`, `.form-check`, `.form-check-input`, `.form-check-label`, `.choice` | `.ds-field__label`, `.ds-input`, `.ds-choice*`                                       |
| `.progress-bar`, `.progress-fill`, `.progress-text`                                                | `.ds-progress` parts                                                                 |
| `.page-step`, `.step-number`, `.step-title`, `.survey-navigation li.active/.completed`             | `.ds-step` parts and states                                                          |
| `.submission-status`                                                                               | Quiet status strip (hidden while empty)                                              |
| `app-validation-message`                                                                           | Error alert with icon, entrance animation, and `role="alert"` from markup            |
| `.survey-shell`, `.survey-layout`, `.survey-header`, `.survey-content`                             | Container, split grid, and panel/question cards                                      |
| `.menu-toggle`, `.burger-icon`, `.mobile-menu-*`, `.survey-menu-backdrop`                          | Mobile drawer composition built from tokens                                          |
| `.rating-question`, `.rating-options`, `.rating-option`, `.rating-labels`                          | Tile group / selected-state composition                                              |
| `.satisfaction-question`, `.satisfaction-options`, `.satisfaction-option`, `.satisfaction-icon`    | Icon tile composition                                                                |
| `.file-upload`                                                                                     | File field composition                                                               |
| `.completion-summary`, `.completion-eyebrow`, `.completion-percentage`                             | Complete-state card                                                                  |
| `.eyebrow`, `.description`                                                                         | `.ds-eyebrow`, `.ds-support`                                                         |
| `p-select`, `p-togglebutton`                                                                       | `integrations/primeng.css` maps the library's `--p-*` variables onto `--ds-*` tokens |
