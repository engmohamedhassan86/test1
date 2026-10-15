---
name: survey-ui
description: Design-system and brand rules for the Dynamic Survey Viewer's UI — token tiers, the ds- class contract, the maroon/gold/cream dock-brand rebrand, and dock/drawer shell geometry. Load before writing, editing, or reviewing any template, component CSS, or shared stylesheet under src/app/features/survey, src/app/features/survey/questions, or src/styles, or before touching anything in src/app/shared/design-system.
---

# Survey UI design system

This app renders survey UI with a two-tier CSS custom-property token system plus a
`ds-` BEM-ish class catalogue, both enforced by automated contract specs — a shipped
token or class that isn't documented in a contract fails CI, and a documented one that
stops shipping also fails. Treat the reference files below as that documentation, not
as background reading: find the one table you need and stop.

The survey UI is mid-rebrand: the shipped baseline is a pink/blue/maroon palette with a
sidebar nav (feature `004-survey-design-system`, already built). The target is a
maroon/gold/cream palette with a persistent side **dock** (desktop) that collapses to a
mobile **drawer**, specified by features `006-survey-dock-brand` and
`005-dropdown-menu-sizing` but not yet implemented in this repo — build toward it, don't
assume it already exists in `src/styles`. `reference/theme-preview.png` is the
reference screenshot of the target state (GCC Insights survey, dock-navigation
edition): maroon dock with a gold progress ring and gold labels on the left, cream page
canvas, a maroon/gold progress card, and `ds-`-styled question cards.

## Hard rules

- **Tokens, not literals.** Only `tokens/primitives.css` may contain a literal color,
  px, or ms value. Every component references a tier-2 semantic token
  (`--ds-color-*`, `--ds-space-*`, `--ds-radius-*`, `--ds-duration-*`, …).
- **`ds-` classes for new markup.** `compat.css` aliases legacy classes
  (`.form-control`, `.rating-option`, …) onto `ds-` equivalents so old templates keep
  working — that bridge is for existing markup only. New or edited markup uses the
  `ds-` classes directly.
- **State is never color-only.** Invalid = `[aria-invalid="true"]` + `.ds-field`/`.ds-tile`
  state class + an alert icon, not a red border alone. Selected = native `:checked` or
  `.is-selected` + a check-mark cue. Tile selection is a non-color cue plus text/number,
  because answer tiles' border contrast is deliberately below 3:1 (documented exception
  in `reference/design-tokens.md`).
- **Fails closed.** An unknown `icon` key in survey JSON falls back to the default page
  icon; an out-of-range `estimatedMinutes` or an oversize `description`/`icon` string is
  a validation error with a user-visible error screen — never a half-rendered page or a
  silently-dropped field. This is the same fail-closed rule as the rest of the app (see
  the project `CLAUDE.md`), applied to the new optional survey-JSON fields in
  `reference/brand-delta.md` §6.
- **Motion is opt-out, not opt-in.** Any `.ds-anim-*` or `.ds-enter*` class must stay
  collapsed by the global `prefers-reduced-motion: reduce` block in `base/a11y.css` —
  don't add a motion class without checking that block still neutralizes it.
- **Dock/drawer geometry is derived, not eyeballed.** Dock, rail, drawer, topbar,
  ring, and toast sizes all come from the tokens in `reference/shell-sizes.md` §1 — if a
  size isn't driven by a listed token, it's wrong, not a new special case.

## Reference files — read the one that answers your question

- `reference/design-tokens.md` — full tier-1 primitive and tier-2 semantic token
  tables (color, typography, space, radius, elevation, motion, layout, z-index) for
  the **shipped baseline**, plus the contrast-ratio matrix enforced by
  `src/app/shared/design-system/design-token.contract.spec.ts`. Start here for "what
  token do I use for X" or "is this contrast pair allowed."
- `reference/css-classes.md` — the full `ds-` class catalogue (layout, cards, buttons,
  fields/choices/tiles/files, progress/steps, feedback, typography, a11y helpers,
  motion) and the legacy `compat.css` alias table. Start here for "what class renders
  this" or "what does this existing class do."
- `reference/brand-delta.md` — every token the dock-brand rebrand ADDS or RE-POINTS
  on top of `design-tokens.md` (gold/cream/red ramps, re-pointed selection/danger/
  tertiary roles, new dock-specific roles, new icon masks) plus the added contrast
  pairs and the optional survey-JSON fields (`estimatedMinutes`, page `description`,
  page `icon`). Start here for anything maroon/gold/cream, or dock-specific.
- `reference/shell-sizes.md` — the geometry rules and measured values (at 320/375/768/
  1280/1440 px) for the dock, collapsed rail, mobile drawer, topbar, progress ring,
  progress card, survey card, mobile step pills, and toast. Start here for any dock or
  drawer layout/sizing question.
- `reference/theme-preview.png` — the reference screenshot. Check it when a token
  table leaves a visual judgment call (e.g. exact gradient feel, icon style) — the
  tables are the contract, the screenshot is the sanity check.

Don't open all four reference files for one question — each is self-contained for its
slice of the system, and only `design-tokens.md` + `brand-delta.md` overlap (brand-delta
assumes you already have design-tokens open for the unchanged ramps).
