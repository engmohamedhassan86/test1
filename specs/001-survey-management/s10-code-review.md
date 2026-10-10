# S10 — Independent code review of `001-survey-management`

Reviewer: Code Reviewer (PRI-23). Reviewed `001-survey-management` @ `a938ab0` against `main`
(236 files, 39,575 insertions). I wrote none of this code and fixed none of it.

## Verdict

**CHANGES REQUESTED.** Two HIGH findings block the merge. Everything else is recorded.

The engineering standard here is high: no `any` and no `!` anywhere under `src/app/**`, no
`innerHTML`, no hard-coded colour outside the token layer, `OnPush` on all 18 components, `track`
on every `@for`, no NgModule in application code, and a validator layer that genuinely fails
closed. The two blockers are both _omissions_ rather than wrong logic — one requirement that was
never built, and one lifecycle race that no test exercises.

## Gate set — re-run by me, not taken from the S9 report

```
pnpm prettier --check .      PASS   "All matched files use Prettier code style!"
pnpm tsc --noEmit            PASS   0 diagnostics
pnpm test:coverage           PASS   53 files, 881 tests, 0 failures, 0 skipped
                                    statements 97.33  branches 93.05  functions 99.38  lines 97.26
pnpm build (ng build)        PASS   dist/survey-viewer, 787.44 kB raw / 120.22 kB transfer
browser smoke 375/1280       QA-owned; evidence present in s9-evidence/smoke-{375,1280}.json
```

No gate was relaxed. I checked this specifically, because it is the easiest principle to violate
quietly:

- `vitest.config.ts` thresholds are 80/80/80/80, unchanged, and `coverage.exclude` is
  `['src/app/**/*.spec.ts']` — test files only. `app.config.ts` and `app.routes.ts` are covered,
  not exempted.
- `tsconfig.json` **adds** strictness rather than removing it: `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus `strictTemplates`.
- No `.prettierignore` was added.
- One `tsconfig.app.json` exclusion exists — `src/app/core/services/testing/**` — and it is the
  opposite of a relaxation: it makes an import of the failing-gateway test double from application
  code a build failure. `tsconfig.spec.json` still compiles that directory and coverage still
  counts it.
- No `.only`, no `xit`, no `xdescribe`. One conditional skip (LOW-1 below), which did not skip in
  my run — the reporter shows 881 passed and nothing skipped.

## Principles I–V, one by one

Required by the constitution's Governance section.

### I. JSON-driven domain contract, fails closed — PASS

A new survey is one file in `public/surveys/` plus one entry in `public/survey-manifest.json`,
with no change under `src/app/**`. I verified the whole chain: `survey-catalog.service.ts` reads
the manifest, `survey-loader.service.ts` fetches `entry.config` and validates it against
`entry.key`, and `question-host.ts` dispatches on the `type` discriminant. Nothing is keyed to a
survey.

Fails closed, confirmed at each layer:

- Unknown fields are hard failures at every level of the document — `survey-config.validator.ts`
  checks against explicit key allow-lists for the document (`:62`), pages (`:63`), questions
  (`:64`), options (`:89`), scale (`:90`) and attachments (`:91`), and raises `F03` rather than
  dropping the key.
- A seventh question type is a _compile_ failure, not a runtime guess: `viewOf`
  (`question-host.ts:131`), `validateAnswer` and `normalise` all switch with no `default` and end
  in `assertNever`.
- Broken references are failures: duplicate page ids (`:829`), question ids unique across the
  whole survey not merely within a page (`:540`), duplicate option ids (`:448`) and duplicate
  option values (`:456`).
- A config whose own `key` disagrees with the manifest key it was served under is invalid, not
  silently renamed (`survey-loader.service.ts`, `validateSurveyConfig(value, entry.key)`).
- No partial render is representable: `ResponseState`'s `loading` and `configuration-error`
  variants carry no `Survey` at all, so a template branch for either _cannot_ read survey data.
  That is the compiler enforcing FR-040/FR-042, which is better than a review enforcing it.
- `JsonFetchService` decides on the parsed body, not the status, so a 200 serving the SPA's HTML
  index fallback is `unreadable` rather than a survey.

### II. Contracts first, logic in core — PASS

Zero `any` under `src/app/core/**` (the only grep hit is the word "anything" in a comment). Zero
non-null assertions anywhere under `src/app/**`. Validation, transformation and submission logic
all live in `core`: `toggleOption` is in the session rather than in `checkbox-question` precisely
so a component cannot toggle against a stale list; `question-attachments.ts` never inspects a
file's type, size or name and routes every selection through `session.addFiles`.

Two deviations from the design artifacts are flagged _in the code itself_, with the reasoning,
rather than applied silently — `AttachmentSelectionResult.accepted` holding `AttachmentCandidate`
instead of `SessionAttachment` (`attachment.validator.ts` header), and the `ready -> editing ->
submitting` path for an all-optional survey that `plan.md` §3 does not name
(`survey-session.service.ts:468`). Both are correct calls and both are addressed to the Solution
Architect. That is the behaviour the constitution asks for.

Two minor strings are composed in templates rather than in `messages.ts` — LOW-3 and LOW-2 below.
Presentation, not logic, so this is a convention finding and not a Principle II failure.

### III. Validation before navigation and before submit — PASS on the mechanism

- Forward navigation is genuinely blocked. `next()` (`survey-session.service.ts:351`) calls
  `validatePage` and returns without touching `pageIndex` when any error stands. Next is left
  _enabled_ on purpose so a second press re-announces and re-moves focus; the refusal is the
  session's, not the button's, which is the right place for it.
- Every page is re-validated before submit. `runSubmission` (`:434`) calls `validateSurvey` over
  all pages in order and, when any page fails, mints **no** `clientSubmissionId` and makes **no**
  gateway call — it moves to `earliestInvalidPageIndex` instead.
- Attachment type, size and the 0–3 count are enforced at selection _and_ re-checked before
  submit. `validateAttachmentSelection` runs FR-023's five checks in contract order at selection;
  `attachmentErrorsFor` re-runs them through `validatePage`, so a file accepted under an earlier
  policy — or held by a question whose `attachments` block has since gone away — blocks both Next
  and Submit. `maxFiles` is validated to 0–3 in the config validator (`:266`), so a survey cannot
  configure its way past the limit. One check is silently inert on the re-check path: LOW-4.
- No success state can appear before acknowledgement. `submitted` is set only inside
  `if (result.outcome === 'acknowledged')` (`:513`), the transition table gives `submitting` only
  `['submitted', 'submission-error']`, and `submitted` has no outgoing edge. Double-submit is
  refused by the table, not by the disabled attribute: from `submitting`, both
  `canTransition('submitting','submitting')` and `canTransition('submitting','editing')` are
  false, so the guard at `:438` returns. I traced this specifically because the guard is an `&&`
  of two negations and would have been wrong if `submitting -> editing` existed. It does not.
- A failed submission preserves answers: answers, attachments, page index and errors are separate
  signals from `ResponseState`, so no state change can drop them. The `buildSurveyResponse` throw
  path is caught and mapped to `transport-error` rather than stranding the machine in `submitting`
  — a good catch by whoever wrote it.

The HIGH-1 finding sits adjacent to this principle: the acknowledgement is correct, but it is
never announced, so for a screen-reader user the acknowledgement is not _conveyed_.

### IV. Quality gates — PASS, nothing relaxed

See the gate table above. All five gates pass and every relaxation vector I checked is clean.

### V. Accessible, responsive, on-brand — FAIL (HIGH-1)

What is right: `aria-labelledby` composing the question title for every control; `aria-describedby`
ordering the error before the description (`question-host.ts:114`); the checkbox-group
`aria-required` workaround routed through `aria-describedby` because `role="group"` does not
support `aria-required` — that is a real standards detail, correctly handled, with the reason
written down; `afterRenderEffect` rather than `effect` for the focus move, because a blocked
Submit moves to a page that has not rendered yet and a plain `effect` would silently fail to move
focus; a `token` on `FocusRequest` so pressing Next twice moves focus twice; one visible focus
ring defined once in `src/styles.css:19` over `:focus-visible`; a skip link; per-file "Remove
<name>" button labels; no hard-coded colour in any component stylesheet; 36/36 smoke checks at
both 375px and 1280px; and a 429-line axe-core suite.

What is wrong: **FR-055 requires `submitted` to be announced politely, and it is not announced at
all.** HIGH-1.

## Findings, most severe first

### HIGH-1 — `src/app/core/services/survey-session.service.ts:513` — a successful submission is never announced

**Defect.** FR-055 requires that "loading, submitting, attachment added or removed, and submitted
MUST be announced politely." The `acknowledged` branch transitions to `submitted` and clears the
session, but makes no `announcer` call. Every other FR-055 event does: loading (`:117` of
`survey-page.ts`), submitting (`:479`), attachment added (`:310`), attachment removed (`:342`),
and both failure paths (`:507`, `:525`). Only the success path is missing. There is no
`submittedAnnouncement()` in `messages.ts` either, so nothing was half-built — it was never built.

**Failure scenario.** A screen-reader user on the last page presses Submit. The polite region says
"Submitting your answers". 400 ms later `survey-page.html` swaps the whole editing branch for
`<app-submission-confirmation>`; the Submit button they were focused on is removed from the DOM, so
focus falls to `<body>`. No announcement fires. The polite region still holds the _stale_
"Submitting your answers" — `clearPolite()` is not called on this path either — so a user who
navigates back to the live region is told the submission is still in progress. The user has no
indication that their response was received, and no indication that the reference number they were
promised exists. They are most likely to press Submit again, which the transition table correctly
refuses, producing silence a second time.

**Verification.** No test asserts the polite region after a successful submit — `grep -n polite`
across `survey-page.end-to-end.spec.ts` and `survey-page.states.spec.ts` returns nothing. The
S9 verification report's PASS does not cover it: `test-map.md` contains no FR-055 row. `tasks.md`
has no task that requires it, so the gap starts in the task breakdown and runs clean through
implementation and verification.

**Owner.** Angular Engineer, with a `messages.ts` string. QA Engineer should add the FR-055 row to
`test-map.md` so the gap cannot recur.

### HIGH-2 — `src/app/features/survey/survey-page.ts:98` — a stale survey load resets a live session

**Defect.** The constructor effect fires `void this.openSurvey(this.surveyKey())` with no epoch
guard, no `DestroyRef` cancellation and no abort of the in-flight config fetch. `openSurvey`
awaits `catalog.resolve` and then `loader.load`, and on either outcome calls
`session.open(...)` or `session.openFailed(...)` — both of which begin with `reset()`, which
clears `answerMap`, `attachmentMap`, `pageIndex`, `errorMap` and `submissionId`.
`SurveySessionService` is `providedIn: 'root'`, so that write lands even after the component that
started the request has been destroyed.

**Failure scenario.** On a phone (the stated primary target) with a stalled connection: the
respondent taps _Customer Feedback_, the config fetch hangs. They press Back to the catalog and
tap _Product Pulse_, which loads, and they answer two questions. Somewhere inside the 15-second
`SURVEY_TIMEOUTS.fetchMs` window the first request finally settles — and whichever way it settles,
the first survey's load calls into the singleton session:

- it resolves → `session.open(customerFeedback)` → `reset()` wipes the two answers they just gave
  and the viewer at `/surveys/product-pulse` renders _Customer Feedback_ page 1;
- it times out → `loader.load` returns `invalid` → `session.openFailed(...)` → `reset()` wipes the
  answers and replaces the page they are filling in with "This survey is not available".

Both outcomes lose a respondent's in-progress answers without warning, which is the exact harm
Principle III exists to prevent, and both show content that disagrees with the URL. A cheaper
variant needs no timing luck at all: if the first load settles while the respondent is on the
catalog, the next survey they open renders the _previous_ survey's page 1 until its own load
finishes, because the session is left in `ready` holding the wrong `Survey`.

**Verification.** No test drives a second `surveyKey` or two overlapping loads — `grep -rn
surveyKey src/app/features/survey/*.spec.ts` for a changed input returns nothing. Coverage is
97% and does not catch this, because every existing test opens exactly one survey.

**Owner.** Angular Engineer. The usual shape is an epoch counter captured before the first `await`
and compared before each write, plus cancellation on destroy.

### MEDIUM-1 — `src/app/core/services/survey-session.service.ts:274` — overlapping file selections drop the earlier batch

**Defect.** `addFiles` snapshots `const existing = this.attachmentsFor(question.id)` _before_ the
`await this.codec.read(file)` loop, then writes `next.set(question.id, [...existing, ...accepted])`
after it. Two overlapping calls both capture the same pre-state, so the second write overwrites
rather than appends.

**Failure scenario.** A question with `maxFiles: 3`. The respondent chooses a 9 MB PDF; the
`arrayBuffer()` read takes a moment. Before it resolves they choose a second file (the input is
disabled only when `full()` or `locked()`, and neither is true during a read). Batch one resolves:
the map holds `[pdf]` and the polite region announces "pdf added". Batch two resolves against its
stale `existing: []`: the map now holds `[second]`. The PDF is gone from the list and from the
payload, after the respondent was told it was attached. Secondarily, both batches validate the
free-slot check against the same `existing`, so the combined count can exceed `maxFiles` — that
half does fail closed, because `attachmentErrorsFor` re-checks the count at Next and at Submit.

**Note while you are in this function.** `files[candidates.indexOf(candidate)]` at `:284` recovers
the `File` by reference identity across a module boundary, and is O(n²). It is correct today
because `validateAttachmentSelection` pushes the same object references it was given, but it
couples two files through an undocumented invariant. Carrying the index on the candidate, or
zipping before validation, removes the coupling.

**Owner.** Angular Engineer.

### MEDIUM-2 — `specs/001-survey-management/tasks.md` — 120 of 148 task boxes unticked

**Defect.** 28 boxes are ticked and 120 are not, yet the work those boxes describe is demonstrably
done: the files exist, 881 tests pass, and the commit log closes T148. T001 (`axe-core` added),
T002 (the `tsconfig.app.json` exclusion), T004–T015 (every model file), T065 (the announcer) and
T080 (the catalog screen) are all unticked and all complete.

**Failure scenario.** The next agent to read `tasks.md` — a re-plan, a converge run, or whoever
picks up the HIGH findings — cannot distinguish "not built" from "built but not ticked" for 120
items, so they either re-do finished work or trust a summary over the checklist. It also means
the one genuinely missing item (HIGH-1's announcement, which no task covers) is invisible in a
sea of false negatives.

**Owner.** Angular Engineer to tick what landed; QA Engineer to confirm the ticks against the
test map.

### LOW-1 — `src/app/core/validators/survey-fixtures.contract.spec.ts:549` — a conditional skip that can silently disable half a suite

`describe.skipIf(!VALIDATORS_LIVE)` was scaffolding for a phase where the validators did not yet
exist. They exist now, `VALIDATORS_LIVE` is true, and the block ran in my verification — 881
passed, nothing skipped, so this is **not** a live gate relaxation. But `VALIDATORS_LIVE` is
computed by `existsSync` over filenames (`:162`), so renaming or moving `survey-config.validator.ts`
would make the entire second half of the fixture contract suite vanish from the run with a green
report rather than a red one. Now that the modules are real, a static import makes the same
coupling a compile error.

### LOW-2 — `src/app/shared/{live-region,configuration-error,not-found-page}.ts` — inline templates against the repo convention

Three of eighteen components use `template:` backticks; the other fifteen use `templateUrl`. The
project convention is explicit — `name.ts` + `name.html` + `name.css`, never inline. These three
also already have a sibling `.css`, so only the `.html` is missing. `configuration-error.ts`
additionally composes respondent-facing wording in its template —
`error().scope === 'manifest' ? 'The survey catalog' : 'The survey'` — which is the one place a
user-visible sentence is assembled outside `messages.ts`.

### LOW-3 — `src/app/features/survey/survey-navigation.html:25` — button label composed in the template

`{{ inputsLocked() ? 'Submitting…' : 'Submit' }}` is the only other respondent-facing string not in
`messages.ts`. Presentational, so it is a preference — but `messages.ts` is otherwise exhaustive,
and that is worth keeping.

### LOW-4 — `src/app/core/validators/attachment.validator.ts:173` — the duplicate check is inert on the re-check path

`attachmentErrorsFor` calls `firstFailure(attachment, policy, [])` with an always-empty `held`, so
check 4 of five — "not already attached, by name and size" — can never fire at re-check time. It is
unreachable today because selection blocks duplicates, so there is no input that breaks it. It
matters only because this function _is_ the fail-closed layer: its stated job is to catch what
selection-time checks let through, and it quietly implements four of the five rules it documents.
Passing the other held files as `held` (excluding the file under test) would close it.

### LOW-5 — `src/app/core/services/survey-session.service.ts:563` — base64 encoding blocks the main thread

`encodeHeldAttachments` walks every held byte through `toBase64` synchronously, inside the same
synchronous block that has already set the state to `submitting`. With three 10 MiB files on each
of several attachment questions this is tens of megabytes of `String.fromCharCode` plus `btoa` on
the main thread, then a string roughly 1.33× that size held alongside the original `Uint8Array`s.
On a mid-range phone that is seconds of frozen UI and a plausible OOM.
`contracts/response-submission.md:93` states the client holds no total payload ceiling of its own
and that a receiver's limit arrives as `rejected` or `server-error`, so this is a documented
decision rather than a defect — recorded for the **Solution Architect** in case the ceiling is
worth revisiting.

### LOW-6 (informational) — the default adapter acknowledges without sending anything

`SimulatedSurveyResponseGateway` is the `providedIn: 'root'` gateway and always acknowledges after
400 ms; `HttpSurveyResponseGateway` carries a bare `@Injectable()` and is deliberately absent from
the `core/services` barrel. This is exactly what FR-068 specifies, and it is the right call for
gate determinism — I am not asking for a change. Recording it because of what it means downstream:
any deploy of this branch shows a respondent "Your response has been received" and a reference
number for a submission that never left their browser, and no task in `tasks.md` owns wiring
`HttpSurveyResponseGateway` into a deployment's `providers`. The preview deploy must not be
described to anyone as collecting real responses. **CEO / DevOps Engineer** to decide whether that
wiring is in scope for this feature or the next.

## Test quality

Spot-checked across the session service, the validators and the feature specs. Tests assert
behaviour rather than internals: `response-state.model.spec.ts` asserts the full 8×8 transition
matrix against `plan.md` §3 rather than the shape of the table object; the page-level specs drive
the component through a harness and assert rendered text, focus location and live-region contents;
`survey-fixtures.contract.spec.ts` validates the shipped survey JSON against the real validators
instead of a restatement of the rules. The `__fixtures__` builders are used consistently, so no
spec hand-rolls a `Survey`.

The weakness is not in how the tests assert — it is in what they never set up. Both HIGH findings
are in the space no test enters: no spec changes the routed `surveyKey`, no spec overlaps two
file selections, and no spec reads the polite region after a successful submit. 97% line coverage
with 881 passing tests did not surface any of the three, which is the useful reminder here about
what a coverage number measures.

## What I did not review

The Spec Kit artifacts under `specs/001-survey-management/` as _specifications_ — they are the
Product Owner's and Solution Architect's stages, and I read them only as the contract I judged the
code against. The browser smoke test at 375px and 1280px is the QA Engineer's gate; I confirmed the
evidence files exist and report 36/36 at each width, and did not re-run it.
