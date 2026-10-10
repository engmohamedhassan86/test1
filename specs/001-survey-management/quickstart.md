# Quickstart: validating the Dynamic Survey Viewer

**Feature**: `001-survey-management` · **Stage**: `/speckit-plan` Phase 1 · **Author**: Solution Architect

This is the runnable validation guide: how to prove the feature works, in the order the constitution's five
gates run. It is not an implementation guide — the design is in [`plan.md`](./plan.md) and
[`data-model.md`](./data-model.md), and the work breakdown is `/speckit-tasks`'s.

## Prerequisites

The container starts with no `pnpm` on `PATH`. Restore it rather than reporting a blocker:

```sh
export NPM_CONFIG_PREFIX="$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"
command -v pnpm || npm i -g pnpm
pnpm install --frozen-lockfile
```

The PrimeNG licence key is a credential and is injected, not committed: `pnpm start` and `pnpm build` go
through `scripts/with-primeui-license.mjs`, which reads `.env`. Copy `.env.example` to `.env` if a local
run reports a missing key. Never commit `.env`.

## The five gates, in order

Nothing is done until all five pass. Each gate's owner runs the ones in reach; gate 5 is the QA Engineer's.

```sh
pnpm prettier --check .                 # gate 1
pnpm tsc --noEmit                       # gate 2 — or `pnpm typecheck`, which runs app + spec projects
pnpm vitest run --coverage              # gate 3 — fails below 80% on any of four metrics
pnpm ng build                           # gate 4 — output in dist/survey-viewer/browser
pnpm start                              # gate 5 — then the browser checks below
```

Gate 3 enforces the threshold itself, via `vitest.config.ts`. A run that reports under 80% on statements,
branches, functions or lines is a failed gate, not a number to adjust (Principle IV).

## Scenario walkthroughs

Each block is a scenario from [`spec.md`](./spec.md) that can be executed by hand against `pnpm start`, and
the test layer that must also cover it automatically ([`plan.md`](./plan.md) §7).

### 1 — Complete the default fixture end to end (US1, SC-001)

1. Open `/`. The catalog lists `Customer Feedback` within 1s of the manifest response (SC-002).
2. Activate it. The URL becomes `/surveys/customer-feedback`, page 1 "About You" renders, the indicator
   reads "Page 1 of 4", Previous is disabled, Next is enabled.
3. Answer every page with valid input and activate Submit on page 4. The Submit control reports busy, the
   inputs become non-editable, and within 2s the confirmation screen shows the survey title, the
   received message, the reference, and a link to `/`.
4. **Do the whole thing again with the keyboard only** — no mouse. That is SC-001, and it is not optional.
5. Check the document title changes: `Surveys` at `/`, `Customer Feedback — Survey` in the viewer,
   `Customer Feedback — Response received` on the confirmation (FR-077).

Automated by: layer 3 (`survey-page`, `catalog-page`) and layer 2 (`survey-session.service`).

### 2 — Blocked from advancing (US2, SC-003)

For each of the six question types, supply an invalid value, activate Next, and check three things: the
page does not change, the exact error text from the FR-069 catalogue appears under the question, and focus
sits on the first offending control. Then confirm two behaviours that are easy to get wrong:

- Changing the answer clears that question's error immediately, with no Next (FR-020).
- Previous, then Next, brings the page back with its answers intact and **no** error text and no
  `aria-invalid` — the page's rules are only re-checked when you next leave it forward (FR-064, US2
  scenario 12).

Automated by: layer 1 (`answer.validator`, `messages`, `page.validator`) and layer 3
(`validation-summary`, each question component).

### 3 — Attachments (US3, SC-004)

On `q_evidence` (`maxFiles: 3`, `PNG, JPEG, PDF`, 5 MB), select in turn: a valid PDF; a `.txt`; a 6 MB PNG;
a selection of three files where only one is valid; two more when two slots remain; a duplicate by name and
size; a 0-byte file. Each rejection must name the file and the reason, and no valid file in the same
selection may be lost. Then navigate Previous and back and confirm both attachments are still listed with
the same names and sizes and the counter still reads "2 of 3 files" (FR-065, US3 scenario 11).

Automated by: layer 1 (`attachment.validator`) and layer 3 (`question-attachments`).

### 4 — Catalog and unknown keys (US4)

| Do this                                                 | Expect                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Open `/surveys/nope`                                    | Not-found screen naming `nope`, link to `/`, **not** the configuration error |
| Rename `public/survey-manifest.json`, open `/`          | Configuration-error screen, no partial list                                  |
| With the manifest still missing, open a survey URL      | Configuration error, **never** not-found (FR-066, US4 scenario 7)            |
| Replace the manifest with `{ "surveys": [] }`, open `/` | The plain "no surveys available" statement — not an error state (FR-048)     |
| Open `/about`                                           | Not-found screen with a link to `/`                                          |

Automated by: layer 2 (`survey-catalog.service`) and layer 3 (`catalog-page`, `not-found-page`).

### 5 — An invalid config fails closed (US5, SC-005)

Use the invalid fixtures from `contracts/survey-json.md` §4 — one per failure class F01–F19. For each,
open the survey and confirm the configuration-error screen names the location and the offending value and
that **zero question controls are in the DOM**. The five worked examples in `contracts/survey-json.md` §10
give the exact expected message for F03, F04, F05, F07 and F12/F13.

Two cases need a deployment to reproduce by hand, so they are asserted in tests instead:

- A config path answered by the SPA index fallback with HTTP 200 and an HTML body → configuration error,
  because the body decides and not the status (FR-076, F18).
- A config request that never answers → configuration error at 10s, never an indefinite `loading`
  (FR-075, F19, SC-014).

Automated by: layer 1 (`survey-config.validator`, 50 rule cases), layer 2 (`json-fetch.service`,
`survey-loader.service`), layer 4 (the invalid fixtures).

### 6 — A failed submission loses nothing (US6, SC-006, SC-007)

The default simulated adapter never fails, by design, so that gate 3 stays deterministic (FR-068). Failure
paths are exercised by the test-only failing adapter
(`src/app/core/services/testing/failing-survey-response.gateway.ts`), which application code cannot import
— the directory is excluded from `tsconfig.app.json`.

For each of the seven `SubmissionFailureKind`s, assert: the `submission-error` state renders with that
kind's message, the confirmation screen does **not** render, every answer and attachment is intact and
editable, and "Try again" re-submits with the **same** `clientSubmissionId` and a later `submittedAt`.
Then assert the two that matter most:

- No sequence of actions reaches the confirmation screen without an acknowledgement that passes
  `isSubmissionReceipt` (SC-006). A 200 with a body missing `submissionId` is `malformed-response`.
- A Submit that validation blocks mints no `clientSubmissionId` at all, so a respondent bounced once and
  then successful produces exactly one value (contract test 13).

Automated by: layer 2 (the three gateways, `survey-session.service`).

### 7 — Principle I: a survey costs one file plus one entry (SC-013)

```sh
# add a second survey
#   1. write public/surveys/<new-key>.json
#   2. add one entry to public/survey-manifest.json
git diff --stat -- src/app          # must report no change
```

Then change it, then remove it, running the same check each time. If `src/app` shows a diff, Principle I
is broken and the cause is a defect in the feature, not in the survey.

### 8 — Accessibility and responsiveness (SC-008, SC-009)

`axe-core` runs in-process against the seven screens in layer 3, at both gate widths. It does **not**
cover contrast (FR-057) or reflow and target size (FR-058), because jsdom computes no layout — those are
gate 5's, in a real browser:

| Width  | Check                                                                                                                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 320px  | The catalog, a survey page and the validation-error state reflow with **no horizontal scrolling** (WCAG 1.4.10)                                                                               |
| 375px  | No horizontal scrolling, no truncated control label, every interactive target ≥44px high — and ≥44px wide where its label is an icon or a single character (a `rating` star, a bare checkbox) |
| 1280px | No horizontal scrolling, no truncated label                                                                                                                                                   |

Also at gate 5, by hand: tab through a whole survey and confirm a visible focus ring at every step and no
keyboard trap (FR-056); confirm no state is conveyed by colour alone — an invalid field must carry text
(FR-057); and confirm with a screen reader that a blocked Next is announced assertively and an attachment
add/remove politely (FR-055).

## Fast feedback while implementing

```sh
pnpm vitest                                     # watch mode
pnpm vitest run src/app/core                     # core only — layers 1 and 2
pnpm vitest run --coverage src/app/core          # the core figure, before the whole-repo one
pnpm prettier --write .                          # before committing, so gate 1 cannot fail
```

Run gate 3 over the whole repo before claiming a gate pass: a core-only coverage run says nothing about the
threshold, which is measured over `src/app/**`.
