# Feature Specification: Dynamic Survey Viewer

**Feature Branch**: `001-survey-management`
**Created**: 2026-10-07
**Last updated**: 2026-10-08
**Status**: Checklisted — no open clarifications, ready for `/speckit-plan`
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Input**: Dynamic survey app that renders multi-page surveys from JSON (survey -> pages -> questions)
with radio, checkbox, textbox, textarea, rating and satisfaction question types; validation for required
answers, min/max selections, and min/max text length; 0-3 file attachments per question with accepted
types and max size; Next/Previous navigation that keeps answers and blocks invalid pages; re-validation
of all pages before submit; a typed submission boundary with a simulated adapter (real endpoint
`/api/survey-responses`); a configuration-error screen for invalid JSON; a completion confirmation; and a
responsive, accessible UI. Default fixture: a 4-page customer-feedback survey (About You, Your
Experience, Supporting Files, Final Thoughts). Surveys are listed in `public/survey-manifest.json` and
served at `/` and `/surveys/:surveyKey`.

## Scope

In scope: rendering a survey from a validated JSON config, answering it, validating it, attaching files
to questions, navigating pages, submitting once across a typed boundary, and every error screen those
flows can reach.

Out of scope for this feature: authoring or editing surveys in the app, respondent accounts or
authentication, saving a part-finished session for later, analytics or reporting on collected answers,
server-side storage (the submission boundary is simulated by default), and more than one language.

## Clarifications

### Session 2026-10-08

Nine questions were open after `/speckit-specify`: the three clarification markers it left, and six details
the clarify task named. All nine are decided below by the Product Owner from the feature input and the
constitution. None of them changes the feature's scope — each has one reading that is clearly cheaper, more
testable, or more fail-closed than the alternatives — so none was escalated to the CEO. Every answer is
encoded into the requirement, scenario or contract section cited beside it, and no clarification marker
remains anywhere in this spec or under `contracts/`.

- **Q1: Does `POST /api/survey-responses` require an authorization credential, and what does the respondent
  see on a 401?** → **A**: No credential. Responses are anonymous — there is no respondent identity and no
  login — so the real adapter sends no `Authorization` header and depends on no session cookie. A 401 or 403
  is nonetheless mapped to the `unauthorized` failure kind so that it fails closed instead of being mistaken
  for an acknowledgement; the respondent reads "This survey is not accepting responses right now. Your
  answers are safe — try again." Introducing authentication is a separate feature.
  _Decided by: Product Owner, from the existing "surveys are anonymous" assumption. Encoded in: FR-062,
  `contracts/response-submission.md` §4, User Story 6 scenario 8._

- **Q2: Must a retry after submission-error carry an idempotency key, or is the receiver responsible for
  de-duplicating?** → **A**: The client carries the key. The payload gains a required `clientSubmissionId`,
  generated once when the session's first submission starts and re-sent unchanged by every retry of that
  session; `submittedAt` is refreshed per attempt. (The checklist stage tightened "when Submit is first
  activated" to "when the first submission starts", because a Submit that validation blocks starts none.) The real adapter also sends the same value as an
  `Idempotency-Key` request header. We cannot assume an unwritten service de-duplicates, and after a timeout
  the client cannot know whether the first attempt landed, so making de-duplication possible is the
  fail-closed choice (Principle III).
  _Decided by: Product Owner. Encoded in: FR-035, FR-061, `contracts/response-submission.md` §2 and §4,
  User Story 6 scenario 9._

- **Q3: Will the real endpoint accept attachment bytes inline as base64, or does it need multipart or a
  pre-signed upload?** → **A**: Inline base64 in the one JSON payload, as drafted. No server exists yet to
  negotiate multipart or pre-signed uploads with, and the contract already bounds the worst case at
  `maxFiles` 3 × `maxSizeBytes` 10 MB. Keeping it inline keeps the submission to exactly one operation
  across one boundary (Principle II); if a real receiver later demands multipart that is an adapter change
  below the boundary and touches no survey logic, which is what Principle II exists to buy. The client
  enforces no payload-size ceiling of its own in this feature — a receiver's own limit surfaces as the
  existing `rejected` or `server-error` kind.
  _Decided by: Product Owner. Encoded in: FR-063, `contracts/response-submission.md` §2._

- **Q4: Exactly which attachment types and what maximum file size does the default fixture accept?** →
  **A**: `q_evidence` accepts `image/png`, `image/jpeg` and `application/pdf`, at most 5242880 bytes (5 MB)
  per file, at most 3 files. These are the three types a customer-feedback respondent plausibly has to hand
  (a photo or a receipt), and 5 MB is half the contract's 10 MB ceiling, so the fixture also demonstrates
  that a question may sit below the ceiling.
  _Decided by: Product Owner. Encoded in: Assumptions, FR-052, `contracts/survey-json.md` §3 and §5, User
  Story 3._

- **Q5: What shape are the `rating` and `satisfaction` scales?** → **A**: `rating` renders as a row of
  selectable stars, one per integer in `[scale.min, scale.max]`, defaulting to 1-5; a `rating` whose
  `scale.min` is 0 renders instead as a labelled row of numeric choices, because zero stars cannot be told
  apart from no answer. `satisfaction` renders as a fixed five-point single-choice group labelled "Very
  dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied", stored as the integers 1 to 5,
  with each label present as visible text rather than an icon alone. Both offer a Clear action that returns
  the question to unanswered.
  _Decided by: Product Owner. Encoded in: FR-009, FR-010, FR-060, User Story 1 scenario 6, User Story 2
  scenario 11._

- **Q6: What happens to a partially filled page when the respondent navigates Previous and then Next
  again?** → **A**: Every answer and attachment on that page is preserved verbatim, and the page returns in
  `editing` with no error text — error text that was showing when the respondent left is discarded, and the
  page's rules are re-checked only when they next activate Next or Submit from it. A respondent should not
  be scolded about a field they have not yet revisited, and `validation-error` is a state the respondent
  enters by trying to leave a page, not by arriving at one.
  _Decided by: Product Owner. Encoded in: FR-064, User Story 2 scenario 12, Edge Cases._

- **Q7: Do attachments survive Previous navigation?** → **A**: Yes. Name, MIME type, size and bytes are all
  retained in memory for the whole session, exactly as answers are, and leaving a page by any route never
  discards one. The attachment list is rendered from the application's own state rather than from the file
  input's value, because a browser will not let a file input's value be restored.
  _Decided by: Product Owner. Encoded in: FR-031, FR-065, User Story 3 scenario 11._

- **Q8: What happens for an unknown `:surveyKey`, and for a manifest that fails to load?** → **A**: Three
  distinct outcomes. A key the manifest does not list renders the not-found screen naming the key, with a
  link to `/`. A manifest that cannot be fetched, cannot be parsed, or breaks its contract renders the
  configuration-error screen — at `/`, and also at `/surveys/:surveyKey`, where it is a configuration error
  and never not-found, because without the manifest we cannot know whether the key is unknown. A manifest
  entry that resolves but whose config file is missing or invalid is a configuration error for that survey
  while the catalog keeps working. The manifest is fetched at most once per visit and reused; a reload
  refetches it.
  _Decided by: Product Owner. Encoded in: FR-044, FR-050, FR-066, FR-067, User Story 4 scenarios 4, 5, 7 and 8._

- **Q9: Can the simulated submission adapter fail, and how is a failure presented?** → **A**: The default
  simulated adapter never fails — it always acknowledges after an artificial delay of at most 1s. A default
  that failed randomly would make gate 3 non-deterministic, which Principle IV forbids in substance. Each
  failure path is instead exercised by a failing adapter selectable only from a test, which can produce any
  `kind` in the failure table. However it arises, a failure is presented exactly as the `submission-error`
  state prescribes: the last page as the respondent left it, every answer and attachment intact and
  editable, an assertive announcement naming the failure in respondent language, and a "Try again" action.
  _Decided by: Product Owner. Encoded in: FR-036, FR-068, FR-045 `submission-error`,
  `contracts/response-submission.md` §5._

### Checklist review — Session 2026-10-08

`/speckit-checklist` (PRI-16) produced the five checklists under `checklists/` and ran them against this
spec and both contracts. Fourteen items failed. Each failure and its resolution is below; all fourteen are
fixed in this revision, so no checklist item is left failing against the text. The checkboxes in
`checklists/` stay unticked — they are the reviewer's to tick, not the author's.

| #   | Checklist item            | Defect found                                                                                                                                                                                                                                   | Resolution in this revision                                                                                                                                                      |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `validation.md` CHK004    | User Story 2 scenario 2 asserted the required-error text "Enter your name", but no requirement and no field in `contracts/survey-json.md` could produce per-question error wording. The scenario was unimplementable.                          | FR-069 defines the whole error catalogue, derived from type and configured numbers only. The scenario now expects the derived text "Enter an answer". No config field was added. |
| 2   | `validation.md` CHK007    | `maxSelections` was enforced only at the control (FR-017). Nothing made exceeding it a validation error at Next or Submit, unlike `maxLength` (FR-015), so a selection set arriving by any other route would not fail closed.                  | FR-070 enforces `maxSelections` at Next and Submit as well, with its own message. New Edge Case entry.                                                                           |
| 3   | `validation.md` CHK005    | The error catalogue was three examples in FR-019, with no text at all for `maxLength`, `maxSelections` or an out-of-range `rating` on a non-default scale, while scenarios asserted exact strings.                                             | FR-069 lists every message and how its numbers are substituted.                                                                                                                  |
| 4   | `completeness.md` CHK009  | FR-025 required a "human-readable size" and scenarios asserted "5 MB", with no rule turning 5242880 into that string.                                                                                                                          | FR-071 fixes the unit, base and rounding rule.                                                                                                                                   |
| 5   | `completeness.md` CHK010  | User Story 3 scenario 2 asserted "(allowed: PNG, JPEG, PDF)" with no rule mapping `acceptedTypes` entries to those labels, and the contract also permits extension entries such as `.pdf`.                                                     | FR-072 defines the label mapping and join order.                                                                                                                                 |
| 6   | `completeness.md` CHK006  | `contracts/survey-json.md` permits `description` on a survey and on a page, but no requirement rendered either. Two contract fields had no observable behaviour.                                                                               | FR-073 renders both.                                                                                                                                                             |
| 7   | `fail-closed.md` CHK003   | FR-045 claimed the viewer occupies "exactly one of eight states", yet the catalog (FR-047), the empty catalog (FR-048) and the not-found screen (FR-050, FR-051) are none of the eight. The state machine contradicted the route requirements. | FR-045 is scoped to the survey viewer at `/surveys/:surveyKey`; FR-074 gives the catalog its own four states and places the not-found screen outside both.                       |
| 8   | `fail-closed.md` CHK007   | A 15s deadline existed for submission (FR-038) but none for fetching the manifest or a config. A hanging fetch left the viewer in `loading` forever, which is failing open.                                                                    | FR-075 sets a 10s fetch deadline resolving to configuration-error.                                                                                                               |
| 9   | `fail-closed.md` CHK008   | The constitution deploys this as a SPA with an index fallback, so a missing config file answers 200 with HTML rather than 404. Nothing said a non-JSON body is a configuration error irrespective of status.                                   | FR-076 makes any non-JSON or non-conforming body a configuration error whatever the HTTP status.                                                                                 |
| 10  | `accessibility.md` CHK011 | WCAG 2.1 AA includes the Level A criteria. Neither 2.4.2 Page Titled nor 3.1.1 Language of Page had a requirement, so SC-009 could not hold.                                                                                                   | FR-077 specifies a document title per screen and a declared page language.                                                                                                       |
| 11  | `responsive.md` CHK004    | FR-058 named 375px as the floor, but WCAG 1.4.10 Reflow — an AA criterion the constitution binds us to — is measured at 320 CSS px.                                                                                                            | FR-058 now sets the reflow floor at 320px and keeps 375px and 1280px as the two gate widths.                                                                                     |
| 12  | `responsive.md` CHK007    | FR-058 constrained target height only, leaving the `rating` stars free to be 44px tall and 12px wide.                                                                                                                                          | FR-058 now requires 44px in both dimensions for any control whose label is an icon or a single character.                                                                        |
| 13  | `accessibility.md` CHK013 | WCAG 1.3.5 Identify Input Purpose is AA and applies to the fixture's name question, but the JSON contract has no way to declare an input purpose, so the obligation was silently unmet.                                                        | Recorded as a documented limitation with a removal plan under Assumptions, as Governance requires, rather than left implied.                                                     |
| 14  | `completeness.md` CHK014  | Principle I's central claim — a new survey costs one config file plus one manifest entry — had no measurable success criterion. FR-004 asserted it; nothing measured it.                                                                       | SC-013 measures it as a diff over `src/app/**`.                                                                                                                                  |

Two further items were resolved as wording, not defects: User Story 1 scenario 3 said "within 15s" while
the default adapter answers within 1s (FR-036), which made the scenario pass for a 14s regression — it now
asserts 2s, and FR-038's 15s deadline is unchanged. And FR-061 said the `clientSubmissionId` is generated
"when Submit is first activated", which is ambiguous for a Submit that validation blocks; it is now
generated when the first submission actually starts.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Complete a survey end to end (Priority: P1)

A respondent opens a survey from the catalog, answers every question across its pages, and submits it
once, receiving a confirmation they can trust.

**Why this priority**: this is the product. Without it nothing else has value.

**Independent Test**: load the default `customer-feedback` fixture, answer all four pages with valid
input, submit, and assert the confirmation screen appears with a submission reference.

**Acceptance Scenarios**:

1. **Given** the manifest lists `customer-feedback` and its config passes validation, **When** the
   respondent opens `/surveys/customer-feedback`, **Then** page 1 ("About You") renders with the
   indicator "Page 1 of 4", a disabled Previous control, and an enabled Next control.
2. **Given** the respondent is on page 1 with name `Dana` and segment `returning-customer`, **When**
   they activate Next, **Then** page 2 ("Your Experience") renders, the indicator reads "Page 2 of 4",
   and focus moves to the page-2 heading.
3. **Given** the respondent is on page 4 (the last page) with every required answer valid, **When** they
   activate Submit, **Then** the Submit control reports a busy state, all inputs become non-editable,
   and within 2s the confirmation screen replaces the survey (the default simulated adapter answers
   within 1s per FR-036; the 15s deadline in FR-038 bounds a real adapter, not this scenario).
4. **Given** the submission boundary returned `{ submissionId: "sub_0001" }`, **When** the confirmation
   screen renders, **Then** it shows the survey title "Customer Feedback", the text that the response
   was received, the reference `sub_0001`, and a link to `/`, and it shows no question controls.
5. **Given** the confirmation screen is showing, **When** the respondent activates the link to `/` and
   reopens the same survey, **Then** the survey starts at page 1 with every answer empty.
6. **Given** optional `rating` `q_delivery` (`scale: { min: 1, max: 5 }`) renders as 5 stars and the
   respondent has selected 4, **When** they activate its Clear action, **Then** no star is selected,
   `q_delivery` is unanswered, Next is still accepted, and the submission payload omits `q_delivery`.
7. **Given** the `customer-feedback` config carries `description: "Four short pages about your recent
order."` and page 1 carries `description: "Who we are hearing from."`, **When** page 1 renders,
   **Then** both strings are visible text, the survey description above the page title and the page
   description below it, and **When** the respondent advances to page 2, which has no `description`,
   **Then** no empty description element is present for that page.
8. **Given** the respondent opens `/surveys/customer-feedback`, **When** the survey page renders, **Then**
   the document title is "Customer Feedback — Survey" and the document declares `lang="en"`; and **When**
   they open `/` instead, **Then** the document title is "Surveys".

---

### User Story 2 - Blocked from advancing with invalid answers (Priority: P1)

A respondent who leaves a required or malformed answer cannot carry the problem forward; the first
offending field is focused, the reason is announced, and nothing already typed is lost.

**Why this priority**: Principle III. A respondent who reaches page 4 before learning page 1 was
incomplete has lost their work.

**Independent Test**: on each question type, supply an invalid value, activate Next, and assert the page
does not change, the specific error text appears, and focus sits on the first offending control.

**Acceptance Scenarios**:

1. **Given** page 1's required radio `q_segment` has no selection, **When** the respondent activates
   Next, **Then** the page does not change, the text "Choose one option" appears for `q_segment`, the
   error is announced through an assertive live region, and focus moves to the first radio of
   `q_segment`.
2. **Given** required textbox `q_name` has `minLength: 2` and the value is `"  "` (two spaces), **When**
   the respondent activates Next, **Then** the page does not change and the error reads "Enter an answer"
   (the trimmed value is empty, so the required rule reports, not the length rule), and the error is
   associated with `q_name`, whose title supplies the context rather than the message text (FR-069).
3. **Given** required textbox `q_name` has `minLength: 2` and the value is `"D"`, **When** the respondent
   activates Next, **Then** the page does not change and the error reads "Use at least 2 characters".
4. **Given** checkbox `q_liked` has `minSelections: 1, maxSelections: 3` and exactly 0 options are
   selected, **When** the respondent activates Next, **Then** the error reads "Select at least 1 option"
   and focus moves to the first checkbox of `q_liked`.
5. **Given** checkbox `q_liked` has `maxSelections: 3` and 3 options are selected, **When** the
   respondent inspects the remaining options, **Then** the unselected options are non-selectable and the
   hint reads "Select up to 3 options"; de-selecting one makes them selectable again.
6. **Given** required satisfaction `q_satisfaction` (scale 1-5) has no value, **When** the respondent
   activates Next, **Then** the error reads "Choose a value between 1 and 5" and focus moves to the
   control.
7. **Given** page 2 has errors on `q_satisfaction` and `q_liked`, **When** the respondent activates Next,
   **Then** both errors render under their own questions, the page-level summary lists both in page
   order, and focus moves to `q_satisfaction` (the first in page order).
8. **Given** `q_liked` shows an error, **When** the respondent selects one option, **Then** that
   question's error text is removed immediately without activating Next.
9. **Given** the respondent is on page 3 with answers typed on pages 1 and 2, **When** they activate
   Previous twice and then Next twice, **Then** every answer on pages 1, 2 and 3 is exactly as it was,
   including attached file names.
10. **Given** page 2 is invalid, **When** the respondent activates Previous, **Then** page 1 renders;
    Previous is never blocked by validation.
11. **Given** required `satisfaction` `q_satisfaction` renders as a five-point group whose visible labels
    read "Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied", **When** the
    respondent selects "Satisfied", **Then** the stored answer is the integer `4` and the group exposes
    exactly five choices with no sixth or zero value offered.
12. **Given** page 2 is showing error text for `q_satisfaction` after a blocked Next, **When** the
    respondent activates Previous and then Next again, **Then** page 2 renders with its typed answers
    unchanged and with no error text and no `aria-invalid` on any control, and **When** they then activate
    Next with `q_satisfaction` still empty, **Then** the error text returns.
13. **Given** `q_liked` has `maxSelections: 3` and its answer has been set to 4 option values by a route
    that bypasses the control — a restored session, a programmatic change, or a config whose
    `maxSelections` was lowered — **When** the respondent activates Next or Submit, **Then** the page does
    not change, no submission starts, and the error reads "Select no more than 3 options". Exceeding
    `maxSelections` is a validation error, not only a control constraint (FR-070).
14. **Given** required textbox `q_name` has `maxLength: 80` and a value of 81 trimmed characters,
    **When** the respondent activates Next, **Then** the error reads "Use at most 80 characters"
    (FR-069), confirming the rule is checked and not only refused at the control.

---

### User Story 3 - Attach supporting files to a question (Priority: P2)

A respondent can attach up to three files to a question that allows them, and is told immediately and by
name when a file is the wrong type, too large, a duplicate, or one too many.

**Why this priority**: attachments are the highest-risk input path. Rejecting bad files at selection time
is what keeps the submit step honest.

**Independent Test**: on `q_evidence` (`maxFiles: 3`, `acceptedTypes: ["image/png", "image/jpeg",
"application/pdf"]`, `maxSizeBytes: 5242880`), select valid, oversized, wrong-type, duplicate and
over-count files and assert each outcome.

**Acceptance Scenarios**:

1. **Given** `q_evidence` has no attachments yet, **When** the respondent selects `receipt.pdf`
   (`application/pdf`, 1 MB), **Then** it is listed with its name and size, the counter reads "1 of 3
   files", and no error shows.
2. **Given** `q_evidence` has 0 attachments, **When** the respondent selects `notes.txt` (`text/plain`,
   2 KB), **Then** no file is attached and the error reads "notes.txt: this file type is not accepted
   (allowed: PNG, JPEG, PDF)".
3. **Given** `maxSizeBytes` is 5242880, **When** the respondent selects `scan.png` (`image/png`,
   6291456 bytes), **Then** no file is attached and the error reads "scan.png: this file is larger than
   the 5 MB limit".
4. **Given** the respondent selects three files at once — `a.png` (valid), `b.txt` (wrong type),
   `c.png` (8 MB) — **When** the selection is processed, **Then** `a.png` is attached, `b.txt` and
   `c.png` are not, and one error per rejected file names the file and the reason.
5. **Given** `q_evidence` already holds 2 files, **When** the respondent selects 2 more valid files,
   **Then** the first (in selection order) is attached, the second is rejected with "You can attach up
   to 3 files to this question", and the counter reads "3 of 3 files".
6. **Given** `q_evidence` holds `a.png` (120000 bytes), **When** the respondent selects a file with the
   same name and the same size, **Then** it is rejected with "a.png is already attached".
7. **Given** `q_evidence` holds a 0-byte file selection, **When** the selection is processed, **Then**
   it is rejected with "empty.png: this file is empty".
8. **Given** `q_evidence` holds 3 files, **When** the respondent removes one, **Then** the counter reads
   "2 of 3 files", the file control accepts a new selection, and the removal is announced.
9. **Given** `q_evidence` is optional and holds 0 files, **When** the respondent activates Next, **Then**
   page 3 validates and page 4 renders; attachments are never required.
10. **Given** a question whose config has `maxFiles: 0` or no `attachments` block, **When** the page
    renders, **Then** no file control is shown for that question.
11. **Given** `q_evidence` holds `receipt.pdf` (1048576 bytes) and `photo.png` (240000 bytes), **When** the
    respondent activates Previous to page 2 and then Next back to page 3, **Then** both files are still
    listed with the same names and sizes, the counter still reads "2 of 3 files", each still has a Remove
    control, and the submission payload for `q_evidence` still carries both files' bytes.

---

### User Story 4 - Find a survey from the catalog (Priority: P1)

A visitor sees which surveys exist and opens one. An unknown key is a dead end with a way back, never a
blank screen.

**Why this priority**: the manifest is the only way a new survey reaches a respondent without a code
change (Principle I).

**Independent Test**: serve a manifest with two entries, assert both render and link correctly, then
request an absent key and assert the not-found screen.

**Acceptance Scenarios**:

1. **Given** `public/survey-manifest.json` lists `customer-feedback` ("Customer Feedback") and
   `product-pulse` ("Product Pulse"), **When** a visitor opens `/`, **Then** both titles render as
   links to `/surveys/customer-feedback` and `/surveys/product-pulse`, in manifest order.
2. **Given** the catalog is showing, **When** the visitor activates "Customer Feedback", **Then** the URL
   becomes `/surveys/customer-feedback` and page 1 of that survey renders.
3. **Given** the manifest has no entries, **When** a visitor opens `/`, **Then** the catalog renders the
   message that no surveys are available, and no error state.
4. **Given** the manifest cannot be fetched or is not valid against its contract, **When** a visitor
   opens `/`, **Then** the configuration-error screen renders with the reason, and no survey list.
5. **Given** `nope` is not a key in the manifest, **When** a visitor opens `/surveys/nope`, **Then** the
   not-found screen renders with the text that the survey `nope` does not exist and a link to `/`, and
   the configuration-error screen does **not** render.
6. **Given** a path matching no route (for example `/about`), **When** a visitor opens it, **Then** the
   not-found screen renders with a link to `/`.
7. **Given** the manifest cannot be fetched, **When** a visitor opens `/surveys/customer-feedback`
   directly, **Then** the configuration-error screen renders stating that the survey catalog could not be
   loaded, and the not-found screen does **not** render — an unresolvable key is never reported as unknown.
8. **Given** a visitor has already loaded `/` in this visit, **When** they open two surveys in turn,
   **Then** the manifest is fetched once for the visit and reused, and a page reload fetches it again.
9. **Given** the manifest request has not answered after 10s, **When** the deadline passes, **Then** the
   catalog leaves `loading` for the configuration-error screen stating that the survey catalog could not
   be loaded, and it never stays in `loading` indefinitely (FR-075).
10. **Given** the manifest request is still in flight, **When** `/` renders, **Then** the catalog is in
    `loading` with a busy indication announced politely, and no survey list, no "no surveys available"
    text and no error text are present.
11. **Given** a deployment whose index fallback answers a request for `survey-manifest.json` with HTTP 200
    and an HTML body, **When** a visitor opens `/`, **Then** the configuration-error screen renders,
    because a body that is not the contracted JSON is a configuration error whatever the status code
    (FR-076).

---

### User Story 5 - An invalid survey config fails closed (Priority: P1)

An invalid survey config renders an actionable error and none of the survey — never a partial or
repaired form.

**Why this priority**: Principle I. A partially rendered survey collects answers we cannot interpret.

**Independent Test**: for each failure class in the survey JSON contract, load the fixture and assert
exactly one configuration-error screen, no question controls in the DOM, and the reason naming the
offending path.

**Acceptance Scenarios**:

1. **Given** a config whose body is not parseable JSON, **When** `/surveys/broken-syntax` is opened,
   **Then** the configuration-error screen renders, states that the survey configuration could not be
   read, and renders no page title, question or navigation control.
2. **Given** a config with a question of `"type": "slider"`, **When** the survey is opened, **Then** the
   configuration-error screen names the offending location and value, for example
   `pages[1].questions[0].type: unknown question type "slider"`.
3. **Given** a config with an unknown field `pages[0].questions[0].placeholder`, **When** the survey is
   opened, **Then** validation fails and the configuration-error screen names that field; unknown fields
   are failures, not warnings.
4. **Given** a config with two pages both having `"id": "p1"`, **When** the survey is opened, **Then**
   validation fails naming the duplicated page id.
5. **Given** a checkbox question with `minSelections: 3` and only 2 options, **When** the survey is
   opened, **Then** validation fails naming the question and the unsatisfiable rule.
6. **Given** any configuration-error screen, **When** it renders, **Then** it offers a link to `/` and
   the respondent can reach the catalog without reloading.
7. **Given** a manifest entry whose `config` path is answered by the deployment's index fallback with HTTP
   200 and an HTML body, **When** that survey is opened, **Then** the configuration-error screen renders
   with the F17 reason and no question control, rather than the viewer treating a 200 as a usable config
   (FR-076).
8. **Given** a config request that has not answered after 10s, **When** the deadline passes, **Then** the
   viewer leaves `loading` for the configuration-error screen, and no question control has rendered at any
   point (FR-075, FR-042).

---

### User Story 6 - A failed submission does not lose answers (Priority: P2)

When submission fails, the respondent keeps every answer and attachment and can try again. No
confirmation is ever shown for a submission that was not acknowledged.

**Why this priority**: Principle III. A success screen we cannot take back is worse than an error.

**Independent Test**: force the submission boundary to reject, assert the submission-error state, assert
all answers and attachments survive, then force success on retry and assert the confirmation.

**Acceptance Scenarios**:

1. **Given** all pages are valid and the submission boundary rejects with a transport failure, **When**
   the respondent activates Submit, **Then** the submission-error state renders an assertive error
   describing the failure and a "Try again" action, page 4 stays visible, and every answer on every page
   is unchanged.
2. **Given** the submission boundary does not respond within 15s, **When** the deadline passes, **Then**
   the submission-error state renders with a message that the submission timed out, and no confirmation
   is shown.
3. **Given** the submission-error state, **When** the respondent activates "Try again" and the boundary
   acknowledges, **Then** the confirmation screen renders with the returned reference.
4. **Given** the submission-error state, **When** the respondent navigates to page 2, edits an answer and
   returns to page 4, **Then** Submit is available again and the stale error is cleared.
5. **Given** the submitting state, **When** the respondent activates Submit a second time, **Then** no
   second submission is started.
6. **Given** the respondent is on page 4 and pages 1 and 3 contain errors, **When** they activate Submit,
   **Then** no submission is started, page 1 renders (the earliest invalid page), focus moves to its
   first invalid control, and the summary states that there are answers to fix on more than one page.
7. **Given** an attachment that passed at selection time but no longer satisfies its question's rules at
   submit time, **When** the respondent activates Submit, **Then** no submission is started, the
   question's page renders in validation-error with that attachment named, and the file is listed as
   rejected.
8. **Given** the real adapter is selected and the receiver answers HTTP 401, **When** the respondent
   activates Submit, **Then** the submission-error state renders the text "This survey is not accepting
   responses right now. Your answers are safe — try again.", the confirmation screen does not render, and
   no credential prompt or login screen is shown.
9. **Given** the first Submit attempt carried `clientSubmissionId: "csid_a"` and timed out, **When** the
   respondent activates "Try again", **Then** the second attempt carries the same `clientSubmissionId`
   `"csid_a"` with a later `submittedAt`, and **When** the respondent instead returns to `/` and opens the
   survey again, **Then** the next first Submit carries a different `clientSubmissionId`.

---

### Edge Cases

Each case below is a decision, not an open question.

- **Browser closed or reloaded mid-survey**: answers are held in memory only. A reload starts a fresh
  session on page 1 with empty answers. Nothing is written to browser storage, so no partly finished
  response can leak between visitors on a shared device.
- **Deep link to a page**: page position is not part of the URL. Opening a survey always starts on page 1.
- **Mixed valid and invalid file selection**: valid files are attached, invalid ones are rejected
  individually, one named error each. A bad file never discards a good one.
- **More files selected than slots remain**: files are taken in selection order until `maxFiles` is
  reached; each remaining file is rejected with the count error.
- **Submission times out**: 15s with no acknowledgement is a failure. The app enters submission-error and
  never the confirmation screen.
- **Duplicate Submit activation**: ignored while the submitting state is active.
- **A page with zero questions**: a valid config may contain one; it renders its title and navigation and
  always validates.
- **A survey with a single page**: Previous is disabled and the primary control on that page is Submit.
- **An optional question left empty**: passes validation. `minLength`, `minSelections` and range rules
  apply only to a question that has a value.
- **An optional question answered badly**: still validated. An optional textarea over `maxLength` blocks
  navigation exactly as a required one would.
- **Manifest entry pointing at a missing config file**: treated as a configuration error for that
  survey, not as an unknown key; the catalog itself keeps working.
- **Unknown survey key vs invalid config**: two distinct screens. An absent key is "not found"; a present
  but broken config is "configuration error".
- **A survey URL opened while the manifest itself is unavailable**: configuration error, never not-found.
  Without the manifest the key cannot be resolved either way, so the viewer fails closed.
- **Returning to a page that was showing errors**: the page comes back in `editing` with answers intact and
  no error text. Its rules are re-checked when the respondent next leaves it forward or submits.
- **A `rating` configured with `scale.min: 0`**: valid config, but it renders as a labelled numeric row
  rather than stars, because zero stars and no answer look identical.
- **Clearing an answered required `rating` or `satisfaction`**: allowed. The question becomes unanswered and
  reports its required rule at the next Next or Submit, exactly as an untouched one would.
- **Network loss while filling the survey**: not detected or surfaced while editing. It surfaces as a
  submission-error at Submit, with answers preserved.
- **Text longer than `maxLength` pasted in**: the input accepts no more than `maxLength` characters, and
  the rule is also checked at Next and at Submit, so a value arriving by any other route still fails
  closed.
- **More selections held than `maxSelections` allows**: the control cannot produce this, but validation
  still rejects it at Next and at Submit, for the same reason `maxLength` is checked twice. Treating a
  control constraint as the only enforcement would fail open (FR-070).
- **A manifest or config fetch that never answers**: abandoned after 10s and treated as a configuration
  error. Waiting in `loading` forever is failing open, so the deadline is part of failing closed (FR-075).
- **A config or manifest answered with HTTP 200 and a non-JSON body**: a configuration error. The
  deployment's SPA index fallback answers a missing `.json` file with the index page rather than a 404, so
  the status code is not evidence that a config exists (FR-076).
- **A survey or page with no `description`**: the field is optional; nothing is rendered in its place and
  no empty element remains (FR-073).

## Requirements _(mandatory)_

### Functional Requirements

#### Survey object model

- **FR-001**: A survey config MUST describe one survey as an ordered list of pages, each page an ordered
  list of questions. Page order is array order; question order within a page is array order.
- **FR-002**: Page and question ids MUST be unique within a survey; a duplicate id is a configuration
  error (FR-040).
- **FR-003**: The viewer MUST support exactly six question types: `radio`, `checkbox`, `textbox`,
  `textarea`, `rating`, `satisfaction`. Any other value of `type` is a configuration error.
- **FR-004**: Adding, changing or removing a survey MUST require only a config file plus one manifest
  entry, with no change under `src/app/**`.
- **FR-005**: Each question MUST render its title, its optional description, and a visible indication of
  whether an answer is required.
- **FR-006**: `radio` MUST present single-choice options from `options` (minimum 2) and hold at most one
  selected option value.
- **FR-007**: `checkbox` MUST present multi-choice options from `options` (minimum 2) and hold a set of
  selected option values.
- **FR-008**: `textbox` MUST accept one line of free text; `textarea` MUST accept multi-line free text.
  Neither takes `options`.
- **FR-009**: `rating` MUST present an integer scale from `scale.min` to `scale.max` (defaults 1 and 5) and
  hold one integer in that inclusive range. It MUST render as one selectable star per integer in the range
  when `scale.min` is 1 or greater, and as a labelled row of numeric choices when `scale.min` is 0, because
  zero stars is indistinguishable from no answer.
- **FR-010**: `satisfaction` MUST present a fixed five-point labelled scale stored as the integers 1 to 5,
  whose visible labels are exactly "Very dissatisfied" (1), "Dissatisfied" (2), "Neutral" (3), "Satisfied"
  (4) and "Very satisfied" (5). Each label MUST be present as text, not conveyed by an icon or a colour
  alone. The scale is not configurable and the control MUST offer no sixth point and no zero.
- **FR-060**: `rating` and `satisfaction` MUST each offer a Clear action that returns the question to
  unanswered, whether or not the question is required. A cleared required question reports its required rule
  at the next Next or Submit, exactly as an untouched one would.

#### Validation

- **FR-011**: Every answer on the current page MUST be validated before the respondent leaves that page
  forward, and every answer on every page MUST be validated again before a submission starts.
- **FR-012**: A required `radio`, `rating` or `satisfaction` question is answered only when a value is
  selected; a required `checkbox` only when at least one option is selected; a required `textbox` or
  `textarea` only when the value has at least one character after trimming leading and trailing
  whitespace.
- **FR-013**: Text answers MUST be trimmed before every length comparison, and length MUST be counted in
  Unicode code points, so that a whitespace-only answer is empty and an emoji counts as one character.
- **FR-014**: `minLength` MUST be enforced only on a non-empty text answer; a required empty answer
  reports the required rule instead, so a respondent never sees two errors for one omission.
- **FR-015**: `maxLength` MUST be enforced both by refusing further input at the control and by
  validation at Next and Submit.
- **FR-016**: For `checkbox`, the effective minimum is the greater of `minSelections` and 1 if the
  question is required, otherwise `minSelections`. Fewer selections than the effective minimum is a
  validation error.
- **FR-017**: For `checkbox`, when the selected count equals `maxSelections`, unselected options MUST
  become non-selectable, with a visible hint stating the limit; de-selecting MUST restore them.
- **FR-018**: For `rating` and `satisfaction`, a value outside the inclusive configured range is a
  validation error, and the control MUST offer no out-of-range value.
- **FR-019**: Each validation error MUST be rendered with the question it belongs to, in plain language
  that names the rule and its number — "Use at least 2 characters", "Select at least 1 option", "Choose
  a value between 1 and 5". The complete catalogue and its substitution rules are FR-069; no message
  outside that catalogue MUST be shown for a validation failure.
- **FR-020**: Changing an answer MUST clear that question's error immediately, without re-running
  navigation.
- **FR-069**: Validation error text MUST be derived from the question's type and its configured numbers
  alone. A survey config MUST NOT be able to supply error wording, so that every message is predictable
  from the contract and no config can leave a rule unexplained. The catalogue is exactly:

  | Rule broken                          | Message                              | Substitution                     |
  | ------------------------------------ | ------------------------------------ | -------------------------------- |
  | Required `radio` unanswered          | `Choose one option`                  | —                                |
  | Required `checkbox` unanswered       | `Select at least N option(s)`        | `N` = effective minimum (FR-016) |
  | Required `textbox`/`textarea` empty  | `Enter an answer`                    | —                                |
  | Required `rating`/`satisfaction`     | `Choose a value between MIN and MAX` | the question's inclusive range   |
  | `minLength` on a non-empty answer    | `Use at least N characters`          | `N` = `minLength`                |
  | `maxLength` exceeded                 | `Use at most N characters`           | `N` = `maxLength`                |
  | Below `minSelections`                | `Select at least N option(s)`        | `N` = effective minimum          |
  | Above `maxSelections`                | `Select no more than N options`      | `N` = `maxSelections`            |
  | `rating`/`satisfaction` out of range | `Choose a value between MIN and MAX` | the question's inclusive range   |
  | Attachment invalid at submit         | `FILENAME: REASON`                   | the FR-023 reason for that file  |

  `option(s)` MUST be singular when `N` is 1 and plural otherwise. The question each message belongs to is
  conveyed by its association with that question (FR-054), never by naming the question inside the
  message, so one wording serves every survey.

- **FR-070**: Exceeding `maxSelections` MUST be a validation error at Next and at Submit, not only a
  constraint at the control. FR-017 prevents the respondent from reaching that state; FR-070 is what makes
  an answer arriving by any other route fail closed, exactly as FR-015 does for `maxLength`.
- **FR-071**: A file size MUST be shown to the respondent in binary units with at most one decimal place:
  below 1024 bytes as `N bytes`, below 1048576 bytes as kilobytes, otherwise as megabytes, with a trailing
  `.0` omitted. So 5242880 renders `5 MB`, 1048576 renders `1 MB`, 240000 renders `234.4 KB`, and 800
  renders `800 bytes`. The same rule MUST produce the size named in a size-rejection message.
- **FR-072**: An accepted-type list MUST be shown to the respondent as display labels, not as raw contract
  values: a MIME type as its uppercased subtype (`image/png` → `PNG`, `application/pdf` → `PDF`), an
  extension entry as its uppercased extension without the dot (`.pdf` → `PDF`), joined with `, ` in the
  order the config lists them, with duplicate labels collapsed. So
  `["image/png", "image/jpeg", "application/pdf"]` renders `PNG, JPEG, PDF`.
- **FR-073**: A survey's optional `description` MUST render as visible text above the current page title,
  and a page's optional `description` MUST render as visible text below its page title. When either is
  absent, nothing MUST be rendered in its place.

#### Attachments

- **FR-021**: A question MAY accept 0 to 3 file attachments. `maxFiles: 0` or an absent `attachments`
  block means no file control renders for that question.
- **FR-022**: Attachments MUST never be required. A question with attachments enabled and zero files
  attached always passes the attachment rules.
- **FR-023**: At selection time each file MUST be checked, in this order, for accepted type, size within
  `maxSizeBytes`, non-zero size, not already attached (same name and size), and a free slot within
  `maxFiles`. The first failing check determines the message.
- **FR-024**: A rejected file MUST NOT be attached, MUST produce an error naming the file and the reason,
  and MUST NOT affect the other files in the same selection.
- **FR-025**: Accepted files MUST be listed per question with file name, human-readable size, and a
  Remove control, alongside a counter of the form "2 of 3 files".
- **FR-026**: Removing an attachment MUST free its slot immediately and be announced to assistive
  technology.
- **FR-027**: Every attached file MUST be re-checked against type, size and count immediately before a
  submission starts. A failure MUST block the submission and surface as a validation error on that
  question's page.
- **FR-028**: Accepted types MUST come from the question's `acceptedTypes` list; the viewer MUST NOT
  accept a type merely because the operating system offered it.
- **FR-065**: An accepted attachment's name, MIME type, size and bytes MUST survive navigation in both
  directions for the whole session, and MUST be removable only by its own Remove control. The attachment
  list MUST be rendered from the application's own state and MUST NOT depend on the file input's value,
  which a browser will not let the application restore.

#### Navigation

- **FR-029**: Next MUST validate only the current page. If the page is valid the next page renders and
  focus moves to that page's heading; if it is invalid the page does not change.
- **FR-030**: When Next is blocked, the first invalid question in page order MUST receive focus and its
  error MUST be announced through an assertive live region, with a page-level summary listing every
  invalid question in page order.
- **FR-031**: Previous MUST never be blocked by validation and MUST never discard an answer or an
  attachment. Previous MUST be unavailable on the first page.
- **FR-032**: The current position MUST be shown as "Page N of M".
- **FR-033**: The last page MUST offer Submit in place of Next; no other page MUST offer Submit.
- **FR-034**: Submit MUST validate all pages in order. If any page is invalid, no submission starts, the
  earliest invalid page renders, its first invalid question receives focus, and the summary says that
  answers on more than one page need fixing when that is the case.
- **FR-064**: A page the respondent returns to MUST render in `editing`: every answer and attachment intact,
  and no error text, `aria-invalid` or page summary carried over from an earlier blocked Next. A page's
  rules MUST be re-checked only when the respondent next leaves it forward or activates Submit.

#### Submission

- **FR-035**: A submission MUST cross exactly one typed boundary, carrying the survey key, a
  `clientSubmissionId`, one answer per answered question, each question's attachments, and a client
  timestamp, as defined in `contracts/response-submission.md`.
- **FR-036**: The default submission adapter MUST be simulated: it performs no network request,
  acknowledges after an artificial delay of at most 1s, and returns a generated submission reference. The
  real transport MUST target `POST /api/survey-responses` with the same payload and no authorization
  credential, selectable without changing survey logic.
- **FR-037**: Only an explicit acknowledgement from the boundary MUST produce the submitted state. An
  absent, malformed or failing response MUST produce submission-error.
- **FR-038**: A submission MUST be abandoned as failed after 15s without acknowledgement.
- **FR-039**: While a submission is in flight, further Submit activations MUST be ignored, and no answer
  or attachment MUST be editable.
- **FR-061**: Every submission MUST carry a `clientSubmissionId` generated once when the session's first
  submission starts — that is, on the first entry to `submitting`, not on a Submit that validation blocks,
  so a respondent who is bounced by FR-034 and then succeeds still produces exactly one value. Every retry
  within that session MUST re-send the same value with a refreshed
  `submittedAt`, and the real adapter MUST also send that value as an `Idempotency-Key` request header, so
  that a receiver can recognise a retry of a submission that may already have landed. Opening a survey
  afresh MUST produce a new value.
- **FR-062**: The real transport MUST send no authorization credential, because responses are anonymous. An
  HTTP 401 or 403 MUST nonetheless be treated as the `unauthorized` failure and never as an
  acknowledgement, MUST render the submission-error text "This survey is not accepting responses right now.
  Your answers are safe — try again.", and MUST NOT present a credential prompt or a login screen.
- **FR-063**: Attachment bytes MUST cross the boundary inline in the one JSON payload, base64 encoded, per
  `contracts/response-submission.md` §2. The viewer MUST NOT enforce a total payload-size limit of its own;
  a receiver's limit surfaces as the `rejected` or `server-error` failure.
- **FR-068**: The default simulated adapter MUST always acknowledge and MUST NOT fail, so that the quality
  gates stay deterministic. Each failure path MUST instead be reachable through a failing adapter
  selectable only from a test, and MUST present exactly as the `submission-error` state in FR-045.

#### Configuration errors

- **FR-040**: A survey config that fails validation MUST render the configuration-error screen and none
  of the survey: no page title, no question, no navigation control, no Submit.
- **FR-041**: The configuration-error screen MUST state what is wrong in terms an author can act on,
  naming the location in the config (for example `pages[1].questions[0].type`) and the offending value.
- **FR-042**: Validation MUST complete before any part of the survey renders; the respondent MUST never
  see a question that later disappears because the config was rejected.
- **FR-043**: The configuration-error screen MUST offer a link to the catalog at `/`.
- **FR-044**: A manifest that cannot be fetched or does not satisfy its contract MUST render the
  configuration-error screen at `/` and MUST NOT render a partial survey list.
- **FR-075**: A manifest or survey-config request that has not answered within 10s MUST be abandoned and
  MUST render the configuration-error screen. Neither the catalog nor the viewer MUST remain in `loading`
  without a deadline, because an indefinite wait is failing open: the respondent is shown neither the
  survey nor the reason they cannot have it.
- **FR-076**: A manifest or config response MUST be accepted only on the strength of its body. A body that
  is not parseable JSON, or that is parseable but does not satisfy its contract, MUST render the
  configuration-error screen whatever the HTTP status, including HTTP 200. The deployment serves a SPA with
  an index fallback, so a request for a missing `.json` file is answered with HTTP 200 and an HTML
  document; a 200 is therefore not evidence that the configuration exists.

#### Response states

- **FR-045**: The **survey viewer** at `/surveys/:surveyKey` MUST occupy exactly one of eight states —
  `loading`, `ready`, `editing`, `validation-error`, `submitting`, `submitted`, `submission-error`,
  `configuration-error`. These eight describe the viewer only. The catalog at `/` has its own states
  (FR-074), and the not-found screen (FR-050, FR-051) belongs to neither machine: it is what renders when
  no survey viewer is entered at all. What the respondent sees in each of the eight MUST be:
  - `loading`: a busy indication and the text that the survey is loading, announced politely. No
    question, no navigation control, no error.
  - `ready`: survey title, current page title, "Page N of M", every question of that page with empty or
    previously entered values, Previous (disabled on page 1) and Next or Submit. No error text anywhere.
  - `editing`: as `ready`, with the respondent's entered values retained, including values on pages not
    currently shown. Changing a value stays in this state.
  - `validation-error`: as `editing`, plus error text under each invalid question, `aria-invalid` on each
    invalid control, a page-level summary in an assertive live region, and focus on the first invalid
    control. Forward navigation and Submit are refused; Previous still works.
  - `submitting`: as `editing` with every input and navigation control non-editable, the Submit control
    in a busy state, and "Submitting your answers" announced politely. All answers are retained.
  - `submitted`: the confirmation screen alone — survey title, confirmation message, submission
    reference, link to `/`. No question control is present, and the session's answers are discarded.
  - `submission-error`: the last page as the respondent left it, with every answer and attachment intact,
    plus an assertive error stating the reason and a "Try again" action. Previous and Next still work.
  - `configuration-error`: the error screen alone, per FR-040 to FR-043.
- **FR-046**: Only the transitions `loading -> ready | configuration-error`,
  `ready -> editing | validation-error`, `editing -> validation-error | submitting`,
  `validation-error -> editing`, `submitting -> submitted | submission-error`,
  `submission-error -> editing | submitting` MUST be possible. In particular nothing MUST leave
  `submitted`, and nothing MUST reach `submitted` except from `submitting`.
- **FR-074**: The catalog at `/` MUST occupy exactly one of four states — `loading`, `ready`, `empty`,
  `configuration-error` — and what the visitor sees in each MUST be:
  - `loading`: a busy indication announced politely, with no survey list, no empty-catalog text and no
    error text.
  - `ready`: the list required by FR-047, and no error text.
  - `empty`: the plain statement required by FR-048, and no error text.
  - `configuration-error`: the error screen alone, per FR-044.

  Only the transitions `loading -> ready | empty | configuration-error` MUST be possible; the catalog MUST
  NOT return to `loading` without a fresh visit (FR-067).

#### Routes and catalog

- **FR-047**: `/` MUST render a catalog built from `public/survey-manifest.json`, listing each entry's
  title and optional description in manifest order, each linking to `/surveys/<key>`.
- **FR-048**: An empty manifest MUST render a plain statement that no surveys are available — not an
  error state.
- **FR-049**: `/surveys/:surveyKey` MUST load the config named by that manifest entry, validate it, and
  render the survey.
- **FR-050**: A `surveyKey` absent from the manifest MUST render the not-found screen, naming the key and
  linking to `/`. This MUST be distinguishable from a configuration error.
- **FR-051**: Any unmatched path MUST render the not-found screen with a link to `/`.
- **FR-052**: The default fixture MUST be a four-page customer-feedback survey with the pages "About
  You", "Your Experience", "Supporting Files" and "Final Thoughts", exercising all six question types,
  required and optional questions, min/max selections, min/max length, and a question with attachments
  enabled whose policy is `maxFiles: 3`, `acceptedTypes: ["image/png", "image/jpeg", "application/pdf"]`
  and `maxSizeBytes: 5242880`.
- **FR-066**: When the manifest cannot be fetched, cannot be parsed, or breaks its contract, a request to
  `/surveys/:surveyKey` MUST render the configuration-error screen and MUST NOT render the not-found screen.
  An unresolvable key is never reported as an unknown key.
- **FR-067**: The manifest MUST be fetched at most once per visit and reused for the catalog and for every
  survey opened in that visit. A page reload MUST fetch it again.

#### Accessibility and responsiveness

- **FR-053**: Every control MUST have a programmatic label naming its question; grouped controls (radio,
  checkbox, rating, satisfaction) MUST be exposed as a labelled group.
- **FR-054**: An invalid control MUST carry `aria-invalid` and reference its error text through
  `aria-describedby`, so the error is read with the control.
- **FR-055**: Validation and submission failures MUST be announced through an assertive live region;
  loading, submitting, attachment added or removed, and submitted MUST be announced politely.
- **FR-056**: Every flow MUST be completable with the keyboard alone, with a focus indicator visible
  against its background at every step, and no keyboard trap.
- **FR-057**: Text and meaningful non-text contrast MUST meet WCAG 2.1 AA (4.5:1 text, 3:1 UI), and no
  state MUST be conveyed by colour alone — an invalid field carries text as well as colour.
- **FR-058**: At viewport widths of 375px and 1280px — the two widths the smoke-test gate uses — every
  flow MUST work with no horizontal scrolling and no clipped or truncated control label. Content MUST
  reflow without horizontal scrolling down to a viewport width of 320px, because WCAG 2.1 AA criterion
  1.4.10 Reflow is measured at 320 CSS pixels and the constitution binds this feature to AA; 375px is the
  narrowest width we gate on, not the narrowest width that must work. At 375px an interactive target MUST
  be at least 44px high, and at least 44px wide as well whenever its visible label is an icon or a single
  character — a `rating` star or a bare checkbox is otherwise free to satisfy the height rule while
  remaining too narrow to hit.
- **FR-059**: Brand colour MUST reach the UI only through design tokens; no screen in this feature MUST
  hard-code a colour value.
- **FR-077**: Every screen MUST carry a document title that names it, so a respondent with several tabs
  open can tell them apart (WCAG 2.1 criterion 2.4.2, Level A, which AA conformance includes): `Surveys`
  for the catalog, `<survey title> — Survey` for a survey viewer in any of its editing states,
  `<survey title> — Response received` for `submitted`, `Survey not available` for a configuration error
  and `Survey not found` for the not-found screen. The document MUST also declare its language as
  `en` (criterion 3.1.1), since the content is English only.

### Key Entities

- **Survey**: one validated configuration — key, title, optional description, and an ordered, non-empty
  list of pages.
- **Page**: a title and an ordered list of questions, possibly empty.
- **Question**: an id, a type from the six, a title, an optional description, a required flag, the
  validation rules valid for that type, optional `options` (radio, checkbox), and an optional attachment
  policy.
- **Option**: an id, a label shown to the respondent, and a stored value, unique within its question.
- **Attachment policy**: `maxFiles` (0-3), `acceptedTypes`, `maxSizeBytes`.
- **Answer**: the value held for one question — one option value, a set of option values, a string, or an
  integer — plus that question's accepted attachments.
- **Attachment**: an accepted file's name, MIME type, size, and content.
- **Manifest entry**: a survey key, a title, an optional description, and the location of its config.
- **Response state**: which one of the eight states the viewer currently occupies.
- **Submission**: the payload crossing the boundary — survey key, `clientSubmissionId`, client timestamp and
  answers — and the reference returned on acknowledgement.
- **Client submission id**: an identifier the viewer generates once per survey session at the first Submit,
  re-sent unchanged by every retry so a receiver can recognise a duplicate.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A respondent can complete the four-page default fixture and reach the confirmation screen
  using the keyboard alone, with no mouse interaction.
- **SC-002**: The catalog at `/` renders its list within 1s of the manifest response, and the first
  question of a survey renders within 1s of its config response, on a mid-range mobile device.
- **SC-003**: For each of the six question types, at least one invalid input blocks Next, focuses the
  offending control, and announces an error naming the rule.
- **SC-004**: 100% of files that violate type, size, emptiness, duplication or count are rejected at
  selection time, each with an error naming the file, and no valid file in the same selection is lost.
- **SC-005**: Every failure class listed in `contracts/survey-json.md` renders the configuration-error
  screen with zero question controls present.
- **SC-006**: No test or manual run can reach the confirmation screen without an acknowledgement from the
  submission boundary.
- **SC-007**: After an induced submission failure, 100% of previously entered answers and attachment
  entries are still present and editable.
- **SC-008**: Every flow passes at 375px and 1280px with no horizontal scrolling and no truncated
  control label, and the catalog, a survey page and the validation-error state reflow without horizontal
  scrolling at 320px as well (FR-058).
- **SC-009**: An automated accessibility check reports no WCAG 2.1 AA violation on each of seven screens:
  the catalog, a survey page, the validation-error state, the submission-error state, the confirmation
  screen, the configuration-error screen and the not-found screen. The check is run at 375px and at
  1280px, and every screen carries the document title and language required by FR-077. The one AA
  criterion this feature does not meet, 1.3.5 Identify Input Purpose, is recorded under Assumptions with a
  removal plan; it is not detectable by an automated check and MUST NOT be treated as met by SC-009
  passing.
- **SC-010**: Spec scenarios map to automated tests with at least 80% line coverage of
  `src/app/core/**`, per Principle IV.
- **SC-011**: Every retry after a submission failure carries the same `clientSubmissionId` as the attempt it
  retries, so no sequence of retries within one session can present a receiver with two distinct responses.
- **SC-012**: A respondent can move backwards and forwards through all four pages of the default fixture any
  number of times without losing a single answer or attachment, and without being shown an error for a page
  they have not tried to leave forward.
- **SC-013**: A second survey can be added, changed and removed with a diff touching only one config file
  under `public/` and one entry in `public/survey-manifest.json`, and `git diff --stat -- src/app` reports
  no change. This is the measurement of FR-004 and of Principle I's central claim; without it that claim
  is asserted but never checked.
- **SC-014**: Neither the catalog nor the survey viewer can be left in `loading` for longer than 10s by any
  manifest or config response, including one that never arrives (FR-075).

## Assumptions

Recorded where the feature description left a routine detail open. Each is a decision taken by the
Product Owner, not an open question.

- Surveys are anonymous. There is no respondent identity, no login, and no resumption of an earlier
  session.
- Answers live in memory for the duration of the visit. Nothing is written to local or session storage,
  so a reload starts over.
- The fixture's attachment policy is `maxFiles: 3`,
  `acceptedTypes: ["image/png", "image/jpeg", "application/pdf"]`, `maxSizeBytes: 5242880` (5 MB). No
  question may set `maxSizeBytes` above 10485760 bytes (10 MB) per file (Clarification Q4).
- `rating` defaults to the inclusive range 1-5 when `scale` is absent and renders as stars;
  `satisfaction` is always the five labelled points 1-5 (Clarification Q5).
- The submission boundary is simulated for this feature; no server exists yet, the simulated adapter always
  acknowledges, and only a test may substitute a failing one (Clarification Q9).
- The real endpoint is anonymous and takes attachment bytes inline as base64; both are our stated
  expectation of a service that does not exist yet, and either can change behind the boundary without
  touching survey logic (Clarifications Q1 and Q3).
- Content is English only; error text is authored in the spec's wording (FR-069) and is not translated.
  The document declares `lang="en"` on that basis (FR-077).
- **Documented limitation — WCAG 2.1 criterion 1.3.5 Identify Input Purpose (AA)**: this criterion asks
  that a field collecting one of 53 listed pieces of information about the user declare its purpose
  programmatically, and the fixture's `q_name` collects the respondent's name. The survey JSON contract has
  no field in which an author could declare an input purpose, so the viewer sets no `autocomplete` value
  and this feature does not meet 1.3.5 for such a question. Recorded here rather than left implied, as
  Governance requires. _Why not fixed here_: inferring a purpose from a question's title or id would be the
  viewer guessing at the author's meaning, which Principle I forbids, and the only honest fix is a new
  optional `inputPurpose` field on `textbox`, which is a contract change and therefore a change to every
  validator and fixture. _Removal plan_: add optional `inputPurpose` to `textbox` in
  `contracts/survey-json.md`, constrained to the WCAG 1.3.5 token list, in the feature that next touches
  that contract; until then no survey in this repository may collect a 1.3.5-listed field other than a
  name. _Scope of the gap_: `q_name` only. No other fixture question collects information about the
  respondent.
- One survey is answered at a time; opening a second survey discards the first session's answers.
- "Submitted" is final within a visit: the confirmation screen offers a route back to the catalog, not
  back into the answered survey.

## Open Clarifications

None. The three questions `/speckit-specify` left open were decided in `/speckit-clarify` (PRI-15) and are
recorded as Q1, Q2 and Q3 under [Clarifications](#clarifications), together with the six further details
that stage was asked to settle. `/speckit-checklist` (PRI-16) then found fourteen requirements-quality
defects and fixed all fourteen in this revision; they are recorded under
[Checklist review](#checklist-review--session-2026-10-08). This spec and its contracts carry no unresolved
clarification marker.

The one thing this spec records as unmet rather than resolved is WCAG 2.1 AA criterion 1.3.5, under
Assumptions, with a justification and a removal plan as Governance requires. It is a documented limitation,
not an open question: no decision is pending on it in this feature.
