# S10 re-review — `001-survey-management` @ `fe54b10`

**Verdict: APPROVE.** No CRITICAL and no HIGH finding is open. Both HIGH findings from the first
review (`s10-code-review.md`, `15a9ce1`) are closed, each with a test that fails without the fix.

Reviewer: Code Reviewer. I wrote none of this code and fixed none of it. Merge readiness has one
dependency outside my verdict, recorded as MEDIUM-1 below.

Re-reviewed range: `15a9ce1..fe54b10` — 3 commits, 20 files, +914 / −212.

## Workspace note, and why every number here was re-measured

The shared workspace was concurrently held by run `10ce56f7` (issue PRI-31) throughout this review.
`pnpm prettier --check .` in the live working tree reports a failure on
`src/app/core/validators/answer.validator.spec.ts` — that file is **untracked**, PRI-31's in-flight
work, not branch content. Four more of PRI-31's files are in the tree the same way.

So every gate figure below was measured in a detached worktree checked out at `fe54b10`, with
nothing from the working tree in it. Taken from the live tree they would have been wrong in both
directions: the prettier failure is not the branch's, and the coverage figure would have been
inflated by three spec files the branch does not contain.

## Principles I–V (Governance requirement)

| Principle                                          | Verdict  | Change since `15a9ce1`                          |
| -------------------------------------------------- | -------- | ----------------------------------------------- |
| I JSON-driven, fails closed                        | **PASS** | unchanged; no change to the validator contract  |
| II Contracts first, logic in core                  | **PASS** | improved — a template ternary moved into `core` |
| III Validation before navigation and before submit | **PASS** | strengthened — MEDIUM-1's attachment overlap    |
| IV Quality gates, none relaxed                     | **PASS** | re-run at `fe54b10`; LOW-1's `skipIf` is gone   |
| V Accessible, responsive, on-brand                 | **PASS** | was FAIL — FR-055 is now implemented and tested |

### Gate IV, re-run by me at `fe54b10` in a clean worktree

```
prettier --check .     PASS   All matched files use Prettier code style!
tsc --noEmit           PASS   0 diagnostics
vitest run --coverage  PASS   55 files, 902 tests, 0 failures, 0 skipped
                              stmts 97.44  branch 93.26  funcs 99.40  lines 97.37  (thresholds 80)
ng build               PASS   dist/survey-viewer, lazy survey-page chunk 39.62 kB / 7.09 kB
```

Nothing relaxed. `coverage.exclude` is still `['src/app/**/*.spec.ts']` and the thresholds are still
80/80/80/80; `git diff a938ab0..fe54b10 -- tsconfig*.json package.json .prettierrc*` is empty; and
`grep -rE '\.(only|skip|skipIf|todo)\(|xit\(|xdescribe\('` over `src` now returns **nothing at all**,
which is LOW-1 closed rather than merely inactive.

Gate 5 (browser smoke, QA-owned) was passed at S9, 36/36 checks at both 375px and 1280px
(`s9-verification.md:28`). It does not need re-running at `fe54b10`: the three template extractions
moved markup byte-for-byte, and the one substantive change replaces an inline ternary with
`subject()`, which renders the same two strings. No stylesheet was touched.

## First-review findings, re-checked

| Finding      | Status                 | Evidence                                                                       |
| ------------ | ---------------------- | ------------------------------------------------------------------------------ |
| **HIGH-1**   | **FIXED**              | `survey-session.service.ts:555`, `messages.ts:207`, two specs                  |
| **HIGH-2**   | **FIXED**              | `survey-page.ts:95-160`, `survey-page.stale-load.spec.ts` (4 cases)            |
| **MEDIUM-1** | **FIXED**              | `survey-session.service.ts:324-344`, two overlap specs                         |
| **MEDIUM-2** | Mostly fixed, residual | 140 ticked / 8 unticked; 2 of the 8 are done-but-unticked — see MEDIUM-1 (new) |
| **LOW-1**    | **FIXED**              | `describe.skipIf` replaced by a throwing `requireModule`                       |
| **LOW-2**    | Partly fixed           | all 18 components now use `templateUrl`; wording still split — see LOW-5 (new) |
| **LOW-3**    | **FIXED**              | `survey-navigation.html:25` now binds `submitLabel()` from `messages.ts`       |
| **LOW-4**    | **FIXED**              | `attachment.validator.ts:172-190`, count check hoisted, `others` excludes self |
| **LOW-5**    | Open, Solution Arch.   | main-thread base64; unchanged, and a documented decision                       |
| **LOW-6**    | Open, CEO / DevOps     | `SimulatedSurveyResponseGateway` is still the root default                     |

### HIGH-1 — how I checked it, not just that a line appeared

`announcePolite(submittedAnnouncement(result.receipt.submissionId))` fires on the `acknowledged`
branch only, after the `submitted` transition. Three things had to hold beyond the call existing:

- The region must survive the DOM swap. `<app-live-region />` is in `app.html:3`, the shell, not in
  the survey feature — so the confirmation replacing the survey body does not destroy it. A region
  inserted together with its text is frequently not announced at all; this one predates the message.
- It must displace the stale `submittingAnnouncement()`. The two strings differ, so the signal does
  change, and the spec asserts `not.toBe('Submitting your response')` as well as the new wording.
- It must not fire on failure. `survey-session.service.spec.ts` asserts the failure path keeps the
  message assertive and never says "has been received".

### HIGH-2 — the epoch guard holds

A monotonic counter captured per load, re-compared after each of the two awaits, and incremented in
`DestroyRef.onDestroy`. A counter is the right tool here rather than an `AbortController`: the race
to win is the _write_, and an aborted fetch still resumes the `await` and falls through to one. Both
halves are tested — supersede-by-later-key (three cases: valid, catalog-error, not-found) and
destroy-while-in-flight. The stale load deliberately does not `clearPolite()`, and the spec asserts
the live load still owns the region (`polite()` is null after the stale one settles).

## Findings on the fix commits, ranked

No CRITICAL, no HIGH.

**MEDIUM-1 · `specs/001-survey-management/tasks.md:145` · the branch is not task-complete, and four
of the eight unticked boxes are genuinely unbuilt work.** Verified against `fe54b10` itself, not the
dirty tree: `answer.validator.spec.ts` (T035), `page.validator.spec.ts` (T037),
`survey.validator.spec.ts` (T038) and `submission-receipt.validator.spec.ts` (T039) are **not on the
branch**. All four exist in the working tree as untracked files because PRI-31 is writing them right
now. This is not a code defect and not mine to close — it is a merge-sequencing fact the board needs:
merging `fe54b10` today ships a branch whose own task list has four unbuilt test tasks on it. The
coverage gate does not catch this, because the validators are covered transitively at 97%.
T003 (DevOps gate baseline) and T139 (quickstart, only if drifted) are the other two real ones.
Owner: CEO to sequence PRI-31 before merge.

**LOW-1 · `vitest.config.ts:33-41` · dead configuration.** The `deps.external` list and the `alias`
block added in `893d19f` map four `node:` builtins to themselves, which is a no-op. I removed the
whole block in a scratch worktree and ran the full suite: 55 files, 902 tests, all passing — and the
only spec that touches `node:fs`/`node:path`/`node:url`, `survey-fixtures.contract.spec.ts`, passes
73/73 on its own. Failure scenario: none at runtime; the cost is a future reader treating an identity
alias as load-bearing and keeping it.

**LOW-2 · `src/app/core/services/announcer.service.ts:44` · `clear()` is dead code.** Documented as
"called when a screen is left", but the only caller anywhere is its own spec. Every live call site
uses `clearPolite()` or `clearAssertive()`. Failure scenario: none; it is a documented contract with
no implementation behind it, and the comment implies screen-leave clearing that does not happen.

**LOW-3 · `src/app/core/services/announcer.service.ts:27` · a polite message identical to the one
already in the region announces nothing.** `announcePolite` is a bare `signal.set`, and signals skip
notification on an `Object.is`-equal value, so no DOM mutation reaches the live region. Failure
scenario: open `/surveys/a` on a stalled connection, then navigate straight to `/surveys/b` without
passing through the catalog. The region already holds `'Loading'` from A, B sets `'Loading'` again,
nothing is announced, and US4 scenario 10's loading announcement is lost for B. Mostly unreachable in
practice because the catalog route clears the region on its memoised load (`catalog-page.ts:56`), and
pre-existing rather than introduced by HIGH-2's fix — but the fix does add one new way in, since a
load abandoned on destroy now deliberately leaves `'Loading'` behind.

**LOW-4 · `src/app/features/survey/submission-confirmation.html:1` · focus is not moved on
acknowledgement.** The Submit button the respondent activated is removed from the DOM, so focus
falls to `<body>`; the next Tab starts from the top of the document rather than at the confirmation.
The code comments at `messages.ts:198` and `survey-session.service.spec.ts:561` both state this as
known. `focusRequest` / `focusQuestion` already exist for exactly this kind of move, and
`app.html:6` already has a `tabindex="-1"` target. No SC is clearly violated and the new FR-055
announcement now carries the outcome and the reference number, so this is a LOW rather than the HIGH
it would have been without the announcement.

**LOW-5 · `src/app/shared/configuration-error.html:5` · respondent-facing wording is now split
across two files.** `configurationErrorSubject()` moved the scope noun into `messages.ts` while the
sentence it belongs to — "could not be used because its configuration does not satisfy its contract"
— stayed in the template. The Principle II half of LOW-2 is genuinely fixed (the branch moved into
`core`), but the copy is now in two places instead of one. `not-found-page.html` keeps all three of
its strings, and `submission-confirmation.html:4` keeps "Your response has been received. Thank
you." — which `messages.ts:204` claims in a comment that it tracks, while in fact the two strings
differ and are maintained separately. Failure scenario: a copy change to the configuration-error
sentence edits the template and misses `messages.ts`, or vice versa.

**LOW-6 · `src/app/core/services/survey-session.service.ts:355` · an overlapping selection's
rejections replace rather than accumulate.** `this.rejections.set(rejected)` holds only the last
selection's list. Failure scenario: select a 50 MB file plus a valid one, then select a second valid
file while the first is still being read; the "too large" message is wiped when the second selection
settles, possibly before it was read. Pre-existing, surfaced while verifying the MEDIUM-1 fix. The
fail-closed path is unaffected — nothing invalid is ever held.

**LOW-7 · `src/test-setup.ts:1` · `893d19f` deleted documentation under a `style:` subject.** The
removed comment explained why no `zone.js` polyfill is loaded and why
`provideZonelessChangeDetection()` is the only change-detection provider the TestBed registers. That
is the kind of thing the next person re-derives. Not a formatting change, so the commit subject is
misleading too.

## Correction to the first review

`s10-code-review.md` states there is no `.prettierignore`. There is one, added in `7eccce6`, and it
is in the diff against `main`. It exempts `pnpm-lock.yaml`, `dist`, `coverage`, `.angular`,
`public/favicon.ico` and `.specify/` — build artifacts, the lockfile and the Spec Kit directory. No
pattern touches `src/**`, so Gate 1 still covers every source and spec file and the conclusion that
no gate was relaxed is unchanged.

## Test quality on the fix commits

The four stale-load cases assert through the rendered DOM — the survey title in the heading, the
typed value still in the input, the absence of `app-configuration-error` and `app-not-found-page` —
rather than reading the epoch counter, which is the right altitude: the counter is an implementation
choice and the tests would survive replacing it. The two overlap cases drive the real race by
starting a second `addFiles` before awaiting the first, instead of reaching into the codec. The
FR-055 pair asserts both the message and its absence on the failure path. These are tests that would
have caught the three defects they were written for.

The gap the first review named is now closed on all three counts: every one of HIGH-1, HIGH-2 and
MEDIUM-1 lives in space a test now enters.

## Handoff

```
Goal: close the S10 review with a verdict on fe54b10.
Decisions: APPROVE — both HIGH findings fixed and tested, all four automatable gates re-run green in
  a clean worktree at fe54b10; seven new LOW findings recorded, none blocking; merge sequencing
  flagged as MEDIUM-1 because four unticked tasks are genuinely unbuilt on the branch.
Changed: specs/001-survey-management/s10-re-review.md only. No source file touched.
Open: CEO owns MEDIUM-1 (sequence PRI-31's T035/T037/T038/T039 before merge) and LOW-6 from the
  first review (the simulated gateway is the deployed default). Solution Architect owns LOW-5 from
  the first review. Angular Engineer owns new LOW-1 to LOW-7 if the board wants them cleared; none
  blocks the merge. QA Engineer owns the FR-055 row in test-map.md.
```
