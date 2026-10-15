# Contract: Survey Dock Shell Geometry

**Feature**: [006-survey-dock-brand](../spec.md) | **Companion**:
[005 ui-sizes.md](../../005-dropdown-menu-sizing/contracts/ui-sizes.md) (question-surface
geometry, unchanged) · [brand-delta.md](brand-delta.md) (tokens that drive these sizes)

This file states the geometry rules for the dock shell — dock, rail, drawer, topbar,
progress card, survey card, ring, pills, and toast — plus the measured values at the five
documented viewports. Derivations are normative (a reviewer re-derives them from tokens);
measured values are recorded during implementation with a 16 px root font and default
browser settings, exactly like the 005 contract.

## 1. Rules

| #    | Surface                          | Rule                                                                                                                                                                                                                                                                                                                                                                       | Driving token(s)                                                           |
| ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| R-01 | Expanded dock (desktop ≥1024 px) | Fixed to the viewport's inline-start, full height, exactly `--ds-dock-width`; the main column is offset by the same width                                                                                                                                                                                                                                                  | `--ds-dock-width`                                                          |
| R-02 | Collapsed rail (desktop)         | Exactly `--ds-dock-rail-width`; shows step tiles + compact progress only; labels hidden, not merely transparent (no accessible-name loss: tiles keep `aria-label`)                                                                                                                                                                                                         | `--ds-dock-rail-width`                                                     |
| R-03 | Mobile drawer (<1024 px)         | Slide-in panel exactly `--ds-drawer-width` = `min(20.625rem, 88vw)`; dimmed blurred backdrop covers the viewport; body content never shifts                                                                                                                                                                                                                                | `--ds-drawer-width`, `--ds-z-modal`, `--ds-z-overlay`                      |
| R-04 | Dock step region                 | Independently scrollable (`overflow-y: auto`) between a fixed header and a fixed footer; a 12-step survey scrolls the list, never the page                                                                                                                                                                                                                                 | — (structural)                                                             |
| R-05 | Progress ring                    | `--ds-ring-size` square; stroke from the gold decorative role; percentage centered in tabular numerals                                                                                                                                                                                                                                                                     | `--ds-ring-size`, `--ds-color-accent-decorative`                           |
| R-06 | Topbar                           | Sticky, `--ds-topbar-height`, frosted (`--ds-alpha-white-80` + blur), inner capped at `--ds-topbar-max`; contains menu toggle (44 px target), breadcrumb, and title — all three visible at 320 px                                                                                                                                                                          | `--ds-topbar-height`, `--ds-topbar-max`, `--ds-touch-target`               |
| R-07 | Progress card                    | Full content width; page pill + percent row, gradient bar (`--ds-space-2xs` track), answered-count row                                                                                                                                                                                                                                                                     | `--ds-space-*`, `--ds-color-primary`, `--ds-color-accent-decorative`       |
| R-08 | Survey card                      | Content column capped at `--ds-content-max`, `--ds-radius-2xl`, white elevated; header gradient cream-100 → white; footer actions row wraps without overlap at 320 px                                                                                                                                                                                                      | `--ds-content-max`, `--ds-radius-2xl`, `--ds-shadow-panel`, `--ds-cream-*` |
| R-09 | Mobile step pills                | Wrapped strip under the topbar; pills are non-interactive, `aria-hidden` indicators (`--ds-space-xl` squares) redundant with the dock steps, hence exempt from the 44 px target rule (WCAG 2.2 target size covers interactive controls); current position is also announced via the visually-hidden page summary; current/completed/upcoming distinguishable without color | `--ds-space-xl`                                                            |
| R-10 | Toast                            | Fixed bottom-center, max `--ds-toast-max`; auto-dismiss per `--ds-toast-duration`; never covers a footer action at 320 px (sits above it in `z`)                                                                                                                                                                                                                           | `--ds-toast-max`, `--ds-z-toast`, `--ds-toast-duration`                    |
| R-11 | Question geometry                | Unchanged: `--ds-control-height`, `--ds-select-list-max-height`, `--ds-select-panel-max-height`, `--ds-select-option-min-height`, `--ds-z-active-card` keep their 005 derivations and values                                                                                                                                                                               | 005 contract                                                               |
| R-12 | No horizontal page scroll        | At every documented viewport, no shell surface extends past the viewport; the page scrolls vertically only                                                                                                                                                                                                                                                                 | — (verified by review + SC-004)                                            |

## 2. Measured values (root 16 px; recorded during implementation)

`dock` = expanded dock width · `rail` = collapsed rail · `drawer` = drawer width ·
`top` = topbar height · `ring` = ring box · `card` = survey-card content width ·
`pill` = mobile pill height · `hscroll` = horizontal page scroll present?

| Viewport   | Shell state | dock | rail | drawer | top | ring | card | pill | hscroll |
| ---------- | ----------- | ---: | ---: | -----: | --: | ---: | ---: | ---: | :-----: |
| 320 × 640  | drawer      |    — |    — |    282 |  68 |   58 |  288 |   32 |   no    |
| 375 × 812  | drawer      |    — |    — |    330 |  68 |   58 |  343 |   32 |   no    |
| 768 × 1024 | drawer      |    — |    — |    330 |  68 |   58 |  736 |   32 |   no    |
| 1280 × 800 | dock        |  322 |   96 |      — |  68 |   58 |  768 |    — |   no    |
| 1440 × 900 | dock        |  322 |   96 |      — |  68 |   58 |  768 |    — |   no    |

Measured 2026-09-10 (T038) by re-deriving every cell from the shipped CSS with a 16 px
root (no browser ruler available in this environment; the T042 human pass confirms with
a live ruler). Drift vs. shipped CSS: 0 px on every cell.

- Drawer: `min(330, 0.88 × vw)` → 281.6 (→ 282 px) at 320; 330 cap at 375/768.
- `top`: `44 + 2 × 12` (touch toggle + `--ds-space-sm` block padding) = 68 = the
  `--ds-topbar-height` minimum at every viewport; crumbs/title ellipsis, never wrap.
- `ring`: `--ds-ring-size` = 58 at every viewport (drawer + dock alike).
- `card`: `vw − 2 × 16` below 1024 (288/343/736); `min(available, 768)` at/above 1024 —
  1280: `1280 − 322 − 2 × 40` = 878 → capped 768 centered; 1440: `1440 − 322 − 80` =
  1038 → 768 centered. Rail (96) leaves 1104/1264 available → still 768 centered.
- `pill`: `--ds-space-xl` = 32 (R-09 exemption); below 1024 px only.
- Toast max (`--ds-toast-max`): 294 at 320, 345 at 375, 512 (cap) at 768/1280/1440.
- `hscroll`: no — verified structurally (drawer/dock are `fixed`, content caps +
  `min-width: 0` chains hold); live confirmation is T042.
- A >1 px drift from the shipped CSS fails review of this contract.
- The automated check asserts the _tokens_ (existence, documentation, and use on the
  shell selectors) and the _drawer-cap formula_; the ruler values above are verified by
  the quickstart review pass, exactly as in 005.
