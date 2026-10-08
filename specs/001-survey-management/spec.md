# Feature Specification: Dynamic Survey Viewer

**Feature Branch**: `001-survey-management`
**Created**: 2026-10-07
**Last updated**: 2026-10-08
**Status**: Draft (3 open clarifications, resolved in `/speckit-clarify`)
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
   and within 15s the confirmation screen replaces the survey.
4. **Given** the submission boundary returned `{ submissionId: "sub_0001" }`, **When** the confirmation
   screen renders, **Then** it shows the survey title "Customer Feedback", the text that the response
   was received, the reference `sub_0001`, and a link to `/`, and it shows no question controls.
5. **Given** the confirmation screen is showing, **When** the respondent activates the link to `/` and
   reopens the same survey, **Then** the survey starts at page 1 with every answer empty.

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
   the respondent activates Next, **Then** the page does not change and the error reads "Enter your
   name" (the trimmed value is empty, so the required rule reports, not the length rule).
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
- **Network loss while filling the survey**: not detected or surfaced while editing. It surfaces as a
  submission-error at Submit, with answers preserved.
- **Text longer than `maxLength` pasted in**: the input accepts no more than `maxLength` characters, and
  the rule is also checked at Next and at Submit, so a value arriving by any other route still fails
  closed.

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
- **FR-009**: `rating` MUST present an integer scale from `scale.min` to `scale.max` (defaults 1 and 5)
  and hold one integer in that inclusive range.
- **FR-010**: `satisfaction` MUST present a fixed five-point labelled scale (very dissatisfied,
  dissatisfied, neutral, satisfied, very satisfied) stored as the integers 1 to 5. Its scale is not
  configurable.

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
  a value between 1 and 5".
- **FR-020**: Changing an answer MUST clear that question's error immediately, without re-running
  navigation.

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

#### Submission

- **FR-035**: A submission MUST cross exactly one typed boundary, carrying the survey key, one answer per
  answered question, each question's attachments, and a client timestamp, as defined in
  `contracts/response-submission.md`.
- **FR-036**: The default submission adapter MUST be simulated: it performs no network request,
  acknowledges after an artificial delay of at most 1s, and returns a generated submission reference. The
  real transport MUST target `POST /api/survey-responses` with the same payload, selectable without
  changing survey logic.
- **FR-037**: Only an explicit acknowledgement from the boundary MUST produce the submitted state. An
  absent, malformed or failing response MUST produce submission-error.
- **FR-038**: A submission MUST be abandoned as failed after 15s without acknowledgement.
- **FR-039**: While a submission is in flight, further Submit activations MUST be ignored, and no answer
  or attachment MUST be editable.

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

#### Response states

- **FR-045**: The viewer MUST occupy exactly one of eight states — `loading`, `ready`, `editing`,
  `validation-error`, `submitting`, `submitted`, `submission-error`, `configuration-error` — and what the
  respondent sees in each MUST be:
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
  enabled.

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
- **FR-058**: At viewport widths of 375px and 1280px every flow MUST work with no horizontal scrolling,
  no clipped or truncated control label, and interactive targets at least 44px high at 375px.
- **FR-059**: Brand colour MUST reach the UI only through design tokens; no screen in this feature MUST
  hard-code a colour value.

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
- **Submission**: the payload crossing the boundary, and the reference returned on acknowledgement.

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
  control label.
- **SC-009**: An automated accessibility check of the catalog, a survey page, the validation-error state,
  the confirmation screen and the configuration-error screen reports no WCAG 2.1 AA violation.
- **SC-010**: Spec scenarios map to automated tests with at least 80% line coverage of
  `src/app/core/**`, per Principle IV.

## Assumptions

Recorded where the feature description left a routine detail open. Each is a decision taken by the
Product Owner, not an open question.

- Surveys are anonymous. There is no respondent identity, no login, and no resumption of an earlier
  session.
- Answers live in memory for the duration of the visit. Nothing is written to local or session storage,
  so a reload starts over.
- The fixture's attachment policy is `maxFiles: 3`, `acceptedTypes: ["image/png", "image/jpeg",
"application/pdf"]`, `maxSizeBytes: 5242880` (5 MB). A config MUST NOT exceed 10485760 bytes (10 MB)
  per file.
- `rating` defaults to the inclusive range 1-5 when `scale` is absent. `satisfaction` is always 1-5.
- The submission boundary is simulated for this feature; no server exists yet, and the simulated adapter
  always acknowledges unless a test substitutes a failing one.
- Content is English only; error text is authored in the spec's wording and is not translated.
- One survey is answered at a time; opening a second survey discards the first session's answers.
- "Submitted" is final within a visit: the confirmation screen offers a route back to the catalog, not
  back into the answered survey.

## Open Clarifications

Three questions depend on a system outside this feature and are resolved in `/speckit-clarify` (PRI-15),
not guessed here. Each is marked where it bites.

- **[NEEDS CLARIFICATION: does `POST /api/survey-responses` require an authorization credential, and what
  should the respondent see on a 401?]** Affects FR-036 and the error table in
  `contracts/response-submission.md`.
- **[NEEDS CLARIFICATION: must a retry after submission-error carry an idempotency key, or is the
  receiving service responsible for de-duplicating repeat submissions?]** Affects FR-039 and User Story 6
  scenario 3.
- **[NEEDS CLARIFICATION: will the real endpoint accept attachment bytes inline in the JSON payload, or
  does it require multipart or a pre-signed upload?]** Affects FR-035 and the attachment shape in
  `contracts/response-submission.md`. The simulated adapter is unaffected.
