# S9 Verify — gate report and scenario-to-test map (001-survey-management)

Owner: QA Engineer. Run date 2026-10-09, against `4e65632` on `001-survey-management`.
This file is the T148 deliverable plus the T142–T147 gate record. It names a **real, existing
test** for every acceptance scenario, success criterion and contract test, or says plainly that
none exists.

## Verdict

**The five gates pass. The end-to-end acceptance flow passes. The stage fails on T148's own
done-condition**: contract test 11 is mapped to no test, and contract tests 5 and 12 are only
half-mapped, because `T057` (the real HTTP adapter) and `T063` (its spec) were never written.
Detail in "Defects" below.

## 1. Gate set

```
prettier --check   PASS
tsc --noEmit       PASS  (tsconfig.app.json and tsconfig.spec.json, 0 diagnostics)
vitest --coverage  PASS  statements 97.18%  branches 92.63%  functions 99.36%  lines 97.11%
                         52 files, 849 tests, 0 failures; thresholds 80/80/80/80 unchanged
ng build           PASS  dist/survey-viewer/browser, initial 787.17 kB raw / 119.92 kB transfer
smoke 375px        PASS  41/41 checks
smoke 1280px       PASS  41/41 checks
```

Nothing was relaxed. `vitest.config.ts` still sets all four thresholds to 80 and still excludes
only `src/app/**/*.spec.ts`. No Prettier ignore entry, no `tsconfig` flag loosened, no skipped test.

### Gate task detail

| Task | Condition                                                                                            | Result                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| T142 | `prettier --check .` exits 0, no ignore entry added                                                  | PASS — "All matched files use Prettier code style!"                                                     |
| T143 | both tsconfigs, 0 diagnostics                                                                        | PASS — `typecheck:app` 0, `typecheck:spec` 0                                                            |
| T144 | all four metrics >= 80%, nothing excluded                                                            | PASS — 97.18 / 92.63 / 99.36 / 97.11                                                                    |
| T145 | output in `dist/survey-viewer/browser`, no `failing-survey-response.gateway` in the bundle           | PASS — output confirmed; 0 matches for `failing-survey-response` and `FailingSurveyResponse` in `dist/` |
| T146 | 375px + 1280px, no horizontal scroll, no truncated control, contrast >= 4.5:1, icon targets >= 44x44 | PASS — see §2                                                                                           |
| T147 | SC-013: a third survey works with no `src/app` change                                                | PASS — see §2                                                                                           |
| T148 | every scenario and contract test maps to a named test                                                | **FAIL** — contract test 11 unmapped                                                                    |

## 2. Browser smoke — real Chromium, both widths

Driven with Playwright + Chromium 156 against `ng serve` on `127.0.0.1:4269`. Playwright was
installed into the run scratch directory, so `package.json` and `pnpm-lock.yaml` are untouched.
Every row below passed at **both** 375px and 1280px.

| #   | Acceptance check                                                      | Evidence                                                                                                                                                                            |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/` lists the manifest surveys; survey opens at `/surveys/:surveyKey` | links `["Customer Feedback","Product Pulse"]` in manifest order; URL `=/surveys/customer-feedback`                                                                                  |
| 2   | Required empty blocks Next, error shown, focus on first offender      | held on "Page 1 of 4"; `role=alert` = "What should we call you? \| Enter an answer \| Which one sounds most like you? \| Choose one option"; `activeElement.id=sv-q-q_name-control` |
| 3   | min/max text length blocks                                            | min: held, alert "Use at least 2 characters"; max: 200 chars typed, field holds 80                                                                                                  |
| 3   | min/max selections blocks                                             | min: alert "Select at least 1 option"; max: 4th of 5 refused at selection (1280px) / alert "Select no more than 3 options" then Next held (375px)                                   |
| 4   | Answers survive Back                                                  | page 2 `{liked:2, satisfaction:"Satisfied", rating:1}` identical after Previous; page 1 `q_name="Mina"`, `q_segment="new"`                                                          |
| 5   | Attachment limit 0-3                                                  | counter "3 of 3 files"; 4th refused, rejection "You can attach up to 3 files to this question"                                                                                      |
| 5   | Rejected file type                                                    | `notes.txt` never enters the list; counter stays "1 of 3 files"; `role=alert` "notes.txt: this file type is not accepted (allowed: PNG, JPEG, PDF)"                                 |
| 5   | Oversized file                                                        | 6 MB vs 5 MB cap; not attached; `role=alert` "huge.png: this file is larger than the 5 MB limit"                                                                                    |
| 5   | Attachments survive Back                                              | `receipt.png,a.png,b.png` identical after Previous/Next                                                                                                                             |
| 6   | Submit blocked while invalid, no call made                            | held on page 4; alert "Would you recommend us to another family? \| Choose one option"; 0 network requests observed                                                                 |
| 7   | Completion only after acknowledgement                                 | poll sequence `pending,pending,COMPLETE`; "Your response has been received. Thank you."; `app-question-host` count 0                                                                |
| 8   | Configuration error fails closed                                      | "This survey is not available / ... does not satisfy its contract / F04 / pages[1]..."; `app-question-host` count 0, no page indicator                                              |
| 9   | Keyboard-only full page                                               | tab stops `["sv-skip-link","sv-q-q_name-control","q_segment","Next"]`; radio set with Space, Next with Enter advanced to page 2                                                     |
| 9   | Focus always visible                                                  | all 4 tab stops render an outline (`solid 2px`) or box-shadow                                                                                                                       |
| 9   | Nothing mouse-only                                                    | no interactive element carries a negative tabindex; the only `tabindex=-1` targets are `MAIN#main` and the page `H2`, both programmatic-focus targets                               |
| 9   | No horizontal scroll                                                  | `scrollWidth <= clientWidth` on catalog, survey, validation, attachments, completion, config-error at both widths                                                                   |

FR-057 contrast and SC-008 target size, measured over **nine** screens (catalog, survey pages 1/2/4,
validation state, attachments with a rejection visible, completion, configuration error, not found):

- contrast: 125 text nodes, **0 failures**; worst ratio **4.76:1** on the catalog description
  (needs 4.5). Text inside a `disabled` control is excluded under WCAG 2.1 SC 1.4.3's
  inactive-component exemption — the disabled Previous sits at 3.86:1, and the enabled Previous at
  10.95:1.
- icon / single-character targets: 5 of them (the rating stars), smallest **44x44px** exactly.
- every choice control's real click target is its wrapping `<label>` — 864x44 at 1280px, not the
  18x18 input box.
- no control clips its own content at either width.

SC-013 (T147), measured by a real add-and-remove cycle: a third survey `qa-probe.json` plus one
manifest entry appeared in the catalog, opened at `/surveys/qa-probe`, rendered its question and
submitted to the confirmation screen at both widths, with `git diff --stat -- src/app` reporting
**zero changed files** throughout. Both files were then removed and the tree returned clean. The
first attempt at that fixture omitted `options[].id` and the viewer failed closed with
`F02 pages[0].questions[0].options[0].id: required field is missing` — an unplanned but welcome
confirmation of Principle I against a real, non-intercepted bad config.

## 3. T148 — scenario to named test

All 61 acceptance scenarios map to a real test that exists and passes. 49 are cited by `US<n>
scenario <m>` inside the test name; the remaining 12 carry no annotation and were matched by
behaviour, which is recorded per row.

### US1

| Scenario | Test file                                           | Named test                                                                                                                           | How                    |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| US1.1    | `features/survey/survey-page.end-to-end.spec.ts`    | SurveyPageComponent — end to end (US1) opens on page 1 of 4 with Previous unavailable and Next offered (scenario 1)                  | cited by the test name |
| US1.2    | `features/survey/survey-page.end-to-end.spec.ts`    | SurveyPageComponent — end to end (US1) advances to page 2 once page 1 is answered, through the Next control (scenario 2) _(+1 more)_ | cited by the test name |
| US1.3    | `features/survey/survey-page.end-to-end.spec.ts`    | SurveyPageComponent — end to end (US1) walks all four pages and offers Submit only on the last one (scenario 3)                      | cited by the test name |
| US1.4    | `features/survey/submission-confirmation.spec.ts`   | SubmissionConfirmationComponent renders the submission id as the respondent's reference (US1 scenario 4) _(+4 more)_                 | cited by the test name |
| US1.5    | `features/survey/survey-page.end-to-end.spec.ts`    | SurveyPageComponent — end to end (US1) keeps every answer when stepping back, and never validates on the way (scenario 5)            | cited by the test name |
| US1.6    | `features/survey/questions/rating-question.spec.ts` | RatingQuestionComponent returns the question to unanswered on Clear, and Next is still accepted (FR-060, US1 scenario 6) _(+1 more)_ | cited by the test name |
| US1.7    | `features/survey/survey-page-body.spec.ts`          | SurveyPageBodyComponent leaves no element behind for an absent survey description (US1 scenario 7) _(+1 more)_                       | cited by the test name |
| US1.8    | `features/survey/survey-page.end-to-end.spec.ts`    | SurveyPageComponent — end to end (US1) reopening the survey starts a fresh response at page 1 (scenario 8) _(+1 more)_               | cited by the test name |

### US2

| Scenario | Test file                                                 | Named test                                                                                                                                                         | How                                                        |
| -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| US2.1    | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) blocks Next on an unanswered required radio, naming and focusing it (scenario 1)                                    | cited by the test name                                     |
| US2.2    | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) reports the required rule, not the length rule, for a whitespace-only answer (scenario 2)                           | cited by the test name                                     |
| US2.3    | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) reports the length rule for a non-empty answer that is too short (scenario 3)                                       | cited by the test name                                     |
| US2.4    | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) blocks Next on a checkbox below minSelections, focusing its first box (scenario 4)                                  | cited by the test name                                     |
| US2.5    | `core/validators/messages.spec.ts`                        | the counter, the hint and the announcements renders the US2 scenario 5 hint _(+1 more)_                                                                            | cited by the test name                                     |
| US2.6    | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) blocks Next on an empty required satisfaction, naming its range (scenario 6)                                        | cited by the test name                                     |
| US2.7    | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) renders both errors, lists both in page order and focuses the first (scenario 7)                                    | cited by the test name                                     |
| US2.8    | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) clears one question's error the moment it is answered, without Next (scenario 8)                                    | cited by the test name                                     |
| US2.9    | `features/survey/survey-page.retention.spec.ts`           | SurveyPageComponent — retention across navigation (US2 scenario 9, SC-012) keeps every answer on pages 1, 2 and 3 across Previous twice and Next twice _(+5 more)_ | cited by the test name                                     |
| US2.10   | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) never blocks Previous on an invalid page (scenario 10)                                                              | cited by the test name                                     |
| US2.11   | `features/survey/questions/satisfaction-question.spec.ts` | renders exactly five points, in scale order (FR-010) _(+1 more)_                                                                                                   | matched by behaviour (no `US` annotation in the test name) |
| US2.12   | `core/services/survey-session.service.spec.ts`            | SurveySessionService previous discards the errors but keeps every answer (FR-064, US2 scenario 12) _(+1 more)_                                                     | cited by the test name                                     |
| US2.13   | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) blocks Next on a maxSelections breach that arrived without the control (scenario 13) _(+1 more)_                    | cited by the test name                                     |
| US2.14   | `features/survey/survey-page.validation.spec.ts`          | SurveyPageComponent — blocked navigation (US2) blocks Next on a trimmed answer longer than maxLength (scenario 14)                                                 | cited by the test name                                     |

### US3

| Scenario | Test file                                                         | Named test                                                                                                                                                                      | How                    |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| US3.1    | `features/survey/questions/question-attachments.spec.ts`          | QuestionAttachmentsComponent accepting a file (US3 scenario 1) lists a 1 MB receipt.pdf with its name and size, counts it, and shows no error _(+2 more)_                       | cited by the test name |
| US3.2    | `core/validators/messages.spec.ts`                                | the six attachment rejection texts (US3 scenarios 2-7) unaccepted-type names the file and the allowed labels (US3 scenario 2) _(+10 more)_                                      | cited by the test name |
| US3.3    | `core/validators/messages.spec.ts`                                | the six attachment rejection texts (US3 scenarios 2-7) unaccepted-type names the file and the allowed labels (US3 scenario 2) _(+10 more)_                                      | cited by the test name |
| US3.4    | `core/validators/messages.spec.ts`                                | the six attachment rejection texts (US3 scenarios 2-7) unaccepted-type names the file and the allowed labels (US3 scenario 2) _(+12 more)_                                      | cited by the test name |
| US3.5    | `core/validators/messages.spec.ts`                                | the six attachment rejection texts (US3 scenarios 2-7) unaccepted-type names the file and the allowed labels (US3 scenario 2) _(+12 more)_                                      | cited by the test name |
| US3.6    | `core/validators/messages.spec.ts`                                | the six attachment rejection texts (US3 scenarios 2-7) unaccepted-type names the file and the allowed labels (US3 scenario 2) _(+12 more)_                                      | cited by the test name |
| US3.7    | `core/validators/messages.spec.ts`                                | the six attachment rejection texts (US3 scenarios 2-7) unaccepted-type names the file and the allowed labels (US3 scenario 2) _(+10 more)_                                      | cited by the test name |
| US3.8    | `features/survey/questions/question-attachments.spec.ts`          | QuestionAttachmentsComponent removing a file (US3 scenario 8) drops the counter to 2 of 3, re-opens the control and announces the removal                                       | cited by the test name |
| US3.9    | `features/survey/questions/question-attachments.spec.ts`          | QuestionAttachmentsComponent zero files on an optional question (US3 scenario 9, FR-022) leaves an optional question with no files valid                                        | cited by the test name |
| US3.10   | `features/survey/questions/question-attachments.spec.ts`          | QuestionAttachmentsComponent a question with no attachment policy (US3 scenario 10, FR-021) renders no file control at all when attachments is null _(+1 more)_                 | cited by the test name |
| US3.11   | `features/survey/questions/question-attachments.survival.spec.ts` | QuestionAttachmentsComponent — survival across navigation (US3 scenario 11, FR-065) lists both files with the same names and sizes after a Previous/Next round trip _(+3 more)_ | cited by the test name |

### US4

| Scenario | Test file                                      | Named test                                                                                                                   | How                                                        |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| US4.1    | `features/catalog/catalog-page.spec.ts`        | lists every survey in the manifest, each as a link to its own route (ready) _(+1 more)_                                      | matched by behaviour (no `US` annotation in the test name) |
| US4.2    | `features/catalog/catalog-page.spec.ts`        | US4.2, following a catalog link puts the URL at /surveys/customer-feedback and renders page 1 of that survey                 | matched by behaviour (no `US` annotation in the test name) |
| US4.3    | `features/catalog/catalog-page.spec.ts`        | states that there are no surveys without calling it an error (empty, FR-048)                                                 | matched by behaviour (no `US` annotation in the test name) |
| US4.4    | `features/catalog/catalog-page.spec.ts`        | renders the configuration-error screen for an unreadable manifest (FR-044)                                                   | matched by behaviour (no `US` annotation in the test name) |
| US4.5    | `features/catalog/catalog-page.spec.ts`        | US4.2, following a catalog link renders the not-found screen for a key the manifest does not hold (FR-050) _(+1 more)_       | matched by behaviour (no `US` annotation in the test name) |
| US4.6    | `shared/not-found-page.spec.ts`                | renders general wording when the catch-all route has no key to name _(+1 more)_                                              | matched by behaviour (no `US` annotation in the test name) |
| US4.7    | `core/services/survey-catalog.service.spec.ts` | SurveyCatalogService resolves to catalog-error, never not-found, for an unreadable manifest (FR-066, US4 scenario 7)         | cited by the test name                                     |
| US4.8    | `core/services/survey-catalog.service.spec.ts` | SurveyCatalogService fetches once for two resolve calls (FR-067, US4 scenario 8) _(+1 more)_                                 | cited by the test name                                     |
| US4.9    | `core/services/survey-catalog.service.spec.ts` | SurveyCatalogService leaves loading for configuration-error once the 10s deadline passes (US4 scenario 9)                    | cited by the test name                                     |
| US4.10   | `features/catalog/catalog-page.spec.ts`        | CatalogPageComponent — the four states (FR-074) announces the wait politely while the request is in flight (US4 scenario 10) | cited by the test name                                     |
| US4.11   | `core/services/json-fetch.service.spec.ts`     | JsonFetchService treats an HTML body under HTTP 200 as unreadable (FR-076, US4 scenario 11)                                  | cited by the test name                                     |

### US5

| Scenario | Test file                                          | Named test                                                                                                                              | How                                                        |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| US5.1    | `core/validators/survey-config.validator.spec.ts`  | §9.7 — ordering, and how many issues a failure reports yields exactly one issue for an R03 failure, examining no field (US5 scenario 1) | cited by the test name                                     |
| US5.2    | `core/validators/survey-config.validator.spec.ts`  | R21 type is not one of the six yields F04 at pages[0].questions[0].type _(+1 more)_                                                     | matched by behaviour (no `US` annotation in the test name) |
| US5.3    | `core/validators/survey-config.validator.spec.ts`  | R22 a field the contract defines nowhere yields F03 at pages[0].questions[0].placeholder _(+1 more)_                                    | matched by behaviour (no `US` annotation in the test name) |
| US5.4    | `core/validators/survey-config.validator.spec.ts`  | R15 duplicate page id yields F07 at pages[1].id _(+1 more)_                                                                             | matched by behaviour (no `US` annotation in the test name) |
| US5.5    | `core/validators/survey-config.validator.spec.ts`  | R37 minSelections above the option count yields F12 at pages[0].questions[0].minSelections _(+1 more)_                                  | matched by behaviour (no `US` annotation in the test name) |
| US5.6    | `features/survey/survey-page.config-error.spec.ts` | SurveyPageComponent — configuration errors is terminal: the only way out is the link to the catalog (US5 scenario 6)                    | cited by the test name                                     |
| US5.7    | `core/services/survey-loader.service.spec.ts`      | SurveyLoaderService maps an HTML body under HTTP 200 to F18 (FR-076, US5 scenario 7)                                                    | cited by the test name                                     |
| US5.8    | `core/services/survey-loader.service.spec.ts`      | maps a request still unanswered at the deadline to F19 (FR-075)                                                                         | matched by behaviour (no `US` annotation in the test name) |

### US6

| Scenario | Test file                                                | Named test                                                                                                                                                       | How                    |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| US6.1    | `features/survey/survey-page.submission-failure.spec.ts` | SurveyPageComponent — submission failure (US6) renders an assertive error with Try again and keeps page 4 intact (scenario 1) _(+1 more)_                        | cited by the test name |
| US6.2    | `core/services/survey-session.service.spec.ts`           | SurveySessionService submit reports timeout at exactly submitMs (contract test 7, US6 scenario 2) _(+1 more)_                                                    | cited by the test name |
| US6.3    | `features/survey/survey-page.submission-failure.spec.ts` | SurveyPageComponent — submission failure (US6) renders the confirmation with the returned reference after Try again (scenario 3)                                 | cited by the test name |
| US6.4    | `features/survey/survey-page.submission-failure.spec.ts` | SurveyPageComponent — submission failure (US6) clears the stale error and offers Submit again after editing an answer (scenario 4)                               | cited by the test name |
| US6.5    | `features/survey/survey-page.submission-failure.spec.ts` | SurveyPageComponent — submission failure (US6) starts no second submission while the first is still in flight (scenario 5, FR-039)                               | cited by the test name |
| US6.6    | `features/survey/survey-page.blocked-submit.spec.ts`     | SurveyPageComponent — Submit blocked by an earlier page (US6 scenario 6) starts no submission _(+6 more)_                                                        | cited by the test name |
| US6.7    | `features/survey/survey-page.attachment-submit.spec.ts`  | SurveyPageComponent — attachments at submit (FR-027, US6 scenario 7) starts no submission when a held file no longer satisfies its question (FR-027) _(+6 more)_ | cited by the test name |
| US6.8    | `features/survey/survey-page.submission-failure.spec.ts` | SurveyPageComponent — submission failure (US6) renders the 401 sentence with no credential prompt at all (scenario 8, FR-062)                                    | cited by the test name |
| US6.9    | `features/survey/survey-page.idempotency.spec.ts`        | SurveyPageComponent — submission idempotency (US6 scenario 9, SC-011) re-sends the same clientSubmissionId with a later submittedAt on Try again _(+5 more)_     | cited by the test name |

### Success criteria SC-001 to SC-014

| Criterion                                                                | Named test or measurement                                                                                                                                                                                                                                | Status                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| SC-001 keyboard-completable                                              | `a11y.axe.spec.ts` sweep + this gate's keyboard-only pass (radio via Space, Next via Enter, all tab stops reached, focus visible)                                                                                                                        | PASS                                                                      |
| SC-002 catalog within 1s, first question within 1s                       | `app.config.spec.ts` "provides the fetch and submit deadlines as a value (FR-075, FR-038)"; routes are all `loadComponent`, catalog chunk 2.88 kB                                                                                                        | PASS                                                                      |
| SC-003 each of the six types blocks Next                                 | `survey-page.validation.spec.ts` blocked-navigation set (scenarios 1, 4, 6, 8, 12, 13, 14) + per-type `radio/checkbox/text/rating/satisfaction-question.spec.ts`                                                                                         | PASS                                                                      |
| SC-004 every violating file rejected at selection, valid files kept      | `messages.spec.ts` "the six attachment rejection texts (US3 scenarios 2-7)" (all six reasons) + `question-attachments.mixed.spec.ts`                                                                                                                     | PASS                                                                      |
| SC-005 every failure class reaches the error screen                      | `survey-page.config-error.spec.ts` — 16 survey classes F01-F16 and 6 manifest classes, each "renders the error screen and no survey for …", plus "covers the whole contract table, so a new class cannot be added without a case"                        | PASS                                                                      |
| SC-006 confirmation unreachable without an acknowledgement               | `simulated-survey-response.gateway.spec.ts` "acknowledges with a receipt that satisfies isSubmissionReceipt (SC-006)" + `survey-page.blocked-submit.spec.ts`                                                                                             | PASS                                                                      |
| SC-007 answers and attachments survive an induced failure                | `survey-session.service.spec.ts` "keeps every answer and attachment intact after each of the seven failure kinds (SC-007)" + `survey-page.submission-failure.spec.ts` "leaves every answer on every page unchanged after a failure (scenario 1, SC-007)" | PASS                                                                      |
| SC-008 375px / 1280px no horizontal scroll, 320px reflow                 | this gate, both widths, six screens each; plus contrast and 44px target measurement                                                                                                                                                                      | PASS                                                                      |
| SC-009 no WCAG 2.1 AA violation on each screen                           | `a11y.axe.spec.ts` (10 tests, axe sweep over all four pages)                                                                                                                                                                                             | PASS                                                                      |
| SC-010 scenarios map to tests, >= 80% line coverage of `src/app/core/**` | this map; **`src/app/core/**` statement coverage 97.01% (1072/1105)**, every core file above 80%                                                                                                                                                         | **PARTIAL** — coverage passes, the map has the contract-test-11 gap below |
| SC-011 every retry reuses its attempt's `clientSubmissionId`             | `survey-session.service.spec.ts` "retry re-uses the clientSubmissionId with a fresh submittedAt (contract test 10)" + `survey-page.idempotency.spec.ts` (US6 scenario 9, SC-011)                                                                         | PASS                                                                      |
| SC-012 navigation both ways loses nothing                                | `survey-page.retention.spec.ts` "retention across navigation (US2 scenario 9, SC-012)"                                                                                                                                                                   | PASS                                                                      |
| SC-013 a second survey needs no `src/app` change                         | measured this gate: add-and-remove cycle, `git diff --stat -- src/app` empty                                                                                                                                                                             | PASS                                                                      |
| SC-014 never left in `loading` beyond 10s                                | `survey-catalog.service.spec.ts` "leaves loading for configuration-error once the 10s deadline passes (US4 scenario 9)" + `catalog-page.spec.ts` US4.9 + `survey-loader.service.spec.ts` F19                                                             | PASS                                                                      |

### Contract tests 1 to 13 (`contracts/response-submission.md` §7)

| #   | Contract test                                                 | Named test                                                                                                                                                                                                                                                               | Status      |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1   | valid payload matches §2 exactly                              | `survey-response-payload.spec.ts` "carries the survey key and the identity it was handed", "orders answers by survey page order then question order"                                                                                                                     | PASS        |
| 2   | each `value` shape per question type                          | `survey-response-payload.spec.ts` "carries each type with the value shape contract §2 fixes for it"                                                                                                                                                                      | PASS        |
| 3   | decoded `content` length equals `sizeBytes`                   | `attachment-codec.service.spec.ts` "round trips bytes through base64 with the decoded length equal to sizeBytes"                                                                                                                                                         | PASS        |
| 4   | acknowledgement produces `submitted`, surfaces `submissionId` | `simulated-survey-response.gateway.spec.ts` "acknowledges with a non-empty submissionId" + `submission-confirmation.spec.ts` "renders the submission id as the respondent's reference (US1 scenario 4)"                                                                  | PASS        |
| 5   | acknowledgement missing `submissionId` → `submission-error`   | only the **kind → message** half exists (`messages.spec.ts` "malformed-response reads …", `submission-error-banner.spec.ts`). Nothing asserts a 2xx body missing `submissionId` **maps to** `malformed-response`, because that mapping lives in the absent T057 adapter. | **PARTIAL** |
| 6   | each failure `kind` → own message, answers intact             | `messages.spec.ts` "the seven submission failure texts, verbatim from contract §4" (all seven) + `survey-session.service.spec.ts` SC-007                                                                                                                                 | PASS        |
| 7   | a boundary that never answers → `timeout` at 15s              | `survey-session.service.spec.ts` "submit reports timeout at exactly submitMs (contract test 7, US6 scenario 2)"                                                                                                                                                          | PASS        |
| 8   | a second Submit during `submitting` starts no second call     | `survey-session.service.spec.ts` "starts no second call for a Submit pressed during submitting (contract test 8)"                                                                                                                                                        | PASS        |
| 9   | Submit with an invalid page makes no call                     | `survey-page.blocked-submit.spec.ts` "Submit blocked by an earlier page (US6 scenario 6) starts no submission" + `survey-session.service.spec.ts` "validates every page, moves to the earliest invalid one, and makes no call"                                           | PASS        |
| 10  | retry reuses `clientSubmissionId`, reopen mints a new one     | `survey-session.service.spec.ts` "retry re-uses the clientSubmissionId with a fresh submittedAt (contract test 10)" + "mints a different clientSubmissionId after the survey is reopened (SC-011)"                                                                       | PASS        |
| 11  | `Idempotency-Key` set, no `Authorization` header              | **NO TEST.** The assertion requires the real adapter, which does not exist.                                                                                                                                                                                              | **FAIL**    |
| 12  | HTTP 401 → `unauthorized` message, no credential prompt       | only the **kind → message/no-prompt** half exists (`survey-page.submission-failure.spec.ts` "renders the 401 sentence with no credential prompt at all (scenario 8, FR-062)"). Nothing maps an actual **HTTP 401** to the `unauthorized` kind.                           | **PARTIAL** |
| 13  | a Submit blocked by FR-034 mints no `clientSubmissionId`      | `survey-session.service.spec.ts` "mints no clientSubmissionId for a submission validation blocked (contract test 13)" + `survey-page.idempotency.spec.ts`                                                                                                                | PASS        |

10 of 13 fully mapped, 2 half-mapped, 1 unmapped.

## 4. Defects

### D1 (HIGH) — T057 never written: the real HTTP adapter does not exist

- **What I did**: `ls src/app/core/services/ | grep -i gateway`, then
  `grep -rln "HttpSurveyResponseGateway" src/`.
- **Expected**: `src/app/core/services/http-survey-response.gateway.ts`, as T057 requires —
  `POST /api/survey-responses`, `Idempotency-Key: <clientSubmissionId>`, no `Authorization`
  header and no session cookie, and the complete contract §11.3 status mapping
  (400/422 → `rejected`, 404 → `not-found`, 401/403 → `unauthorized`, 5xx → `server-error`,
  a 2xx body failing `isSubmissionReceipt` → `malformed-response`, transport failure →
  `transport-error`).
- **What happened**: the file does not exist and nothing in `src/` references the class. Only the
  abstract `survey-response.gateway.ts` (37 lines, types + abstract class) and
  `simulated-survey-response.gateway.ts` are present.
- **Where specified**: `tasks.md` T057; `contracts/response-submission.md` §11, §11.1, §11.3;
  FR-061, FR-062.
- **Severity**: HIGH for the stage, **not** a runtime defect. The simulated adapter is the wired
  default (FR-068), so the shipped app submits correctly — I drove it to the confirmation screen at
  both widths. What is missing is the adapter the contract specifies and the status mapping it owns.

### D2 (HIGH) — T063 never written: contract test 11 is unmapped, 5 and 12 are half-mapped

- **What I did**: extracted all 849 test names from a real `vitest run --reporter=json`, then
  grepped for `Idempotency-Key`, `Authorization`, `401`, and the §11.3 status rows.
- **Expected**: `src/app/core/services/http-survey-response.gateway.spec.ts`, as T063 requires —
  contract test 11 (`Idempotency-Key` equals `clientSubmissionId`, no `Authorization` sent), all
  eight §11.3 status rows (contract tests 6 and 12, including HTTP 401 → `unauthorized` with §4's
  exact text), and a 200 with a body missing `submissionId` → `malformed-response` (contract test 5).
- **What happened**: the file does not exist. `Idempotency-Key` appears in `src/` only in two
  comments (`id-factory.service.ts:5`, `id-factory.service.spec.ts:2`), never in an assertion.
  Every failure kind enters the suite through the `FailingSurveyResponseGateway(kind)` test double,
  which injects the kind directly, so no test converts an HTTP status into a kind.
- **Where specified**: `tasks.md` T063; `contracts/response-submission.md` §7 items 5, 11, 12 and
  §11.3; T148's done-condition ("no scenario and no contract test is unmapped").
- **Severity**: HIGH. This is the condition that fails the stage.

### D3 (MEDIUM) — five validator spec files named by tasks.md do not exist

`answer.validator.spec.ts`, `attachment.validator.spec.ts`, `page.validator.spec.ts`,
`survey.validator.spec.ts` and `submission-receipt.validator.spec.ts` (T035–T039) are all absent,
though every validator **source** file exists.

This is a convention and traceability deviation, not a coverage hole — the validators are covered
indirectly and every one clears the bar on its own:

| Validator                         | statements | branches |
| --------------------------------- | ---------- | -------- |
| `page.validator.ts`               | 100%       | 100%     |
| `survey.validator.ts`             | 100%       | 100%     |
| `attachment.validator.ts`         | 95.5%      | 89.3%    |
| `answer.validator.ts`             | 90.3%      | 83.7%    |
| `submission-receipt.validator.ts` | 83.3%      | 83.3%    |

Every scenario `test-map.md` attributes to T035–T039 does have a real named test, in a
component-level or session-level spec instead. The cost is that these pure functions are asserted
only through their callers, which is the opposite of the repo's stated convention ("validators are
pure; tests live beside the source"). Worth a decision, not a release block.

### D4 (LOW, bookkeeping) — tasks.md checkboxes do not reflect the work

19 of 148 tasks are ticked, yet the feature is substantially implemented and passing 849 tests. The
checkbox state is therefore not a usable progress signal for the next stage. Two of the unticked
boxes (T057, T063) are genuinely unbuilt; most of the rest are done but unticked. I ticked
T142–T147 (my own gate runs, all passing) and left T148 unticked because its done-condition fails.

## 5. Residual risks, stated plainly

1. **The real adapter is unverified in every respect.** With T057/T063 absent, nothing exercises
   `Idempotency-Key`, the absence of `Authorization`, `credentials: 'omit'`, or any HTTP status
   mapping. If the real endpoint is switched on later, none of that behaviour has ever run.
2. **Cross-page revalidation at submit is not browser-reachable.** Forward navigation validates each
   page and `app.routes.ts` has no per-page deep link, so "standing on page 4 with page 1 invalid"
   cannot be produced through the UI. FR-034 is therefore proven only by
   `survey-page.blocked-submit.spec.ts` and `survey-session.service.spec.ts` "validates every page,
   moves to the earliest invalid one, and makes no call" — good tests, but defence in depth here is
   untested from the outside.
3. **`question-attachments.ts` branch coverage is 58.3%**, the lowest in the tree. Global thresholds
   pass comfortably, and I exercised the accept/reject/limit/survive-Back paths by hand in a real
   browser, but the uncovered branches in that component are not named by any test.
4. **The skip link is 122x19px unfocused and 146x35px focused.** Below 44px, but it is not an
   icon or single-character target, so T146 does not require 44px of it, and WCAG 2.1 AA has no
   target-size criterion. Under WCAG 2.2 SC 2.5.8 (24px) the focused state passes. Recorded as an
   observation for the Code Reviewer, not a defect.
5. **Contrast headroom is thin.** The worst passing ratio is 4.76:1 against a 4.5 requirement. Any
   future lightening of `--sv-text-muted` on the catalog description would cross the line.
