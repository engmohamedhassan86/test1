# Analyze gate report — 001-survey-management

Stage: `/speckit-analyze`. Owner: Solution Architect.
Artifacts under analysis: `spec.md`, `plan.md`, `tasks.md`, `data-model.md`,
`contracts/survey-json.md`, `contracts/response-submission.md`, `test-map.md`.

## Finding counts by severity

| Severity | Open | Closed               |
| -------- | ---- | -------------------- |
| CRITICAL | 0    | 0                    |
| HIGH     | 0    | 1 (A-01)             |
| MEDIUM   | 0    | 2 (A-02, A-06)       |
| LOW      | 0    | 3 (A-03, A-04, A-05) |

**Gate verdict: PASS.** No CRITICAL and no HIGH finding is open, and as of the follow-up pass
recorded under "Annotation close-out" below, **no finding of any severity is open**. A-03, A-04 and
A-05 were carried into S8 as annotation debt by the first two passes; the follow-up pass closed them
in `tasks.md` instead, and in doing so found one real coverage gap (A-06, FR-005) that the
behavioural argument for the uncited FRs had got wrong.

## Findings

### A-01 — HIGH — `test-map.md` cited task ids that do not exist (CLOSED)

The first version of `test-map.md` mapped acceptance scenarios to task ids `T149`–`T180`.
`tasks.md` contains `T001`–`T148`, so 24 of its cited ids referenced no task at all, and the ids
in range pointed at unrelated tasks — US1 scenario 1 ("Page 1 of 4", disabled Previous) was mapped
to `T084`/`T085`, which are the not-found-screen and live-region specs; the real task is `T102`.
The same file claimed "154 total tasks" against an actual 148.

Impact if left open: `test-map.md` is the traceability input to the S9 Verify gate (`T148`). QA
would have verified scenarios against task ids that do not exist and could not have closed the
gate.

Resolution: `test-map.md` has been regenerated mechanically from the `US<n> scenario <m>`
annotations carried by `tasks.md` itself, so the two files cannot drift by hand again. Verified
count: **61 of 61 scenarios map to at least one real task**. The authoritative matrix is in
`test-map.md`; the counts are reproduced under "Verified evidence" below.

### A-02 — MEDIUM — gate evidence was stated but not measured (CLOSED)

The first version of this report asserted "all 19 acceptance scenarios" (the spec has 61 across
six user stories), "154 tasks" (there are 148), and closed with "Recommendation: proceed to
`/speckit-tasks`" — a stage that had already completed two commits earlier. Each claim is now
replaced with a measured one, and every number below is reproducible by the command shown.

### A-03 — LOW — US4 scenario 2 has no scenario annotation on the task that covers it (CLOSED)

US4.2 ("activating _Customer Feedback_ changes the URL to `/surveys/customer-feedback` and page 1
renders") is covered substantively: `T080` renders each manifest entry's title as a link to
`/surveys/<key>`, and `T087` registers that route. Neither task carries the `US4 scenario 2`
marker, so the mechanical matrix attributes it only to the blanket traceability task `T148`.
Resolution: `T080` now carries `US4 scenarios 1 and 2` and states that activating an entry
navigates to that survey's route, and `T083` now asserts that activating the `Customer Feedback`
link puts the URL at `/surveys/customer-feedback` and renders page 1 of that survey. Regenerated
mapping: `US4.2 -> T080, T083, T148`.

### A-04 — LOW — US4 scenario 9 has no scenario annotation on the task that covers it (CLOSED)

US4.9 (manifest unanswered after 10s renders the configuration-error screen) is covered by `T050`
("a request that never answers → `timeout` at exactly `fetchMs`") plus `T048`, which maps a failed
`load` to `catalog-error`, and `SURVEY_TIMEOUTS.fetchMs` is `10_000` via `T046`/`T082`. The
`US4 scenario 9` marker was absent from all three. Resolution: `T050` now carries it on the
deadline case, and `T083` asserts that a manifest request which never answers leaves `loading` for
the configuration-error screen once the 10s deadline passes. Regenerated mapping:
`US4.9 -> T050, T083, T148`.

### A-05 — LOW — four success criteria are not annotated with their `SC-` id (CLOSED)

`SC-003` (each of the six question types blocks Next on an invalid input), `SC-004` (every
violating file rejected at selection), `SC-006` (confirmation unreachable without an
acknowledgement) and `SC-008` (375px and 1280px, no horizontal scroll) carry no `SC-` id inside
`tasks.md`, though each is covered: `SC-003` by `T114` plus the per-type specs `T103`–`T107`,
`SC-004` by `T026`/`T036`/`T121`, `SC-006` by `T070`/`T074`, `SC-008` by `T146`. The other ten
criteria were already annotated. Resolution: the four ids are now in `tasks.md` — `SC-003` on
`T114`, `SC-004` on `T026`/`T036`/`T121`, `SC-006` on `T070`/`T074`, `SC-008` on `T146` — so all
fourteen are annotated and `test-map.md`'s criteria table is derivable rather than asserted.

## Verified evidence

Each row states what was measured and the command that measures it. Run from
`specs/001-survey-management/`.

| #   | Check                                                                       | Result                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task ids in `tasks.md` are unique and contiguous                            | 148 ids, `T001`–`T148`, no duplicates                                                                                                                                                                                                                                     |
| 2   | Acceptance scenarios in `spec.md`                                           | 61 across 6 user stories (US1 8, US2 14, US3 11, US4 11, US5 8, US6 9)                                                                                                                                                                                                    |
| 3   | Scenarios mapped to at least one real task                                  | 61 / 61                                                                                                                                                                                                                                                                   |
| 4   | Functional requirements in `spec.md`                                        | 77 (`FR-001`–`FR-077`)                                                                                                                                                                                                                                                    |
| 5   | FRs cited by id in `tasks.md`                                               | **77 of 77** after the close-out pass (60 of 77 before it)                                                                                                                                                                                                                |
| 6   | The 17 FRs not cited by id, checked individually for behavioural coverage   | all 17 covered — see table below                                                                                                                                                                                                                                          |
| 7   | Task FR references that do not exist in the spec                            | none                                                                                                                                                                                                                                                                      |
| 8   | `Question` union agrees between `contracts/survey-json.md` §7 and `spec.md` | yes — exactly `radio`, `checkbox`, `textbox`, `textarea`, `rating`, `satisfaction`                                                                                                                                                                                        |
| 9   | `ResponseState` union agrees between `plan.md` and `spec.md` FR-045         | yes — all eight states named identically                                                                                                                                                                                                                                  |
| 10  | Attachment limits agree across spec, plan and contract                      | yes — see note below                                                                                                                                                                                                                                                      |
| 11  | Business logic kept out of components                                       | yes — `plan.md` §6.2 admits exactly four things into a component; `T130` (no validation, transformation or submission expression in a template or component file), `T133` (no `any` under `core`) and `T134` (`assertNever`, no `default` branch) enforce it mechanically |

```sh
# 1
grep -oE '\bT[0-9]{3}\b' tasks.md | sort -u | wc -l          # 148
# 4, 5, 7
grep -oE '\bFR-[0-9]{3}\b' spec.md  | sort -u | wc -l         # 77
grep -oE '\bFR-[0-9]{3}\b' tasks.md | sort -u | wc -l         # 60, all a subset of the above
# 10
grep -rn 'maxSizeBytes' spec.md plan.md contracts/ data-model.md
```

### Regenerating the scenario → task matrix (check 3)

`test-map.md` is derived, not hand-written. Run this from `specs/001-survey-management/` after any
change to `tasks.md` and paste the output into `test-map.md`'s "Scenario → task" section. It reads
the `US<n> scenario <m>` markers the tasks already carry, so a scenario with no marker shows as
`—` and is a real gap.

```sh
node -e '
const fs = require("fs");
const lines = fs.readFileSync("tasks.md", "utf8").split(/\r?\n/);
const counts = { US1: 8, US2: 14, US3: 11, US4: 11, US5: 8, US6: 9 };
const map = {};
for (const k in counts) { map[k] = {}; for (let i = 1; i <= counts[k]; i++) map[k][i] = []; }
for (const line of lines) {
  const task = line.match(/\[ \] (T\d{3})/);
  if (!task) continue;
  const re = /US(\d) scenarios?\s+((?:\d+(?:\s*[–-]\s*\d+)?)(?:\s*(?:,|and)\s*\d+(?:\s*[–-]\s*\d+)?)*)/g;
  let m;
  while ((m = re.exec(line))) {
    const us = "US" + m[1];
    if (!map[us]) continue;
    for (const part of m[2].split(/\s*(?:,|and)\s*/)) {
      const range = part.match(/^(\d+)\s*[–-]\s*(\d+)$/);
      if (range) { for (let i = +range[1]; i <= +range[2]; i++) if (map[us][i]) map[us][i].push(task[1]); }
      else if (map[us][+part]) map[us][+part].push(task[1]);
    }
  }
}
for (const us of Object.keys(counts)) {
  console.log("| Scenario | Task(s) |\n|---|---|");
  for (let i = 1; i <= counts[us]; i++)
    console.log("| " + us + "." + i + " | " + ([...new Set(map[us][i])].join(", ") || "—") + " |");
  console.log();
}'
```

Checks 12 and 13 use the same approach over `SC-0nn` and the `contract test N` phrases:

| #   | Check                                                                           | Result                         |
| --- | ------------------------------------------------------------------------------- | ------------------------------ |
| 12  | Success criteria `SC-001`–`SC-014` mapped to a task                             | 14 / 14 (4 unannotated — A-05) |
| 13  | Contract tests 1–13 from `contracts/response-submission.md` §7 mapped to a task | 13 / 13                        |

### Attachment limits (check 10, detail)

`maxFiles` is an integer 0–3 in all three documents, and `0` or an absent `attachments` block
normalises to `null` so no control renders (`spec.md` FR-021, `contracts/survey-json.md` §3 R46/R49,
`tasks.md` T023/T117). Two different numbers appear for size and both are correct: `5242880`
(5 MB) is the value the default fixture sets, and `10485760` (10 MB) is the contract ceiling a
config may not exceed — `contracts/survey-json.md` R52 and `spec.md:835` state the same ceiling, and
`contracts/response-submission.md` §4 bounds the worst-case payload at `maxFiles` 3 × 10 MB. No
conflict.

### Check 6, detail — the 17 FRs not cited by id

| FR     | Behaviour                                                         | Covered by                                                  |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| FR-001 | survey is an ordered list of pages of questions                   | T006 (domain model), T023                                   |
| FR-002 | page and question ids unique; duplicate is a config error         | T023 (rules R03–R52 one-to-one), T043 fixtures              |
| FR-005 | question renders title, optional description, required indication | **was not covered — see A-06**; now `T091` + `T111`         |
| FR-006 | `radio` single-choice, minimum 2 options                          | T006, T023, T092                                            |
| FR-007 | `checkbox` multi-choice, minimum 2 options                        | T006, T023, **T093** (the row first said T094 — wrong)      |
| FR-008 | `textbox` one line, `textarea` multi-line                         | T006, T023, T094                                            |
| FR-011 | every answer on the page validated before leaving it              | T027 `validatePage`, T068 (Next gate)                       |
| FR-019 | error rendered with its question, in plain language               | T022 (message table), T092, T103 (`aria-describedby`)       |
| FR-025 | accepted files listed per question with name and readable size    | T117 with `formatFileSize` from T013                        |
| FR-028 | accepted types come from the question's `acceptedTypes`           | T026 (first of the five ordered checks)                     |
| FR-044 | unfetchable or invalid manifest renders configuration error       | T024, T048, T080, T083                                      |
| FR-046 | only the named `ResponseState` transitions are allowed            | T067 (`transitionTo` throws on an illegal edge), T074, T101 |
| FR-047 | `/` renders a catalog from `public/survey-manifest.json`          | T040, T080, T083                                            |
| FR-049 | `/surveys/:surveyKey` loads, validates and renders                | T086, T087, T049                                            |
| FR-052 | default fixture is the four-page customer-feedback survey         | T041, T043                                                  |
| FR-056 | every flow completable by keyboard with a visible focus ring      | T136, T077                                                  |
| FR-059 | brand colour reaches the UI only through design tokens            | T131 (grep for literal colours fails the task)              |

The 17 are a **traceability-notation** gap, not a coverage gap: `tasks.md` cites the contract's
`R`/`F` rule ids and the behaviour text where the spec cites an `FR` id. Both notations are
anchored to the same contract, so no requirement is unimplemented.

## Constitution check

| Principle                                            | Verdict | Anchor                                                                                                                                            |
| ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — JSON-driven, fail closed                         | PASS    | `plan.md` §6.1 normalises defaults in one place; T023 returns a single configuration error; T088 asserts exactly one error screen per bad fixture |
| II — feature isolation, contracts first              | PASS    | contracts, `data-model.md` and service interfaces all exist before any component task (T006–T052 precede T086)                                    |
| III — validation before navigation and before submit | PASS    | T027 `validatePage` gates Next (FR-011); T070 `submit` revalidates every page in order including the FR-027 attachment re-check (FR-034)          |
| IV — quality gates, ≥80% coverage                    | PASS    | T142–T147 run prettier, tsc, vitest with coverage, and build                                                                                      |
| V — accessible, responsive, on-brand                 | PASS    | T136 (keyboard, skip link), T131 (tokens only), T065 (announcements composed in core)                                                             |

## Disposition

- `/speckit-analyze` is **complete** with 0 CRITICAL and 0 HIGH open.
- Next stage: **S7 Content** (`PRI-20`, Survey Content Author) and **S8 Implement** (`PRI-21`,
  Angular Engineer). S7's fixture and manifest work (T040–T045) is a dependency of several S8
  tasks, so S7 starts first or in parallel.
- Carried into S8: nothing from A-03, A-04 or A-05 — the close-out pass below made those fixes in
  `tasks.md` rather than deferring them to the implementer. `T148` must still list every scenario
  against a **named test** before S9 closes; a task id is not a test.

## QA counter-verification

Re-measured independently by the QA Engineer at commit `2cfa3e0`, because `test-map.md` is QA's
traceability input to the S9 Verify gate and A-01 was a defect in the version QA produced. Every
number below was measured in this pass, not copied from the section above. Commands run from
`specs/001-survey-management/`.

| #   | Check                                                              | Command                                                                                   | Measured                       | Agrees                  |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------ | ----------------------- |
| Q1  | Task ids unique and contiguous `T001`–`T148`                       | `comm -3 <(seq -f 'T%03g' 1 148 \| sort) <(grep -oE '\bT[0-9]{3}\b' tasks.md \| sort -u)` | 148, no gap/extra              | yes                     |
| Q2  | **A-01 regression check** — every id cited by `test-map.md` exists | `comm -23 <(grep -oE '\bT[0-9]{3}\b' test-map.md \| sort -u) <(… tasks.md \| sort -u)`    | 0 dangling of 62               | yes                     |
| Q3  | Acceptance scenarios in `spec.md`, per user story                  | `awk` over `**Acceptance Scenarios**` numbered items                                      | 61 (8/14/11/11/8/9)            | yes                     |
| Q4  | Scenario rows in `test-map.md`, none unmapped                      | `awk` over `\| USn.m` rows                                                                | 61 rows, 0 unmapped            | yes                     |
| Q5  | Scenarios whose only mapping is the blanket `T148`                 | same                                                                                      | exactly US4.2, US4.9           | yes — matches A-03/A-04 |
| Q6  | FRs defined vs cited; no task cites a non-existent FR              | `comm` over `FR-[0-9]{3}` in `spec.md` and `tasks.md`                                     | 77 defined, 60 cited, 0 orphan | yes                     |
| Q7  | The 17 uncited FRs each have an explanatory row in this file       | per-FR `grep` against the check-6 table                                                   | 17 / 17 explained              | yes                     |
| Q8  | `Question` union, contract vs spec FR-003                          | `survey-json.md:91`, `:262–269` vs `spec.md:488`                                          | identical six                  | yes                     |
| Q9  | `ResponseState` union, plan §3 vs spec FR-045                      | `plan.md:278–296` vs `spec.md:674–676`                                                    | identical eight                | yes                     |
| Q10 | Attachment limits across spec, plan, contract                      | `grep -rn 'maxFiles\|5242880\|10485760'`                                                  | consistent                     | yes                     |
| Q11 | Business logic kept out of components                              | `grep -nE '\[ \] (T130\|T133\|T134)' tasks.md`                                            | all three present              | yes                     |

On Q10, QA confirms the two size numbers are distinct concepts and not a contradiction: `5242880`
is the value the default fixture sets (`spec.md:265`, `:726`, `:834`), `10485760` is the ceiling a
config may not exceed (`spec.md:835`, `survey-json.md` R52 and `:171`, `data-model.md` F15,
`response-submission.md:91`). `maxFiles` is 0–3 in all three.

### Quality gates at this stage

Only one of the five gates has a subject at S6. Reported honestly rather than dropped:

```
prettier --check    PASS  All matched files use Prettier code style!
tsc --noEmit        NOT RUN at S6 — no feature source exists yet
vitest --coverage   NOT RUN at S6 — 3 spec files, all foundation; no core/** to cover
ng build            NOT RUN at S6 — nothing added to build
smoke 375/1280px    NOT RUN at S6 — no app to drive
```

`src/app/app.routes.ts` is still `export const routes: Routes = [];` and `src/app/core/{models,
services,validators}` hold only README placeholders, so there is no behaviour to typecheck, cover,
build or drive in a browser. These four gates are **S9's**, against the implemented app, and QA owns
the browser smoke gate there.

**Residual risk accepted at this gate**: an analyze gate proves the _documents_ agree with each
other, not that the described behaviour is achievable. A consistent spec can still be wrong. The
risks that survive to S9 and that QA will test rather than read:

1. **The two blanket-only scenarios.** US4.2 and US4.9 map only to `T148`, so nothing but the
   traceability task currently promises to assert them. QA will fail S9 if `T148`'s table names no
   real test for either.
2. **The 17 FRs with no id in `tasks.md`.** Coverage was argued behaviourally, one FR at a time, by
   reading. That reasoning is not mechanically checkable and could be wrong for an individual FR.
   QA will re-derive coverage for these 17 from the test names that exist at S9, not from this table.
3. **The `SC-` annotation gaps (A-05).** `SC-003`, `SC-004`, `SC-006` and `SC-008` are covered by
   named tasks but carry no `SC-` id, so the generator cannot see them. If the implementer does not
   add the markers, the S9 regeneration will show four false gaps.

### QA verdict

Gate **PASS** for the purpose it serves: the artifacts are mutually consistent and `test-map.md` is
now a usable S9 input — every id in it resolves to a real task. A-01 is confirmed fixed, not merely
claimed fixed. The three open LOW findings are annotation debt carried into S8 and are accepted.

## Annotation close-out (third pass, Solution Architect)

QA passed the gate at `7492ef6` and accepted A-03, A-04 and A-05 as annotation debt, carrying three
residual risks into S9. Two of those risks were defects in `tasks.md`, which this role owns, and S8
had not started — so the debt was cheaper to pay here than to re-derive at S9. This pass closed all
three in `tasks.md` and re-derived `test-map.md` from it.

QA's risk 2 was the one worth taking seriously: the behavioural argument for the 17 uncited FRs was
"argued by reading" and therefore not mechanically checkable. Converting that argument into
annotations tested it, and it was **wrong in two places** — one a bookkeeping slip, one a real gap.

### A-06 — MEDIUM — FR-005's required indication was named by no task (CLOSED)

FR-005 requires each question to render its title, its optional description, **and a visible
indication of whether an answer is required**. The check-6 table above attributed it to
`T091`/`T092`, but `T091` only routed on `question.type` and `T092` only rendered the radio group;
`grep -nE 'FR-005|required indication' tasks.md` matched **nothing**. The question title was covered
by plan §6.4's labelled-group paragraph and the per-page description by `T097`/`T109` (FR-073), but
no task named the per-question description or the required indication. An implementer following
`tasks.md` literally would have shipped a survey in which a respondent cannot tell which questions
are required — and no test would have failed.

This is the first finding in this feature that was a missing requirement rather than a missing
label, and it was found only because A-05's annotation work forced each uncited FR to name a task.

Resolution: `T091` now renders the question title, the optional `description` when present with no
empty element left behind when absent, and the visible required indication — once, for all six
types, so no type can omit it. `T111` asserts all three, including that an optional question shows
no required indication. Placing it in the host rather than in six components also keeps the branch
in one place, per plan §6.2.

Severity rationale: MEDIUM, not HIGH. The requirement is stated in `spec.md` and is reachable from
`T091`'s file, so the gate's own artifacts still agreed with each other; nothing downstream was
blocked and no contract was wrong. It would have become a HIGH at S9 as an unimplemented FR.

Also corrected in the check-6 table: FR-007 (`checkbox`) was attributed to `T094`, which is the
text-question component. The checkbox component is `T093`. A transcription slip, no behaviour
affected.

### Measured before and after

Commands run from `specs/001-survey-management/`.

| Measure                                                | Before (`7492ef6`) | After                      |
| ------------------------------------------------------ | ------------------ | -------------------------- |
| Task ids, unique and contiguous `T001`–`T148`          | 148, 0 gap         | **unchanged** — 148, 0 gap |
| Scenarios mapped to at least one task                  | 61 / 61            | 61 / 61                    |
| Scenarios whose **only** mapping is the blanket `T148` | 2 (US4.2, US4.9)   | **0**                      |
| FRs cited by id in `tasks.md`, of 77 defined           | 60                 | **77**                     |
| Task FR references that do not exist in `spec.md`      | 0                  | 0                          |
| Success criteria carrying their `SC-` id in `tasks.md` | 10 / 14            | **14 / 14**                |
| `test-map.md` rows that changed when regenerated       | —                  | exactly 2 (US4.2, US4.9)   |

```sh
# task-id invariant held
comm -3 <(seq -f 'T%03g' 1 148 | sort) <(grep -oE '\bT[0-9]{3}\b' tasks.md | sort -u) | wc -l   # 0
# FR coverage, both directions
comm -23 <(grep -oE '\bFR-[0-9]{3}\b' spec.md | sort -u) <(grep -oE '\bFR-[0-9]{3}\b' tasks.md | sort -u)  # empty
comm -13 <(grep -oE '\bFR-[0-9]{3}\b' spec.md | sort -u) <(grep -oE '\bFR-[0-9]{3}\b' tasks.md | sort -u)  # empty
# SC coverage
grep -oE '\bSC-[0-9]{3}\b' tasks.md | sort -u | wc -l   # 14
```

`test-map.md` was rewritten by the generator in "Regenerating the scenario → task matrix" above, not
by hand, and the generator reported **exactly two changed rows** — `US4.2` and `US4.9`. That the
other 59 rows were byte-identical is the evidence that these edits added annotations and changed no
existing mapping.

### What this does and does not do for QA's residual risks

- **Risk 1 (blanket-only scenarios): closed.** US4.2 and US4.9 now name `T080`/`T083` and
  `T050`/`T083`. `T148` is no longer the only task promising to assert them.
- **Risk 2 (the 17 uncited FRs): converted from prose to annotation, and it found A-06.** All 77 FRs
  are now citable with `grep`. This proves the _task list_ names every FR; it does not prove a test
  exists. QA should still re-derive coverage from the test names at S9 — that check is what would
  catch another A-06.
- **Risk 3 (`SC-` gaps): closed.** All 14 criteria are annotated, so the S9 regeneration will not
  show four false gaps.

One risk is new and belongs to S9: `T091` is now the single place rendering the required indication
for all six question types, so a regression there is a regression on every type at once. `T111`'s
optional-vs-required assertion is the test that must not be dropped.
