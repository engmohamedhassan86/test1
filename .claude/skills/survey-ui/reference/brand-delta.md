# Contract Delta: Survey Dock Brand Tokens & Roles

**Feature**: [006-survey-dock-brand](../spec.md) | **Deltas**:
[004 design-tokens.md](../../004-survey-design-system/contracts/design-tokens.md) (read both together)

This file documents every token ADDED, every role RE-POINTED, and every contrast pair
ADDED by the dock-brand rebrand. The automated check merges the documented tokens from
this file with the 004 token contract: a shipped token must be documented in exactly
that union, and a token documented here must ship. Families use a trailing-asterisk
wildcard form the check understands (for example, `--ds-gold-*` covers the gold ramp).

## 1. New primitive ramps (`tokens/primitives.css`)

Sampled from `public/index.html`. Light → dark.

### Gold ramp `--ds-gold-*`

| Token           | Value     | Intended use                                                                                                           |
| --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--ds-gold-100` | `#fbf3d9` | Soft gold tint (info/accent fills)                                                                                     |
| `--ds-gold-200` | `#f7e8b5` | Hover wash on gold-tinted surfaces                                                                                     |
| `--ds-gold-300` | `#f3e5ab` | Gold text on dark maroon (dock labels, 13.78:1 on `#3d000f`)                                                           |
| `--ds-gold-400` | `#e6ca65` | Gradient midpoint (decorative)                                                                                         |
| `--ds-gold-500` | `#d4af37` | Decorative gold: gradients, ring stroke, medallion. MUST NOT carry text or meaning on light surfaces (2.10:1 on white) |
| `--ds-gold-600` | `#b89320` | Gradient depth (decorative only, 2.90:1 on white)                                                                      |
| `--ds-gold-700` | `#8f6f16` | Functional gold: star/symbol fills and gold text on light surfaces (4.72:1 on white)                                   |

### Cream ramp `--ds-cream-*`

| Token            | Value     | Intended use                                   |
| ---------------- | --------- | ---------------------------------------------- |
| `--ds-cream-50`  | `#fcfcf9` | Lightest wash (card header gradient end)       |
| `--ds-cream-100` | `#faf7f2` | Page canvas; topbar blur base                  |
| `--ds-cream-200` | `#f2eae0` | Canvas-adjacent fills (question cards, tracks) |
| `--ds-cream-300` | `#e5d7c5` | Borders on cream; summary panel fill           |
| `--ds-cream-400` | `#d3c1a4` | Strong borders/dividers on cream               |

### Red ramp `--ds-red-*` (errors read rose, per the reference)

| Token          | Value     | Intended use                           |
| -------------- | --------- | -------------------------------------- |
| `--ds-red-50`  | `#fef2f2` | Error message fill                     |
| `--ds-red-100` | `#fee2e2` | Error hover/step tint                  |
| `--ds-red-200` | `#fecaca` | Error borders                          |
| `--ds-red-600` | `#e11d48` | Error text and icons (4.70:1 on white) |
| `--ds-red-700` | `#be123c` | Strong error text on tinted fills      |

### Maroon depth + dock alphas

The deep maroon steps are re-anchored to the reference values (tints `--ds-maroon-50`
through `--ds-maroon-600` are unchanged):

| Token                   | Old value | New value |
| ----------------------- | --------: | --------: |
| `--ds-maroon-700`       | `#800000` | `#800020` |
| `--ds-maroon-800`       | `#5c0000` | `#540015` |
| `--ds-maroon-900`       | `#3d0000` | `#3d000f` |
| `--ds-maroon-950` (new) |         — | `#25000a` |

| Token                  | Value                    | Intended use                                  |
| ---------------------- | ------------------------ | --------------------------------------------- |
| `--ds-maroon-950`      | `#25000a`                | Dock gradient root; darkest on-dark text base |
| `--ds-alpha-maroon-7`  | `rgb(128 0 32 / 7%)`     | Canvas dot pattern                            |
| `--ds-alpha-gold-22`   | `rgb(212 175 55 / 22%)`  | Gold ambient wash                             |
| `--ds-alpha-gold-30`   | `rgb(212 175 55 / 30%)`  | Ring glow, gold focus halo on dark            |
| `--ds-alpha-maroon-35` | `rgb(128 0 32 / 35%)`    | Maroon ambient wash                           |
| `--ds-alpha-cream-60`  | `rgb(250 247 242 / 60%)` | Drawer scrim tint over light content          |

### Icon masks (`tokens/icons.css`)

| Token                    | Glyph                     | Used for                                                                  |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- |
| `--ds-icon-star`         | five-point star           | Rating symbol (decorative; value carried by the readout + `aria-checked`) |
| `--ds-icon-shield-check` | shield + check            | Dock security note, encrypted-submission cue                              |
| `--ds-icon-clipboard`    | clipboard + question mark | Dock brand mark fallback, page-icon default                               |
| `--ds-icon-chevrons`     | double chevron            | Dock collapse/expand control                                              |
| `--ds-icon-chevron`      | single chevron            | Step-state cue (T020)                                                     |
| `--ds-icon-close`        | close X                   | Drawer close control (T018)                                               |
| `--ds-icon-menu`         | hamburger                 | Topbar drawer toggle (T022)                                               |
| `--ds-icon-clock`        | clock face                | Time-estimate pill (T022)                                                 |
| `--ds-icon-id-card`      | identity card             | Page-icon key `id-card` (T024)                                            |
| `--ds-icon-file-shield`  | verified file             | Page-icon key `file-shield` (T024)                                        |
| `--ds-icon-laptop-file`  | laptop                    | Page-icon key `laptop-file` (T024)                                        |
| `--ds-icon-upload`       | cloud + arrow             | File dropzone glyph                                                       |

Masks are black-geometry SVG data URIs tinted via `background-color`, exactly like the
existing `--ds-icon-*` set. Glyph choice never carries state alone — every icon ships
with adjacent text or an `aria-*` cue.

## 2. Re-pointed semantic roles (`tokens/semantic.css`)

| Role                          | Old target                    | New target                          | Why                                      |
| ----------------------------- | ----------------------------- | ----------------------------------- | ---------------------------------------- |
| `--ds-color-canvas`           | `--ds-pink-400`               | `--ds-cream-100`                    | Cream page canvas                        |
| `--ds-color-canvas-subtle`    | `--ds-pink-50`                | `--ds-cream-50`                     | Lightest canvas wash                     |
| `--ds-color-canvas-strong`    | `--ds-pink-500`               | `--ds-cream-200`                    | Canvas-adjacent fills                    |
| `--ds-color-selection`        | `--ds-blue-600`               | `--ds-maroon-700` (`#800020`)       | Selected answers read maroon             |
| `--ds-color-selection-strong` | `--ds-blue-700`               | `--ds-maroon-800`                   | Pressed/hover selection                  |
| `--ds-color-selection-hover`  | `--ds-blue-700`               | `--ds-maroon-800`                   | Hover selection                          |
| `--ds-color-selection-soft`   | `--ds-blue-50`                | `--ds-maroon-50`                    | Selected-option tint                     |
| `--ds-color-selection-border` | `--ds-blue-200`               | `--ds-maroon-200`                   | Selected-option border                   |
| `--ds-color-tertiary`         | `--ds-pink-400`               | `--ds-cream-200`                    | Tertiary = cream, standalone-safe        |
| `--ds-color-tertiary-soft`    | `--ds-pink-100`               | `--ds-cream-100`                    | Tertiary soft                            |
| `--ds-color-tertiary-strong`  | `--ds-pink-700`               | `--ds-maroon-700`                   | Tertiary emphasis (maroon, for contrast) |
| `--ds-color-tertiary-border`  | `--ds-pink-300`               | `--ds-cream-300`                    | Tertiary border                          |
| `--ds-color-danger`           | `--ds-danger-600` (maroon)    | `--ds-red-600`                      | Rose error text                          |
| `--ds-color-danger-strong`    | `--ds-danger-700` (maroon)    | `--ds-red-700`                      | Strong error text                        |
| `--ds-color-danger-soft`      | `--ds-danger-50` (maroon)     | `--ds-red-50`                       | Error message fill                       |
| `--ds-color-danger-border`    | `--ds-danger-200` (maroon)    | `--ds-red-200`                      | Error borders                            |
| `--ds-color-focus-ring-core`  | `--ds-color-selection` (blue) | `--ds-color-selection` (now maroon) | Maroon focus, via the same indirection   |
| `--ds-color-focus-ring`       | `--ds-alpha-blue-30`          | `--ds-alpha-maroon-16`              | Maroon focus halo                        |

Unchanged and still shipped: the pink, blue, neutral, success, warning, and info ramps
(the info role keeps the blue ramp so informational cues stay distinct from brand
maroon), all text roles, all border roles, and the primary brand roles (already maroon).

## 3. New semantic roles

| Role                            | Target                                                     | Intended use                                                          |
| ------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `--ds-color-accent`             | `--ds-gold-700`                                            | Functional gold: stars, symbols, gold text on light                   |
| `--ds-color-accent-strong`      | `--ds-gold-700`                                            | Pressed/hover functional gold                                         |
| `--ds-color-accent-soft`        | `--ds-gold-100`                                            | Gold-tinted fills                                                     |
| `--ds-color-accent-border`      | `--ds-gold-300`                                            | Gold borders on light; dividers on dark                               |
| `--ds-color-accent-decorative`  | `--ds-gold-500`                                            | Bright gold for gradients/strokes only — MUST NOT carry text on light |
| `--ds-color-accent-on-dark`     | `--ds-gold-300`                                            | Gold text on the dock (13.78:1 on `#3d000f`)                          |
| `--ds-color-text-on-accent`     | `--ds-maroon-900`                                          | Dark text on gold fills, e.g. the submit action (8.29:1)              |
| `--ds-color-surface-dock`       | `--ds-maroon-950`                                          | Dock gradient root                                                    |
| `--ds-color-surface-dock-end`   | `--ds-maroon-700`                                          | Dock gradient end                                                     |
| `--ds-color-text-on-dock`       | `#ffffff` (via `--ds-neutral-0`)                           | Primary dock text (17.42:1 on `#3d000f`)                              |
| `--ds-color-text-muted-on-dock` | `--ds-gold-200`                                            | Secondary dock text                                                   |
| `--ds-color-border-on-dock`     | `rgb(255 255 255 / 12%)` (new alpha `--ds-alpha-white-12`) | Dock hairlines and step-button borders                                |

## 4. Shell layout tokens (`tokens/space.css`, `tokens/typography.css`)

| Token                        | Value                  | Intended use                                                                              |
| ---------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `--ds-dock-width`            | `20.125rem`            | Expanded dock, desktop (322 px @16)                                                       |
| `--ds-dock-rail-width`       | `6rem`                 | Collapsed icon rail, desktop (96 px @16)                                                  |
| `--ds-drawer-width`          | `min(20.625rem, 88vw)` | Mobile drawer (330 px cap, 88% viewport ceiling)                                          |
| `--ds-dock-breakpoint`       | `64rem`                | Documents the dock/drawer switch; queries use the `64rem` literal                         |
| `--ds-ring-size`             | `3.625rem`             | Dock progress ring (58 px @16)                                                            |
| `--ds-topbar-height`         | `4.25rem`              | Sticky topbar height, desktop (68 px @16)                                                 |
| `--ds-toast-duration`        | `2600ms`               | Toast auto-dismiss (informational; the timer reads it, motion collapse does not alter it) |
| `--ds-content-max`           | `48rem`                | Survey content column cap (reference `max-w-3xl`)                                         |
| `--ds-topbar-max`            | `56rem`                | Topbar inner cap (reference `max-w-4xl`)                                                  |
| `--ds-toast-max`             | `min(92vw, 32rem)`     | Toast width ceiling                                                                       |
| `--ds-font-weight-extrabold` | `800`                  | Brand heading weight                                                                      |

## 5. Contrast pairs ADDED (verified by the check; machine-computed ratios)

| Pair                      | Foreground → Background                                       | Minimum | Measured |
| ------------------------- | ------------------------------------------------------------- | ------: | -------: |
| dock primary text         | `--ds-color-text-on-dock` on `--ds-color-surface-dock`        |     4.5 |    17.42 |
| dock gold labels          | `--ds-color-accent-on-dark` on `--ds-color-surface-dock`      |     4.5 |    13.78 |
| dock muted text           | `--ds-color-text-muted-on-dock` on `--ds-color-surface-dock`  |     4.5 |  (check) |
| submit label              | `--ds-color-text-on-accent` on `--ds-color-accent-decorative` |     4.5 |     8.29 |
| gold symbols              | `--ds-color-accent` on `--ds-color-surface`                   |     3.0 |     4.72 |
| maroon selection on cream | `--ds-color-selection` on `--ds-color-canvas`                 |     3.0 |    10.14 |
| maroon focus on cream     | `--ds-color-focus-ring-core` on `--ds-color-canvas`           |     3.0 |    10.14 |
| rose error text           | `--ds-color-danger` on `--ds-color-surface`                   |     4.5 |     4.70 |
| rose error on tint        | `--ds-color-danger-strong` on `--ds-color-danger-soft`        |     4.5 |  (check) |
| completed step tile       | `--ds-color-text-on-success` on step green                    |     4.5 |     5.02 |
| muted text on cream       | `--ds-color-text-muted` on `--ds-color-canvas`                |     4.5 |     4.77 |

All 004 pairs are re-verified against the re-pointed values by the same check run;
`(check)` rows are asserted by the check rather than quoted here.

## 6. Survey JSON amendment (additive, optional)

```jsonc
{
  "surveyId": "customer-feedback",
  "title": "Customer Feedback Survey",
  "version": "1.0.0",
  // NEW — all three optional; absent = previous rendering for that slot.
  "estimatedMinutes": 4, // integer 1–120; "~4 min" in the dock live-survey card
  "pages": [
    {
      "pageId": "about-you",
      "title": "About You",
      // NEW — optional page chrome copy.
      "description": "Tell us a little about yourself.", // 1–280 chars
      "icon": "id-card", // 1–32 chars; documented set in data-model.md; unknown → default icon
      "questions": [],
    },
  ],
}
```

Rules: unknown `icon` keys MUST fall back to the default page icon (never error —
forward-compatible); out-of-range `estimatedMinutes` and empty/oversize
`description`/`icon` MUST fail validation exactly like any other config error
(user-visible error, no partial render).
