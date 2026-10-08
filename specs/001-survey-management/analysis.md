# Analyze gate report — 001-survey-management

Stage: `/speckit-analyze`. Owner: Solution Architect.
Artifacts under analysis: `spec.md`, `plan.md`, `tasks.md`, `data-model.md`,
`contracts/survey-json.md`, `contracts/response-submission.md`, `test-map.md`.

## Finding counts by severity

| Severity | Open | Closed in this pass  |
| -------- | ---- | -------------------- |
| CRITICAL | 0    | 0                    |
| HIGH     | 0    | 1 (A-01)             |
| MEDIUM   | 0    | 1 (A-02)             |
| LOW      | 3    | 0 (A-03, A-04, A-05) |

**Gate verdict: PASS.** No CRITICAL and no HIGH finding is open. The three LOW findings are
annotation gaps, not coverage gaps; each is recorded below with the task that already covers the
behaviour, so none blocks `/speckit-implement`.

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

### A-03 — LOW — US4 scenario 2 has no scenario annotation on the task that covers it (OPEN)

US4.2 ("activating _Customer Feedback_ changes the URL to `/surveys/customer-feedback` and page 1
renders") is covered substantively: `T080` renders each manifest entry's title as a link to
`/surveys/<key>`, and `T087` registers that route. Neither task carries the `US4 scenario 2`
marker, so the mechanical matrix attributes it only to the blanket traceability task `T148`.
Action: the implementer adds the URL assertion to `T083` and the marker to `T080`. Not a blocker —
no behaviour is unspecified.

### A-04 — LOW — US4 scenario 9 has no scenario annotation on the task that covers it (OPEN)

US4.9 (manifest unanswered after 10s renders the configuration-error screen) is covered by `T050`
("a request that never answers → `timeout` at exactly `fetchMs`") plus `T048`, which maps a failed
`load` to `catalog-error`, and `SURVEY_TIMEOUTS.fetchMs` is `10_000` via `T046`/`T082`. The
`US4 scenario 9` marker is absent from all three. Action: same as A-03 — add the marker when the
tasks are executed. Not a blocker.

### A-05 — LOW — four success criteria are not annotated with their `SC-` id (OPEN)

`SC-003` (each of the six question types blocks Next on an invalid input), `SC-004` (every
violating file rejected at selection), `SC-006` (confirmation unreachable without an
acknowledgement) and `SC-008` (375px and 1280px, no horizontal scroll) carry no `SC-` id inside
`tasks.md`, though each is covered: `SC-003` by `T114` plus the per-type specs `T103`–`T107`,
`SC-004` by `T026`/`T036`/`T121`, `SC-006` by `T070`/`T074`, `SC-008` by `T146`. The other ten
criteria are annotated. Action: the implementer adds the id when executing those tasks. The full
mapping is in `test-map.md`. Not a blocker.

## Verified evidence

Each row states what was measured and the command that measures it. Run from
`specs/001-survey-management/`.

| #   | Check                                                                       | Result                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task ids in `tasks.md` are unique and contiguous                            | 148 ids, `T001`–`T148`, no duplicates                                                                                                                                                                                                                                     |
| 2   | Acceptance scenarios in `spec.md`                                           | 61 across 6 user stories (US1 8, US2 14, US3 11, US4 11, US5 8, US6 9)                                                                                                                                                                                                    |
| 3   | Scenarios mapped to at least one real task                                  | 61 / 61                                                                                                                                                                                                                                                                   |
| 4   | Functional requirements in `spec.md`                                        | 77 (`FR-001`–`FR-077`)                                                                                                                                                                                                                                                    |
| 5   | FRs cited by id in `tasks.md`                                               | 60 of 77                                                                                                                                                                                                                                                                  |
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
| FR-005 | question renders title, optional description, required indication | T091/T092 (question host and radio), T041                   |
| FR-006 | `radio` single-choice, minimum 2 options                          | T006, T023, T092                                            |
| FR-007 | `checkbox` multi-choice, minimum 2 options                        | T006, T023, T094                                            |
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
- Carried into S8: A-03 and A-04 are annotation fixes the implementer makes in place while
  executing T080/T083/T050. `T148` must list every scenario against a named test before S9 closes.

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
