# Feature Specification: Survey Design System

**Feature Branch**: `001-survey-management` (feature 004 ships on the 001 branch; see
[Relationship to existing styling](#relationship-to-existing-styling))
**Created**: 2026-10-11
**Status**: Ready for planning — no open clarifications
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Input**: A token-driven survey design system for the Dynamic Survey Viewer: colour, typography,
spacing, radius, elevation and motion tokens; base styles; layout utilities; component classes (cards,
buttons, fields, choice tiles, progress, feedback); a PrimeNG token bridge; animated transitions that
respect `prefers-reduced-motion`. Maroon is primary, with documented secondary (metallic gold) and
tertiary (warm cream) roles, per the visual reference `theme-preview.png` (a GCC Insights survey demo).
Light theme only. WCAG 2.1 AA. 44px minimum touch targets. Existing `features/survey/*` components keep
their current structure — only their styling changes.

## Scope

In scope: a `--ds-*` custom-property token system (primitive + semantic tiers) for colour, typography,
spacing, radius, elevation and motion; global base styles (reset, default typography, focus ring,
reduced-motion handling); layout utility classes (container, stack, cluster, visually-hidden, skip-link);
`.ds-*` component classes for exactly six families — cards, buttons, fields, choice tiles, progress and
feedback; a CSS-level PrimeNG variable bridge; a `compat.css` layer that keeps every existing `--sv-*`
custom property and `.sv-*` class working unchanged; and an automated Vitest contract spec that fails the
build on nine named classes of drift (FR-096). Light theme only. WCAG 2.1 AA contrast. 44px minimum
touch targets at 375px and 1280px.

Out of scope: a dark theme or any `prefers-color-scheme` branch; restructuring the DOM, templates, or
TypeScript logic of `features/survey/*`; a sidebar/dashboard page shell (the chrome in the reference
screenshot belongs to the demo app around the survey, not to this viewer); new question types or
validation behaviour; build-time token generation (e.g. Style Dictionary); RTL/bidi support; custom
webfonts; motion choreography beyond simple transform/opacity transitions; and retiring `--sv-*`/`.sv-*`
usage from existing component files (tracked as a future cleanup once `compat.css` has proven itself, not
a task in this feature).

## Relationship to existing styling

A maroon token set and a PrimeNG preset already exist and are **not** being replaced wholesale — they are
superseded by a larger system that keeps them working:

| What                                   | Where it lives today                            | What happens here                                             |
| --------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| Maroon colour ramp (50–950)             | `src/styles/tokens.css`                           | Becomes the primary primitive ramp, values unchanged, in `tokens/primitives.css` |
| `--sv-space-*`, `--sv-radius`, `--sv-focus-ring-*` | `src/styles/tokens.css`              | Re-expressed as `--ds-*` semantic tokens; old names survive via `compat.css` |
| `.sv-shell`, `.sv-skip-link`, `.sv-visually-hidden`, focus-visible rule | `src/styles.css`     | Re-built from `--ds-*` tokens under `layout/` and `base/`; old class names survive via `compat.css` |
| PrimeNG maroon preset                   | `src/app/theme/survey-viewer-preset.ts`           | Re-pointed to read the same values from `tokens/primitives.css` (single source of truth); its drift-check spec updated to compare against the new file |

If a value here and a value in those files disagree after implementation, the new `tokens/primitives.css`
wins and the old file is the one to fix or remove.

## Decisions _(mandatory)_

### D-001 — Two-tier token system: primitives, then semantics

**Decision**: Every `--ds-*` token is either a *primitive* (a literal value, defined once in
`tokens/primitives.css`) or a *semantic* token (a role name that references one or more primitives via
`var()`, defined in `tokens/semantic.css`). No third "component token" tier exists.

**Why**: Two tiers is the smallest system that separates "what a colour/length *is*" from "what it is
*for*". A component class consumes semantic tokens directly (`--ds-color-border-default`, not
`--ds-primitive-color-neutral-500`), so a re-brand changes primitives and semantics change nothing in
`components/`. A third tier (per-component tokens like `--ds-card-shadow`) is not introduced because no
component in this feature needs a value that isn't already a semantic token — adding one before a second
caller needs it would be premature abstraction.

**Alternative rejected**: a flat, single-tier token list (one `--ds-*` custom property per concrete use,
e.g. `--ds-card-border-color`). Rejected because it duplicates the same primitive under many names and
makes "is this border the same colour as that one" a visual question instead of a `grep` question.

### D-002 — Palette: reuse the shipped maroon ramp; author new gold and cream ramps

**Decision**: Primary (`maroon`) reuses the exact eleven existing `--sv-maroon-*` hex values unchanged.
Secondary (`gold`) and tertiary (`cream`) are new eleven-step ramps authored for this feature, chosen so
that the text-weight step of each (gold-700, cream read as background only) clears WCAG AA against the
surfaces it is paired with (`contracts/design-tokens.md` §Verified contrast pairs). A warm-toned neutral
ramp and four status colours (success, warning, error, info) are also authored, each with a text-safe step
verified the same way.

**Why**: The maroon ramp is already the reviewed, shipped brand colour (Principle V); re-deriving it would
risk a silent drift between the PrimeNG preset and the token file that `survey-viewer-preset.spec.ts`
today exists specifically to catch. Gold and cream have no prior art in the repo, so their hex steps are
an architecture decision, not a restatement of something already decided — the parent issue names the
*roles* (secondary/gold, tertiary/cream) and where they appear (progress gradient, accents, page/card
background), not hex values.

**Alternative rejected**: deriving gold and cream from the maroon ramp algorithmically (e.g. hue-rotate).
Rejected because the reference image's gold is a distinct, warmer hue than a rotated maroon would produce,
and an algorithmic derivation would need its own accessibility re-verification anyway — authoring the
ramp directly and verifying it once is simpler and more honest about being a new decision.

### D-003 — `.ds-` / `--ds-` naming, BEM-lite for classes

**Decision**: Every new custom property is prefixed `--ds-`; every new class is prefixed `.ds-`. Classes
use `.ds-block`, `.ds-block__element`, `.ds-block--modifier` (BEM-lite — no nesting beyond one element
level). Component classes map 1:1 to the six families named in scope: `.ds-card`, `.ds-btn`, `.ds-field`,
`.ds-choice-tile`, `.ds-progress`, `.ds-alert` (feedback), plus their elements and modifiers.

**Why**: `ds-` is unambiguous against the three other prefixes already live in this codebase: `sv-`
(legacy survey-viewer tokens, kept via `compat.css`), `p-` (PrimeNG's own classes), and PrimeFlex's
unprefixed utility classes. A consistent prefix makes the contract spec's class-discovery step
(FR-096/FR-090) a simple selector scan with no allow-list of unrelated classes to maintain. BEM-lite keeps
every class name self-describing without a build step.

**Alternative rejected**: scoping new styles entirely inside Angular component `:host` stylesheets with no
shared class vocabulary. Rejected because the parent issue explicitly asks for a shared, documented class
catalogue (`contracts/css-classes.md`) that is checked for drift — component-local-only styles can't be
catalogued or checked that way.

### D-004 — `compat.css` is an alias layer, not a rewrite

**Decision**: `compat.css` re-declares every existing `--sv-*` custom property as `var(--ds-*)` and every
existing global `.sv-*` class as an alias (same computed styles, built from `--ds-*` tokens) of its new
equivalent. No file under `src/app/features/survey/**` is edited by this feature to adopt the new names.

**Why**: The parent issue is explicit that existing components keep their current structure and that only
styling changes — and this plan's implementation task (`PRI-54`) is CSS/token work, not a template sweep
across every question component. `compat.css` makes the new system a drop-in replacement for the old one
on day one; migrating individual component stylesheets to reference `--ds-*`/`.ds-*` directly is a
follow-up that can happen incrementally, each change independently reviewable, without ever breaking the
rendered survey.

**Alternative rejected**: deleting `src/styles/tokens.css` and the old class names outright, forcing every
component file to be touched in the same change. Rejected because it turns a styling change into a
repo-wide template sweep in one PR, which is exactly the blast radius the parent issue's "only styling
changes" line is drawing a boundary around.

### D-005 — Motion: token-driven durations, transform/opacity only, one reduced-motion switch

**Decision**: Motion primitives are durations (`instant`, `fast`, `base`, `slow`) and easing curves
(`standard`, `decelerate`, `accelerate`). Every `transition`/`@keyframes` rule shipped by this feature
animates only `transform` and/or `opacity`. A single `@media (prefers-reduced-motion: reduce)` block
collapses every `--ds-motion-duration-*` token to near-zero at `:root`, so every rule built from those
tokens is instant for a respondent who has asked for reduced motion — no per-component opt-out needed.

**Why**: Restricting animation to compositor-only properties (`transform`, `opacity`) is what keeps
transitions cheap on low-end mobile, which is this app's primary target (Principle V: 375px is a supported
target, not degraded). Centralising reduced-motion as a token override rather than a per-rule media query
means a future component only has to use the duration tokens correctly to get reduced-motion support for
free, and the contract spec only has to check the tokens are overridden in one place, not audit every
rule.

**Alternative rejected**: per-component `@media (prefers-reduced-motion: reduce)` overrides. Rejected
because it's the same override copy-pasted at every call site, and a component that forgets it is a silent
accessibility gap the contract spec would have to hunt for individually instead of checking once.

### D-006 — The automated contract spec uses lightweight static analysis, not a full CSS AST pipeline

**Decision**: The Vitest contract spec required by FR-096 reads the shipped `.css` files as text and
checks them with targeted regular expressions / a minimal custom-property/selector extractor — not a full
PostCSS/`css-tree` parse pipeline.

**Why**: Every check FR-096 lists (unresolved `var()`, a literal colour, a raw length, a class name, a
`transition`/`@keyframes` property list) is a lexical pattern in the source text, not something that needs
full cascade resolution or selector specificity. A regex/lightweight-parser approach has no new runtime
dependency beyond what Vitest already provides, matching Principle IV's bar that a new devDependency needs
a justification (001 added `axe-core` for a check regex genuinely cannot do; this check can, so it
shouldn't add one).

**Alternative rejected**: adding `postcss` plus an AST walker. Rejected for this feature's checks
specifically — if a future, more semantic check is needed (e.g. real specificity analysis), that is a
reason to add `postcss` *then*, not now.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A respondent sees a cohesive, on-brand, accessible survey (Priority: P1)

A respondent opens any existing survey and sees the maroon/gold/cream brand consistently applied —
readable text, visibly focused controls, and a progress bar, cards, buttons, and choice options that look
like one designed system, not a default PrimeNG theme with one brand colour swapped in.

**Why this priority**: this is the point of the feature. If the tokens and classes exist but nothing
visibly changes for a respondent, the feature has not shipped value.

**Independent Test**: load the existing customer-feedback demo survey after the companion implementation
PR lands, and visually/automatically confirm every card, button, choice tile, and the progress bar read
from `--ds-*` tokens with the maroon/gold/cream palette, at 375px and 1280px.

**Acceptance Scenarios**:

1. **Given** a survey page with a required radio question, **When** it renders, **Then** each option shows
   as a bordered `.ds-choice-tile` with a bold title and muted description, and the page's primary CTA
   renders as a solid maroon pill button with white text.
2. **Given** a multi-page survey in progress, **When** the page renders, **Then** the progress indicator
   shows a maroon-to-gold gradient fill against a cream/neutral track.
3. **Given** any card-based panel (a question group, the submission confirmation), **When** it renders,
   **Then** it shows as a white surface with a soft shadow and rounded corners, per `.ds-card`.
4. **Given** the same survey rendered at 375px and at 1280px, **Then** no control is visually truncated,
   no horizontal scrollbar appears, and every interactive control still resolves to a minimum 44×44px hit
   target.

---

### User Story 2 - An engineer styles without guessing (Priority: P1)

An engineer implementing this system, or a later engineer adding a screen, can style any element using
only the tokens and classes documented in `contracts/`, with no literal colour, no ad hoc spacing value,
and no undocumented class.

**Why this priority**: a design system that isn't actually used as the only source of styling values
degrades back into ad hoc CSS within a few changes. The catalogue is what makes "only `--ds-*`" an
enforceable rule rather than a convention.

**Independent Test**: implement the companion PR using only values from `contracts/design-tokens.md` and
classes from `contracts/css-classes.md`; run the contract spec (User Story 3) and confirm it passes with
zero manual lookups outside those two files.

**Acceptance Scenarios**:

1. **Given** `contracts/design-tokens.md`, **When** an engineer needs a colour, a spacing step, a radius,
   a shadow, or a motion duration, **Then** the document names a token for it with its value or
   value-source and its intended usage.
2. **Given** `contracts/css-classes.md`, **When** an engineer needs to build a card, a button, a field, a
   choice tile, a progress bar, or a feedback banner, **Then** the document names the class, its purpose,
   and the markup it expects.
3. **Given** a token or class that exists in the shipped CSS, **When** an engineer checks the matching
   contract document, **Then** it is listed there, and nothing is listed that does not exist in CSS.

---

### User Story 3 - The system enforces itself (Priority: P1)

Anyone touching `src/styles/**` or a component stylesheet gets an immediate, specific test failure if they
introduce a literal colour outside `tokens/primitives.css`, a raw spacing value outside `tokens/`, an
undocumented token or class, an unordered numeric scale, a contrast pair below AA, a missing
reduced-motion block, a non-compositor animation, or an unmapped PrimeNG variable — before the change
merges, not at a future design review.

**Why this priority**: a design system with no enforcement is a style guide, not a contract. This is the
mechanism that keeps D-001 through D-006 true after this feature ships, across every later change.

**Independent Test**: introduce each of the nine drift classes listed in FR-096 one at a time into a
scratch CSS fixture, run the contract spec, and confirm each one fails with a message naming the specific
rule and location; then remove the drift and confirm the spec is green.

**Acceptance Scenarios**:

1. **Given** a CSS file outside `tokens/primitives.css` with a literal hex colour, **When** the contract
   spec runs, **Then** it fails naming the file, line, and the literal value found.
2. **Given** a `.ds-*` class shipped in CSS but absent from `contracts/css-classes.md`, **When** the
   contract spec runs, **Then** it fails naming the undocumented class.
3. **Given** a documented contrast pair with a ratio of 4.2:1 against a normal-text requirement of 4.5:1,
   **When** the contract spec runs, **Then** it fails naming the pair and the computed ratio.
4. **Given** `src/styles/**` with no `@media (prefers-reduced-motion: reduce)` block, **When** the contract
   spec runs, **Then** it fails naming the missing block.
5. **Given** a `transition` rule animating `box-shadow`, **When** the contract spec runs, **Then** it
   fails naming the rule and the non-compositor property.
6. **Given** every drift class above corrected, **When** the contract spec runs, **Then** it passes with
   no manual exclusion added to make it pass (Principle IV).

---

### User Story 4 - Motion and keyboard respondents are not degraded (Priority: P2)

A respondent who has requested reduced motion, or who navigates by keyboard only, completes a themed
survey with full functionality, no unwanted motion, and a visible focus indicator at every step.

**Why this priority**: Principle V makes keyboard operability and a visible focus ring non-negotiable;
this feature must not regress either while re-skinning the app.

**Independent Test**: set `prefers-reduced-motion: reduce` in the test environment, navigate a themed
survey by keyboard only (Tab, Shift+Tab, Enter, Space, Arrow keys where PrimeNG expects them), and confirm
every transition is imperceptible and every focused control shows the `--ds-*`-token focus ring.

**Acceptance Scenarios**:

1. **Given** `prefers-reduced-motion: reduce`, **When** a page transition, a choice-tile selection, or a
   progress-bar update occurs, **Then** the change applies with no animated duration perceptible to the
   respondent.
2. **Given** keyboard-only navigation, **When** focus lands on any button, field, or choice tile, **Then**
   a focus ring built from `--ds-color-focus-ring` is visible against every background the control can
   appear on.

---

### User Story 5 - Existing survey behaviour is unchanged (Priority: P2)

QA re-runs the already-shipped survey flow (features 001–003) after this design system lands and finds
identical behaviour — only the visual presentation differs.

**Why this priority**: this is the direct test of the "existing components keep their current structure"
constraint; a passing design system that breaks an existing flow is not shippable.

**Independent Test**: run the existing `001`/`002`/`003` test suites and the existing demo survey's manual
flow unmodified; confirm 100% pass with no test file edited to tolerate a behavioural change.

**Acceptance Scenarios**:

1. **Given** the existing `customer-feedback.json` demo survey, **When** it is completed end to end after
   this feature's companion implementation lands, **Then** every existing acceptance scenario from specs
   001–003 still holds, unmodified.
2. **Given** the existing component test files under `src/app/features/survey/**`, **When** `pnpm vitest
   run` executes, **Then** none of them required a behavioural (non-styling) change to keep passing.

### Edge Cases

- **A component still reads `--sv-maroon-700` after this feature ships**: works unchanged — `compat.css`
  aliases it to `var(--ds-color-primary-700)`, the same literal value.
- **`compat.css` is deleted in a future cleanup before every `--sv-*`/`.sv-*` reference is migrated**: out
  of scope for this feature; the follow-up that removes `compat.css` owns checking every reference is
  gone first.
- **A literal colour is hidden inside a `var()` fallback**, e.g. `var(--ds-color-border, #ccc)`: still a
  literal colour outside `tokens/primitives.css` and must be caught by the contract spec's scan (FR-096).
- **Two tokens in different scales resolve to the same value** (e.g. a status colour happens to match a
  neutral step): not a failure — scales are independent and are not checked for cross-scale uniqueness.
- **The OS-level reduced-motion setting changes while the SPA is already open**: the media query is
  evaluated live by the browser; no reload or Angular change-detection cycle is required for it to apply.
- **A PrimeNG component not named in the bridge contract renders with default (un-bridged) PrimeNG
  colours**: accepted for this feature — the bridge contract enumerates the PrimeNG variables actually in
  use by components this app renders (`contracts/design-tokens.md` §PrimeNG bridge); a future PrimeNG
  component not yet in that list is a scope addition to the contract, not a silent gap.
- **A contrast pair is verified at a given font size/weight but a component later renders that same
  token pair smaller than assumed**: the contract spec checks the documented context (normal vs. large
  text); a component author who renders a "large-text-only" pair as small text is responsible for picking
  a different, AA-normal-text pair.

## Requirements _(mandatory)_

### Functional Requirements

Numbering continues the 001–003 sequence.

- **FR-083**: System MUST define a two-tier `--ds-*` custom-property token system: primitive tokens (raw
  literal values) in `src/styles/tokens/primitives.css`, and semantic tokens (role-based aliases that
  reference primitives via `var()`) in `src/styles/tokens/semantic.css`. No file other than
  `tokens/primitives.css` may contain a literal colour value.

- **FR-084**: System MUST define colour primitives for three brand roles — primary (maroon), secondary
  (metallic gold), tertiary (warm cream) — each an 11-step ramp (50–950), plus a neutral ramp and four
  status colours (success, warning, error, info). Every ramp MUST be documented in
  `contracts/design-tokens.md` with its hex value and, for any step intended for text or an icon, at least
  one verified WCAG AA contrast pairing.

- **FR-085**: System MUST define typography primitives (font family, a font-size scale, font-weight steps,
  line-height steps, letter-spacing steps) and semantic tokens built from them, consumed by
  `base/typography.css` for every default text element (body, headings, links).

- **FR-086**: System MUST define a spacing primitive scale and a radius primitive scale, each strictly
  ascending by step name, exposed as semantic tokens. The eight existing `--sv-space-*` step values MUST be
  preserved unchanged so no component reading them through `compat.css` shifts pixel position.

- **FR-087**: System MUST define an elevation (box-shadow) primitive scale of at least three steps
  (resting, raised, overlay) and a motion primitive scale (at least three durations, at least two easing
  curves), each exposed as semantic tokens.

- **FR-088**: System MUST ship global base styles — a minimal reset, default element typography, and a
  keyboard focus-visible ring — built only from `--ds-*` tokens, replacing the equivalent rules currently
  inline in `src/styles.css`.

- **FR-089**: System MUST ship layout utility classes for a max-width content container, a vertical stack
  with a token-driven gap, a horizontal cluster with a token-driven gap, a visually-hidden helper, and a
  skip-link, each prefixed `.ds-`.

- **FR-090**: System MUST ship component classes, each prefixed `.ds-`, for exactly six families: cards,
  buttons, fields, choice tiles, progress, and feedback, as catalogued in `contracts/css-classes.md`.
  Every class and modifier shipped in CSS MUST appear in that catalogue and every class documented there
  MUST exist in CSS — a 1:1 match in both directions.

- **FR-091**: A `.ds-btn`, an interactive `.ds-choice-tile`, and a `.ds-input` MUST resolve to a minimum
  44×44px hit target at 375px and 1280px, via `min-height`/`min-width` tokens, not by relying on content
  size alone.

- **FR-092**: System MUST ship `src/styles/integrations/primeng-bridge.css` mapping every PrimeNG CSS
  custom property named in `contracts/design-tokens.md` §PrimeNG bridge to an equivalent `--ds-*` token,
  so unstyled PrimeNG components inherit the brand palette with no per-component override.

- **FR-093**: System MUST ship `src/styles/compat.css` that re-declares every existing `--sv-*` custom
  property and every existing global `.sv-*` class (`.sv-shell`, `.sv-skip-link`, `.sv-visually-hidden`)
  as an alias of its `--ds-*`/`.ds-*` equivalent. No file under `src/app/features/survey/**` is required
  to change for the survey to keep rendering correctly.

- **FR-094**: Every CSS transition and `@keyframes` animation shipped by this feature MUST animate only
  `transform` and/or `opacity`. No rule may animate `color`, `background-color`, `box-shadow`, `width`,
  `height`, or any other non-compositor property.

- **FR-095**: System MUST define one `@media (prefers-reduced-motion: reduce)` block that collapses every
  `--ds-motion-duration-*` token to near-zero at `:root`, so every transition/animation built from those
  tokens is effectively instant for a respondent who has requested reduced motion.

- **FR-096**: System MUST ship an automated Vitest contract spec that fails the build when any of the
  following is true: (a) an unresolved `var(--ds-*)` reference exists anywhere in `src/`; (b) a literal
  colour value exists outside `tokens/primitives.css`; (c) a raw spacing length (px/rem/em on a margin,
  padding, gap, or inset property) exists outside `src/styles/tokens/`; (d) a token or class exists in CSS
  but not in `contracts/*.md`, or is documented but doesn't exist in CSS; (e) a documented numeric scale
  is not strictly ascending; (f) a documented contrast pair resolves below 4.5:1 (normal text) or 3:1
  (large text / non-text UI); (g) the reduced-motion media block (FR-095) is missing; (h) a transition or
  animation violates FR-094; or (i) a PrimeNG variable named in the bridge contract (FR-092) is left
  unmapped.

- **FR-097**: Existing components under `src/app/features/survey/**` MUST render with no change to their
  DOM structure, Angular template bindings, or component logic as a direct result of this feature — only
  CSS (inline styles, component stylesheets, or class names) may change, and only to adopt `--ds-*`
  tokens, `.ds-*` classes, or to rely on `compat.css`.

### Key Entities

- **Design Token** — a named `--ds-*` custom property; either a *Primitive* (literal value, lives only in
  `tokens/primitives.css`) or a *Semantic* token (references one or more primitives). Defined fully in
  `contracts/design-tokens.md`.
- **Token Scale** — an ordered family of primitives sharing a step axis (colour ramps 50–950, spacing
  steps, radius steps, font sizes); every scale must be strictly ascending by its documented sort key.
- **Component Class** — a `.ds-*` selector documented in `contracts/css-classes.md` with its purpose, the
  tokens it consumes, and the markup it expects.
- **Contrast Pair** — a documented (foreground token, background token, text-size context) triple with a
  verified ratio, checked by the contract spec against WCAG 2.1 AA thresholds.
- **Compat Alias** — an `--sv-*` custom property or `.sv-*` class re-declared in `compat.css` as a direct
  reference to one `--ds-*`/`.ds-*` equivalent.
- **PrimeNG Bridge Entry** — a PrimeNG (Aura theme) CSS custom property mapped to one `--ds-*` token in
  `integrations/primeng-bridge.css`, checked against `contracts/design-tokens.md` §PrimeNG bridge.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-034**: Every one of the nine drift classes named in FR-096 has at least one deliberately-broken
  fixture in the contract spec's suite that the spec catches, and the spec is green against the shipped
  CSS — 100% of the nine classes covered, zero manually excluded.
- **SC-035**: `contracts/design-tokens.md` and `contracts/css-classes.md` list every `--ds-*` token and
  every `.ds-*` class that exists in `src/styles/**/*.css`, and nothing else, verified by the contract
  spec on every run.
- **SC-036**: Every documented contrast pair meets or exceeds WCAG 2.1 AA (4.5:1 normal text, 3:1 large
  text/UI) in the contract spec's computed results, in 100% of documented pairs.
- **SC-037**: The existing customer-feedback demo survey (features 001–003) completes end to end at 375px
  and at 1280px with zero behavioural regressions and zero horizontal scrolling after the companion
  implementation lands.
- **SC-038**: With `prefers-reduced-motion: reduce` set, every transition/animation in the app resolves in
  under 20ms, with no loss of functionality, in 100% of interactions exercised by the existing test suite.
- **SC-039**: The companion implementation's diff touches only `src/styles/**`, `src/styles.css`,
  individual component `*.css` files, and `src/app/theme/survey-viewer-preset.ts` — zero `.ts` logic
  files and zero `.html` template files under `src/app/features/survey/**` change.
- **SC-040**: An automated accessibility check (axe-core) reports zero WCAG 2.1 AA violations on a themed
  survey page at 375px and 1280px.

## Assumptions

Each is a decision taken by the Solution Architect as part of this plan, not an open product question.

- The sidebar/navigation chrome visible in `theme-preview.png` is the demo app's own shell, not a
  structural element of this survey viewer. This feature ships the token/class vocabulary a future
  page-shell feature could use to build one, but does not itself add a sidebar or change the page
  structure.
- "Light theme only" means no `prefers-color-scheme: dark` branch is authored in this feature; dark mode,
  if ever wanted, is a future feature built on top of these semantic tokens.
- The existing maroon ramp is reused unchanged as the primary primitive ramp (D-002), since it is already
  the shipped, accessibility-reviewed brand colour and the parent issue names maroon — not a new red — as
  primary.
- Secondary (gold) and tertiary (cream) ramps are newly authored for this feature (D-002); their exact hex
  steps are recorded with rationale in `research.md`.
- `compat.css` is a deliberate, temporary seam (D-004); retiring `--sv-*`/`.sv-*` from component files is
  out of scope here and tracked as a future cleanup.
- The contract spec uses lightweight static analysis rather than a full CSS AST pipeline (D-006); this is
  sufficient for every check FR-096 lists and avoids an unjustified new devDependency.

## Open Clarifications

None. The parent issue fixed the palette roles, the required file structure, and the nine required
contract-spec failure classes. The decisions still open after reading it — exact hex steps for the new
gold/cream ramps, the two-tier token architecture, the `.ds-`/`compat.css` naming and aliasing strategy,
and the contract spec's implementation approach — are architecture judgement calls, recorded as D-001
through D-006 above with the alternative rejected and why, not product ambiguities requiring a
stakeholder decision.

## Next

Solution Architect proceeds to `/speckit-plan` (contracts-first: `contracts/design-tokens.md` and
`contracts/css-classes.md`) and `/speckit-tasks`. Angular Engineer implements against the contracts and
ships the automated contract spec (User Story 3). QA Engineer runs the gates and the 375px/1280px browser
smoke test. Code Reviewer reviews implementation against D-001 through D-006 and FR-083 through FR-097.
