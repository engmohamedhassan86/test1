# S9 Verify — exit criteria, measured

Owner: QA Engineer. Status at the time of writing: **S9 is blocked behind S8 (PRI-21)**. Nothing in
this file is a gate run; the gate runs happen when S8 lands. This file exists so the three risks the
S6 analyze gate carried forward are **named, measured and mechanically checkable** instead of being
re-argued by reading at S9.

Measured against `specs/001-survey-management/{spec.md,tasks.md,test-map.md}` at commit `7492ef6`.

## How each number below was measured

```sh
# FR ids present in spec.md but carrying no task id in tasks.md
comm -23 <(grep -oE 'FR-[0-9]+' specs/001-survey-management/spec.md  | sort -u) \
         <(grep -oE 'FR-[0-9]+' specs/001-survey-management/tasks.md | sort -u)

# SC markers present in spec.md but missing from tasks.md
comm -23 <(grep -oE 'SC-[0-9]+' specs/001-survey-management/spec.md  | sort -u) \
         <(grep -oE 'SC-[0-9]+' specs/001-survey-management/tasks.md | sort -u)
```

Re-run both at S9. A changed result means `tasks.md` moved and this file must be re-derived, not
trusted.

---

## Obligation 1 — US4.2 and US4.9 must name a real test

**Measured state at `7492ef6`: both still map only to `T148`, and `T148` names no test.**

`test-map.md` lines 84 and 91 give `T148` as the sole task for each. `T148`'s own text in `tasks.md`
line 418 is the generic instruction "Map every spec acceptance scenario to the named test that covers
it" — it is a mapping obligation, not an assertion. No other task promises either scenario:

| Scenario | What it requires (`spec.md` §User Story 4)                                                                                               | Nearest task that exists      | Why that task does not cover it                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US4.2    | Activating "Customer Feedback" in the catalog makes the URL `/surveys/customer-feedback` **and** renders page 1 of that survey           | `T083` `catalog-page.spec.ts` | `T083` asserts manifest order, the empty state, `loading` and configuration-error — not navigation                                                              |
| US4.9    | The manifest request unanswered after 10s leaves `loading` for the **configuration-error** screen, and never stays in `loading` (FR-075) | `T050`, `T051`                | `T050` is the `json-fetch` timeout at `fetchMs`; `T051` lists `catalog-error` for an _unreadable_ manifest, not the deadline path reaching the error **screen** |

**S9 pass condition.** `T148`'s table names an existing test for each. The named test must assert the
scenario itself, not a neighbouring one:

- US4.2 — a routed test (expected home: `catalog-page.spec.ts` or
  `survey-page.end-to-end.spec.ts`) that activates the catalog link and asserts both the resulting
  URL and the page-1 render.
- US4.9 — a fake-timer test (expected home: `survey-catalog.service.spec.ts` plus
  `catalog-page.spec.ts`) that advances past `fetchMs` and asserts the state leaves `loading` for
  configuration-error.

**S9 fails if `T148`'s table cites `T148`, cites a test that does not exist, or cites a test whose
assertions do not include the scenario.** Verification is by opening the named test file, not by
reading the table.

---

## Obligation 2 — the 17 FRs with no task id

**Measured: 77 FRs in `spec.md`, 60 carry a task id in `tasks.md`, 17 do not.** Exact list:

```
FR-001 FR-002 FR-005 FR-006 FR-007 FR-008 FR-011 FR-019 FR-025
FR-028 FR-044 FR-046 FR-047 FR-049 FR-052 FR-056 FR-059
```

`analysis.md` argues each of these is covered behaviourally. That argument is not mechanically
checkable, so at S9 coverage is re-derived from the test names that actually exist. Below is the
expected home for each — **my derivation from the task text, not a promise made by `tasks.md`**. At
S9 each row is either satisfied by a named assertion in a real test file, or it is a gap.

| FR     | Requirement (abbreviated)                                               | Expected home at S9                                                                                                                                                                                         |
| ------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 | A survey is an ordered list of pages, each an ordered list of questions | `survey-config.validator.spec.ts` (T033) + `survey-fixtures.contract.spec.ts` (T045, 4 pages / 8 questions in §5 order)                                                                                     |
| FR-002 | Page and question ids unique; a duplicate is a configuration error      | `survey-config.validator.spec.ts` (T033) — the duplicate-id rule case                                                                                                                                       |
| FR-005 | Each question renders title, optional description, required indication  | the question-component specs (T103–T108 family)                                                                                                                                                             |
| FR-006 | `radio`: single choice, minimum 2 options, at most one value            | `radio-question.spec.ts` + the options-minimum rule case in T033                                                                                                                                            |
| FR-007 | `checkbox`: multi choice, minimum 2 options, holds a set                | `checkbox-question.spec.ts` + the options-minimum rule case in T033                                                                                                                                         |
| FR-008 | `textbox` one line, `textarea` multi-line                               | `textbox-question.spec.ts`, `textarea-question.spec.ts`                                                                                                                                                     |
| FR-011 | Every answer on the current page validated before leaving the page      | `page.validator.spec.ts` + `survey-session.service.spec.ts` (T074 blocked-Next)                                                                                                                             |
| FR-019 | Each error rendered with its question, in plain language                | the question-component specs + the page-summary spec                                                                                                                                                        |
| FR-025 | Accepted files listed per question with name, readable size, remove     | the attachment-field spec + `display-format.spec.ts` (T019, FR-071 bands)                                                                                                                                   |
| FR-028 | Accepted types come only from the question's `acceptedTypes`            | `attachment.validator.spec.ts`                                                                                                                                                                              |
| FR-044 | Unfetchable or non-contract manifest renders configuration-error        | `catalog-page.spec.ts` (T083) + `survey-catalog.service.spec.ts` (T051)                                                                                                                                     |
| FR-046 | Only the declared state transitions are legal                           | `survey-session.service.spec.ts` (T074 — an illegal `transitionTo` throws)                                                                                                                                  |
| FR-047 | `/` renders the catalog built from `public/survey-manifest.json`        | `catalog-page.spec.ts` (T083 manifest order)                                                                                                                                                                |
| FR-049 | `/surveys/:surveyKey` loads, validates and renders that config          | the survey-page spec (T086/T087 family) + `survey-page.end-to-end.spec.ts`                                                                                                                                  |
| FR-052 | Default fixture is the named four-page customer-feedback survey         | `survey-fixtures.contract.spec.ts` (T045)                                                                                                                                                                   |
| FR-056 | Every flow completable by keyboard, focus indicator always visible      | `a11y.axe.spec.ts` (T129) partially; **primarily the 375/1280 smoke gate (T146)** — automated jsdom cannot prove visible focus, so this one is smoke-owned and the residual risk must be stated, not hidden |
| FR-059 | Brand colour reaches the UI only through design tokens                  | T131's grep verification over `features/**/*.css` and `shared/**/*.css`                                                                                                                                     |

---

## Obligation 3 — the four missing `SC-` markers

**Measured: `SC-003`, `SC-004`, `SC-006`, `SC-008` appear in `spec.md` but not in `tasks.md`.**

`test-map.md` is generated from those markers, so regenerating the map today reports four gaps that
are false — the behaviour is promised by tasks that simply do not carry the id:

| SC     | Success criterion (abbreviated)                                                               | Task that behaviourally owns it                                     |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| SC-003 | For each of the six question types, an invalid input blocks Next and takes focus              | `T074` (blocked Next, `focusRequest`) + the per-type question specs |
| SC-004 | 100% of files violating type, size, emptiness, duplication or count are rejected at selection | `T026`/`T071` + `attachment.validator.spec.ts`                      |
| SC-006 | The confirmation screen is unreachable without a gateway acknowledgement                      | `T070`/`T074` + `T099` (confirmation renders alone)                 |
| SC-008 | Every flow passes at 375px and 1280px, no horizontal scroll, no truncation                    | `T135` + `T146` (the smoke gate)                                    |

**S9 procedure, in this order.** 1. Check whether S8 added the four markers. 2. Regenerate
`test-map.md`. 3. For any gap the generator reports, decide false-vs-real against this table — a gap
whose named task above asserts the criterion is a **missing annotation** (LOW, fix the marker); a gap
with no such assertion is a **missing test** (gate failure). Distinguishing the two is QA's call, not
the generator's.

---

## The four gates deferred from S6, and why that was not relaxation

At S6 there was no feature source to act on: `src/app/app.routes.ts` was `[]` and
`src/app/core/{models,services,validators}` held only README placeholders. The four gates were
reported NOT RUN **with that reason stated**, which is deferral. Gate 1 (`prettier --check`) did run
and passed, and is re-run here.

```
prettier --check    re-run at S9 (passed at S6)
tsc --noEmit        deferred S6 -> hard gate at S9
vitest --coverage   deferred S6 -> hard gate at S9, >= 80% reported as a figure
ng build            deferred S6 -> hard gate at S9, output dist/survey-viewer/browser
smoke 375 / 1280px  deferred S6 -> hard gate at S9, QA-owned
```

Constitution Principle IV offers no relaxation at S9. Coverage below 80% on any of statements,
branches, functions or lines is a FAIL. A failing smoke at either width is a FAIL. No file may be
added to `coverage.exclude`, no threshold moved, no Prettier ignore entry added, no `tsconfig` flag
loosened to make a run green.

## Gate report shape (S9 will use exactly this)

```
prettier --check   PASS/FAIL
tsc --noEmit       PASS/FAIL
vitest --coverage  PASS/FAIL  statements X%  branches Y%
ng build           PASS/FAIL  (output path + bundle size)
smoke 375px        PASS/FAIL
smoke 1280px       PASS/FAIL
```

If the environment has no browser, the smoke gate is reported as such explicitly, the closest
automated equivalent is run in its place, and the residual risk is named. The gate is never silently
dropped and never handed to a human to click through.
