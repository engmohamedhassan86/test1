# Quickstart: Survey Design System

**Branch**: `001-survey-management` | **Spec**: [`spec.md`](./spec.md)

How to prove this feature works, gate by gate, once the companion implementation (`PRI-54`) lands.

## 1. The contract spec (the feature's own enforcement, US3)

```sh
pnpm vitest run src/styles --reporter=dot 2>&1 | tail -20
```

Green means: every `--ds-*` token and `.ds-*` class in CSS matches `contracts/*.md` 1:1; no literal
colour outside `tokens/primitives.css`; no raw spacing length outside `tokens/`; every documented scale is
ascending; every documented contrast pair clears AA; the reduced-motion block exists; no animation touches
a non-compositor property; every PrimeNG bridge variable is mapped.

## 2. Visual check (US1)

```sh
pnpm start
```

Open the customer-feedback demo survey. Confirm: maroon primary buttons and accents, a maroon-to-gold
progress gradient, warm-cream page background, white cards with a soft shadow, and bordered choice tiles
with a bold title and muted description — matching `theme-preview.png`'s palette (not its sidebar/page
layout, which is out of scope).

## 3. Reduced motion and keyboard (US4)

In the browser devtools, emulate `prefers-reduced-motion: reduce` (Chrome: Rendering tab → Emulate CSS
media feature). Tab through a survey page: every focused control shows a visible maroon focus ring, and no
transition is perceptible.

## 4. No regression (US5)

```sh
pnpm vitest run src/app/features/survey --reporter=dot 2>&1 | tail -20
```

Every existing spec from features 001–003 passes unmodified.

## 5. Full gates (handoff only)

```sh
pnpm prettier --check .
pnpm tsc --noEmit
pnpm vitest run --coverage
pnpm ng build
```

Then the QA Engineer's browser smoke test at 375px and 1280px (gate 5, owned by QA per
`AGENTS.md`/the parent issue's quality gates).
