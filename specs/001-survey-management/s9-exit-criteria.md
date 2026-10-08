# S9 Verify — exit criteria, measured

Owner: QA Engineer. Status at the time of writing: **S9 is blocked behind S8 (PRI-21)**. Nothing in
this file is a gate run; the gate runs happen when S8 lands. This file exists so the risks the S6
analyze gate carried forward are **named, measured and mechanically checkable** instead of being
re-argued by reading at S9.

First written against commit `7492ef6`. **Re-measured and revised at `391bc45`**, after the Solution
Architect closed the three S6 LOW findings in `tasks.md` rather than letting them ride into S8. That
pass changed the status of obligations 1 and 3 below (both now closed by measurement) and narrowed
obligation 2. It also added obligation 4, and my re-measurement of it added obligation 5.

| Obligation                                         | Status at `391bc45`                                  |
| -------------------------------------------------- | ---------------------------------------------------- |
| 1 — US4.2 / US4.9 must name a real test            | **CLOSED** by annotation; the assertion check stands |
| 2 — the FRs carrying no task id                    | **NARROWED, not closed** — 0 uncited, tests unproven |
| 3 — the four missing `SC-` markers                 | **CLOSED** — 14 / 14 annotated                       |
| 4 — `T091` is a single point of failure for FR-005 | **OPEN** — new, created by the A-06 fix              |
| 5 — FR-053's label asserted for only 2 of 6 types  | **OPEN** — new, found by QA at `391bc45`             |

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

**Status at `391bc45`: the annotation half is CLOSED. The assertion half stands.**

Both scenarios now carry task ids beyond the blanket one, and the count of scenarios whose only
mapping is `T148` is **0**, down from 2:

```
US4.2 -> T080, T083, T148
US4.9 -> T050, T083, T148
```

```sh
# scenarios whose ONLY mapping is the blanket task -> 0 at 391bc45
awk -F'|' '/^\| *US[0-9]/{l=$0;n=0;ids="";while(match(l,/T[0-9][0-9][0-9]/)){ids=ids" "substr(l,RSTART,RLENGTH);n++;l=substr(l,RSTART+RLENGTH)}
  if(n==1&&ids==" T148")print $2}' specs/001-survey-management/test-map.md | wc -l
```

I checked whether the new ids are a bare annotation or a real assertion, because naming a task is not
the same as that task asserting the scenario. **They are real assertions.** `T083` at `391bc45` now
reads, in its own text, "activating the `Customer Feedback` link puts the URL at
`/surveys/customer-feedback` and renders page 1 of that survey (US4 scenario 2)" and "a manifest
request which never answers leaves `loading` for the configuration-error screen once the 10s deadline
passes, so the catalog never stays in `loading` (US4 scenario 9, FR-075)". `T080` carries the
behaviour for US4.2 and `T050` the `fetchMs` deadline behind US4.9. Those are the two assertions the
table below asked for, written into the task list rather than deferred to me.

**What is left at S9 is therefore the ordinary verify check, not a carried risk:** open
`catalog-page.spec.ts` and confirm the two `it(...)` blocks exist and assert what `T083` promises. The
table below is retained as the specification of what those assertions must cover.

**Measured state at `7492ef6` (retained for the record): both mapped only to `T148`, and `T148` names no test.**

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

## Obligation 2 — the FRs whose coverage was argued by reading

**Status at `391bc45`: NARROWED, not closed. This is the obligation that still does work at S9.**

All 77 FRs now carry a task id — 0 uncited, 0 orphan:

```sh
comm -23 <(grep -oE '\bFR-[0-9]{3}\b' spec.md|sort -u) <(grep -oE '\bFR-[0-9]{3}\b' tasks.md|sort -u) | wc -l  # 0
comm -13 <(grep -oE '\bFR-[0-9]{3}\b' spec.md|sort -u) <(grep -oE '\bFR-[0-9]{3}\b' tasks.md|sort -u) | wc -l  # 0
```

Converting the prose argument into annotations is what tested it, and it failed twice — once
substantively (**A-06**: FR-005's required indication was named by no task at all; an implementer
following `tasks.md` literally would have shipped a survey where a respondent cannot tell which
questions are required, with no test failing) and once as a transcription slip (FR-007 credited to
`T094`, the text component, instead of `T093`).

That is the evidence for keeping this obligation open rather than closing it: **an FR id appearing in
`tasks.md` proves the task list names the FR, not that a test asserts it.** At S9, coverage for these
FRs is re-derived from the test names that actually exist on disk, exactly as planned — the annotation
pass is a narrowing, not a substitute. The table below is retained as my expected-home derivation.

I re-ran the same class of check that found A-06, looking for FRs whose only citation is a blanket or
prose line rather than a behaviour-naming task. Two candidates, **both false positives on inspection**:

| Candidate | Why it looked wrong                         | Why it is in fact covered                                                                                                              |
| --------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| FR-004    | cited by `T147` only, which smelled blanket | `T147` **is** the real FR-004 measurement task (`git diff --stat -- src/app` reports no change across an add-and-remove cycle, SC-013) |
| FR-053    | cited on no `- [ ] T###` line at all        | it sits in the Phase-US1 preamble (`tasks.md:295-298`), which binds **every** question component in the phase                          |

FR-053 is covered as a requirement, but inspecting it produced obligation 5 below.

**Measured at `7492ef6` (retained for the record): 77 FRs in `spec.md`, 60 carried a task id, 17 did not.** That list:

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

**Status at `391bc45`: CLOSED. All 14 success criteria now carry their id in `tasks.md`.**

```sh
grep -oE '\bSC-[0-9]{3}\b' tasks.md | sort -u | wc -l   # 14
grep -oE '\bSC-[0-9]{3}\b' spec.md  | sort -u | wc -l   # 14
```

The false-gap problem this obligation existed to pre-empt is gone: regenerating `test-map.md` no
longer reports four phantom gaps, so the S9 regeneration can be read at face value. The step-2
"decide false-vs-real" procedure below is retained because it is still the right procedure if the
generator reports **any** gap at S9 — it just has nothing queued for it today.

**Measured at `7492ef6` (retained for the record): `SC-003`, `SC-004`, `SC-006`, `SC-008` appeared in `spec.md` but not in `tasks.md`.**

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

## Obligation 4 — `T091` is now a single point of failure for FR-005

**New at `391bc45`, created by the A-06 fix. Handed to me explicitly by the Solution Architect.**

A-06's fix puts the required indication and the per-question optional `description` in the question
**host**, rendered once for all six types (`tasks.md:301`). That is the right call — it makes it
impossible for an individual type to omit them. It also means a regression in `T091` regresses the
required indication for **all six types at once**, and the only test standing between that and a green
run is `T111` (`tasks.md:321`).

**S9 pass conditions.**

1. `question-host.spec.ts` exists and asserts all four halves of FR-005: the question title renders;
   the optional `description` renders **only** when the config supplies one; a **required** question
   shows a visible required indication; an **optional** question shows **none**. The
   required-vs-optional pair is the load-bearing assertion — a test that only checks the required case
   passes against a component that marks every question required.
2. No empty element is left behind when `description` is absent (same rule as FR-073 / `T109`).
3. The indication is rendered in the host, not duplicated per type. If S8 moved it into the six type
   components instead, FR-005 needs an assertion in each of the six specs and `T111` alone is no
   longer sufficient coverage — say so in the gate report rather than passing on `T111`.
4. The fixture's optional question `q_delivery` (`required === false`, asserted by `T045`) is the
   natural negative case; `q_name` is a required one.

**S9 fails if `T111` was written without the optional-question negative assertion**, because that is
the assertion that makes the single point of failure safe.

---

## Obligation 5 — FR-053's "label naming its question" is asserted for 2 of 6 types

**New at `391bc45`, found by QA while re-measuring obligation 2. This is an A-06-class gap in test
assertions, not in the requirement — it does not reopen the S6 gate (0 CRITICAL / 0 HIGH stands).**

FR-053 (`spec.md:735`) requires every control to have a programmatic label naming its question. It is
stated once, in the Phase-US1 preamble (`tasks.md:295-298`), binding every question component — so the
requirement **is** named and an implementer following `tasks.md` will implement it. A-06 was worse than
this: there the requirement was named nowhere.

What is thin is the assertion side. Measured at `391bc45`:

| Type                   | Per-type spec | Does its text assert a label **naming the question**?                |
| ---------------------- | ------------- | -------------------------------------------------------------------- |
| `radio`                | `T103`        | yes — "`role="radiogroup"` labelled by the question title"           |
| `checkbox`             | `T104`        | yes — "the labelled group" (`T093`: `fieldset` + `legend` naming it) |
| `textbox` / `textarea` | `T105`        | **no** — asserts `maxlength`, dual rendering, error wiring only      |
| `rating`               | `T106`        | **no** — "labelled numeric row" is about presentation, not the name  |
| `satisfaction`         | `T107`        | **no** — "five visible labels" are the option labels, not the group  |

The fallback is `T129`'s `axe-core` sweep, and it is a partial fallback for two reasons worth writing
down rather than discovering at S9:

1. **axe detects a missing accessible name, not a wrong one.** A group labelled "Question" instead of
   its own question title satisfies axe and violates FR-053.
2. **axe is specified against "the survey viewer screen" (singular).** The viewer renders one page at a
   time, and the fixture spreads its 8 questions over 4 pages (all six types are present —
   `customer-feedback.json` has 2 `radio`, 1 `checkbox`, 1 `textbox`, 2 `textarea`, 1 `rating`,
   1 `satisfaction`). A sweep that renders page 1 only never label-checks the types on pages 2–4.

**S9 pass conditions.**

1. `a11y.axe.spec.ts` sweeps the viewer across **all four pages** of the fixture, so every one of the
   six types is covered by at least one axe run. One page only is a FAIL of this criterion, reported
   with which types went unchecked.
2. For `textbox`/`textarea`, `rating` and `satisfaction`, either the per-type spec asserts the group's
   accessible name equals the question title, or the gate report states that those three rest on axe
   name-presence alone and names the residual risk. Silence is not acceptable.
3. The 375px/1280px smoke gate (`T146`) stays the owner of visible focus and target size — jsdom proves
   neither, as `T129` itself records.

**Severity if unresolved at S9: this is a test-coverage gap, not an unimplemented FR.** I am recording
it here rather than filing it against `tasks.md` because the requirement is already binding in the
phase preamble and the fix belongs in the test files S8 writes.

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
