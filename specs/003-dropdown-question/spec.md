# Feature Specification: `dropdown` Question Type

**Feature Branch**: `001-survey-management` (feature 003 ships on the 001 branch)
**Created**: 2026-10-11
**Status**: Semantics confirmed — no open clarifications, ready for QA mapping and code review
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Input**: A searchable single-select question type for the Dynamic Survey Viewer: a dropdown list from a
static options array of {label, value} pairs with unique values; it starts blank with no preselection; it
supports required, can be cleared when optional; and it submits the selected value as a string. Add one
dropdown to the default fixture.

## Scope

In scope: the product meaning of `dropdown` — what an author may configure, what the respondent sees and
can do, what `required` means on a dropdown, what the submission payload carries, and which authoring
mistakes must fail closed.

Out of scope: a dropdown that starts with a preselected option, a dropdown whose options are loaded
dynamically from a server, a dropdown that reveals or hides other questions (conditional logic), a
searchable multi-select (that is checkbox), and translating the options or search text. None of these are
in feature 003; a later feature may add any of them.

## Relationship to feature 001

The dropdown type is documented here; the reference to it in the 001 artifacts will be added to its
enum (FR-003) and contract (survey-json.md) by the QA Engineer when they map tests. For now, point at the
001 spec and contracts for the parts of the contract that dropdown inherits rather than restating:

| What                                        | Where it lives, normatively                                    |
| ------------------------------------------- | -------------------------------------------------------------- |
| Type in the question-type enum              | `specs/001-survey-management/spec.md` FR-003 / line 489        |
| Authoring schema and failure codes          | `specs/001-survey-management/contracts/survey-json.md` § 2.2   |
| Allowed per-type keys (`options`)           | `specs/001-survey-management/contracts/survey-json.md` R22     |
| Submitted value and its always-present rule | `specs/001-survey-management/contracts/response-submission.md` |
| Typed model                                 | `specs/001-survey-management/data-model.md`                    |
| Default-fixture entry                       | `public/surveys/customer-feedback.json`, page 2 or 3           |

If a rule in this spec and a rule in those files disagree, the 001 contract wins and this spec is the file
to correct.

## Decisions _(mandatory)_

Six semantic choices are confirmed below, one sentence each, then the reason and the alternative rejected.

### D-001 — Options shape and minimum: array of {label, value} objects, at least 2 entries

**Decision**: A `dropdown` carries `options: { label: string, value: string }[]` with a minimum of 2
options, identical in shape to `radio` and `checkbox`, and a maximum of 100 options (practical UI limit).
Each option's `value` MUST be unique within its question; a duplicate `value` is a configuration error
that names the path and the duplicate value.

**Why**: A dropdown presents choices the same way radio does, so it shares the same shape. A minimum of
2 enforces that the dropdown is the author's deliberate choice, not a placeholder for a missing options
list. Uniqueness is mandatory, not optional, because "which value did the respondent pick?" must have
exactly one answer. More than 100 options is rare in surveys and harder to search; a practical ceiling
prevents a config with 10,000 options from being valid.

**Alternative rejected**: allowing a single-option dropdown. A control with one choice is not a choice —
an author who wants to display information should use a description, not a question. Rejecting it at config
time prevents the confusion of an unanswered single-option dropdown at submission time.

### D-002 — Search behaviour: filter on label and value, case-insensitive, substring match

**Decision**: When the respondent types in the dropdown search field, the list filters to show only
options whose label OR value contains the typed text (case-insensitive substring match). Matching is
performed on the trimmed, lowercased text; "Fire" matches "wildfire" and "WILDFIRE" and "fireplace".

**Why**: A substring match is more forgiving than a prefix match — if I don't remember whether "wildfire"
came first or "fireplace", I can type "fire" and see both. Case-insensitive search is expected in modern
UIs and suits surveys where respondents type casually. Searching both label and value supports authors
who store codes (like "WF") in values and want respondents to find them; most respondents will search the
label, but some will know the code.

**Alternative rejected**: a regex-based or fuzzy search. Fuzzy matching is powerful but also surprising
in a survey context — respondents expect a straightforward search, not algorithm-driven results that
might omit a perfect match if the algorithm thinks it is not close enough.

### D-003 — Starting state: blank, no placeholder, nothing preselected, reads as unanswered

**Decision**: A dropdown with no selected option shows a blank control with no placeholder text, and
reads as unanswered. The respondent must explicitly select an option; nothing is chosen for them,
regardless of the option order.

**Why**: Leaving the control blank makes it clear that a choice is required of the respondent, not
automatic. A placeholder would suggest the text is a selectable option, which it is not. An author who
wants a default selection should use a different question type (checkbox, radio) that can be presented
pre-filled, or author a "No preference" option if that is a valid choice for the survey.

**Alternative rejected**: a placeholder such as "Select an option" or a preselected first option. Both
obscure whether the respondent has actually made a choice. "Blank means unanswered" is the same rule
radio applies and the same reading every other text-based control uses.

### D-004 — Required validation: "Choose one option" message, no special wording

**Decision**: A `required: true` dropdown must have one option selected before Next or Submit is allowed.
The validation error uses the same message as required `radio`: "Choose one option" (FR-069). No
dropdown-specific message is needed.

**Why**: A dropdown is a single-select, so the message for radio — which is also a single-select — is
exactly correct and immediately understood. Introducing a dropdown-specific message ("Choose from the
list") would be a variation for no reason; one message per rule is clearer.

**Alternative rejected**: "Select an option from the list" or any other rewording. An option is an
option, whether presented as a radio button or a dropdown arrow; the rule is the same, so the message is
the same.

### D-005 — Clear action: optional dropdowns can be cleared to blank, required cannot

**Decision**: An optional dropdown (required: false) whose respondent has selected an option can be
returned to blank by activating a Clear action. A required dropdown cannot be cleared past the blank
state, because clearing it would immediately trigger validation, so the respondent cannot leave a
required dropdown blank by clearing it. A required dropdown left blank by deselecting its current option
blocks Next and Submit with the required error.

**Why**: Unlike radio (where every option is both a choice and a deselection of the others), a dropdown
starts blank, so clearing it is a meaningful operation — it returns the control to its initial state. An
optional dropdown's respondent should be able to change their mind and clear their answer, as they can
with rating and satisfaction. A required dropdown cannot be left blank because that would violate the
required rule; to change a required dropdown's answer, the respondent must select a different option, not
clear it.

**Alternative rejected**: required dropdowns that offer a Clear button. Offering to clear a required
control is offering to break it — it would only be available for an instant before validation blocks it,
confusing the respondent about whether Clear works at all.

### D-006 — Submitted value: selected option's value as native JSON string; unanswered omitted

**Decision**: When the respondent selects an option and submits, the payload carries the selected
option's `value` as a native JSON string (not a quoted string, not an object). An unanswered dropdown
omits the entry from the payload entirely, consistent with radio, checkbox, textbox and textarea; only
an answered dropdown sends a value.

**Why**: The submission payload is a JSON object carrying answers as their stored types: strings for
text and dropdown, integers for rating and satisfaction, arrays for checkbox, booleans for toggle.
Omitting an unanswered entry is the convention every type except toggle follows and the convention the
submission contract (FR-035) already establishes; dropdown is no exception.

**Alternative rejected**: sending the `value` as a quoted string like `"\"selected-value\""` or sending
`null` for unanswered. Neither matches the contract for other single-value controls; a native string is
what the contract expects and deserves.

## Minimum valid dropdown question

```json
{ "id": "q_color", "type": "dropdown", "title": "What is your favorite color?", "options": [...] }
```

Four fields: `id`, `type`, `title`, `options`. The `options` field is required on dropdown and must have
at least 2 entries. That is complete and valid. It renders a blank dropdown with no preselection; the
respondent may search by typing and select one option; it is optional; and it submits the selected
option's value as a string, or omits the entry if left blank.

Defaults when a field is absent:

| Field         | Default                       |
| ------------- | ----------------------------- |
| `required`    | `false`                       |
| `description` | absent, nothing rendered      |
| `attachments` | absent, no attachment control |

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Answer an optional dropdown (Priority: P1)

A respondent reaches a page carrying an optional dropdown, searches or scrolls to find an option, selects
it, and submits it as their answer.

**Why this priority**: this is the type. The option the respondent selects must be the value submitted.

**Independent Test**: load a survey with an optional dropdown carrying at least 5 options, search for one
by typing part of its label, select it, submit, and assert the payload carries that option's `value` as a
native string.

**Acceptance Scenarios**:

1. **Given** a dropdown `q_color` with five options ["Red", "Blue", "Green", "Yellow", "Purple"] with
   values ["red", "blue", "green", "yellow", "purple"], **When** the page renders, **Then** one blank
   dropdown control is present, no option is visibly selected, no Clear action is present, and the control
   reads as unanswered to assistive technology.
2. **Given** the respondent activates the dropdown control, **When** it opens, **Then** all five options
   are listed in config order and searchable by the visible label.
3. **Given** the dropdown is open and the respondent types "gre", **When** the list filters, **Then** only
   "Green" remains in the visible list; other options are hidden.
4. **Given** the respondent types "re", **When** the list filters, **Then** "Red" and "Purple" are visible
   and "Blue", "Green", "Yellow" are hidden, because both label and value are searched.
5. **Given** the respondent has typed "gre" and Green is the only option showing, **When** they activate
   it, **Then** the dropdown closes, shows "Green" as the selected label, and the stored answer is
   `"green"` (the option's value, not the label).
6. **Given** the dropdown shows "Green" as selected, **When** the respondent opens it again, **Then** the
   search field is empty (not "gre"), the list shows all five options again, Green is marked as selected,
   and the respondent can type a new search.
7. **Given** Green is selected and the respondent activates the Clear action, **When** the dropdown
   settles, **Then** it shows blank again, the stored answer is unanswered (omitted from payload), and the
   respondent can search and select a different option.
8. **Given** the respondent leaves the dropdown blank and submits, **Then** the payload omits the entry
   for `q_color` entirely — the field is not present and the value is not `null`.

---

### User Story 2 - A required dropdown gates the page (Priority: P1)

A respondent cannot advance past a mandatory dropdown they have left blank, and the error tells them what
to do.

**Why this priority**: D-004 is the decision with a visible consequence for the respondent. If it is not
enforced, `required` on this type is a lie in the config.

**Independent Test**: configure a dropdown with `required: true` and at least 2 options, attempt Next
without selecting an option, and assert Next is refused with the message `Choose one option`.

**Acceptance Scenarios**:

1. **Given** a dropdown with `required: true` and five options, **When** the respondent activates Next
   without selecting an option, **Then** the page does not advance, the dropdown is focused, and the error
   `Choose one option` is associated with that question and announced.
2. **Given** the respondent now selects any option, **When** they activate Next, **Then** the page
   advances with no error.
3. **Given** the required dropdown is showing a selected option, **When** the respondent activates the
   Clear action and then tries Next, **Then** the page does not advance, the dropdown is blank, and the
   error `Choose one option` is shown again — clearing a required dropdown breaks it immediately.
4. **Given** a required dropdown left blank on page 2 of a survey and the respondent is on the last page,
   **When** they activate Submit, **Then** the submission is refused, the validation summary names that
   question, no request crosses the submission boundary, and the earliest invalid page (page 2) renders.

---

### User Story 3 - A mis-authored dropdown fails closed (Priority: P1)

A survey author who writes the wrong shape for `options`, fewer than 2 options, duplicate values, or a
non-string value, gets the configuration-error screen, not a half-rendered dropdown.

**Why this priority**: this prevents an authored dropdown from rendering with missing options or hidden
duplicate values that are later hard to debug.

**Independent Test**: take a valid survey, replace a dropdown's options with an invalid form (fewer than 2
entries, duplicate values, non-string values), load the survey, and assert the configuration-error screen
renders with zero question controls present.

**Acceptance Scenarios**:

1. **Given** a dropdown with only one option, **When** the config is loaded, **Then** validation fails
   naming the question path, stating that a dropdown needs at least 2 options, the configuration-error
   screen renders, and no question control is rendered.
2. **Given** a dropdown with two options sharing the same value, **When** the config is loaded, **Then**
   validation fails naming the duplicate value and its path, the configuration-error screen renders, and
   no question control is rendered.
3. **Given** a dropdown whose `options` is not an array, **When** the config is loaded, **Then**
   validation fails naming that field, the configuration-error screen renders, and no question control is
   rendered.
4. **Given** a dropdown option with a missing `label` or `value`, **When** the config is loaded, **Then**
   validation fails naming that field's path, the configuration-error screen renders, and no question
   control is rendered.
5. **Given** a dropdown option with a non-string `value` (a number, boolean, or `null`), **When** the
   config is loaded, **Then** validation fails naming the field and the offending value, the
   configuration-error screen renders, and no question control is rendered.
6. **Given** a dropdown with more than 100 options, **When** the config is loaded, **Then** validation
   fails stating the maximum, the configuration-error screen renders, and no question control is
   rendered.
7. **Given** a dropdown carrying a key that belongs to another type, such as `scale` or `minSelections`,
   **When** the config is loaded, **Then** validation fails naming that key, the configuration-error
   screen renders, and no question control is rendered.

### Edge Cases

Each case below is a decision, not an open question.

- **An untouched dropdown on a page the respondent never visited**: not reachable. Submit re-validates
  every page, and a dropdown on an unvisited page still submits nothing (the entry is omitted) and, if
  required, still blocks Submit.
- **Search for a value that matches both a label and a value, differently**: both options are shown. No
  disambiguation is needed; the respondent sees all matching options and picks the one they intend.
- **Clear a required dropdown and return to the same page later**: the dropdown shows blank again
  (answers are not re-validated until Next or Submit), and activating Next shows the required error
  again — the page is in `editing` until validation is re-run.
- **Dropdown with 100 options**: valid, and the search field allows the respondent to narrow the list.
- **Search matching zero options**: the list shows empty. The respondent can clear the search field or
  type a different search.
- **Open a dropdown, start typing, then activate an option before the list has finished filtering**: the
  option the respondent activated is selected, whether or not it is still visible after filtering — the
  respondent's intent to select is honoured over the filter's timing.
- **Submission fails after a dropdown was set**: the dropdown's selected value is preserved exactly as
  the respondent left it, like every other answer (001 FR-034).
- **A page containing only a dropdown**: valid, and it validates like any other page.
- **Reload mid-survey**: the dropdown returns to blank, because answers are in memory only. This is the
  same rule as every other type and is not a dropdown-specific behaviour.
- **Options list has duplicate labels, different values**: valid. The respondent sees both labels (they
  may be identical or close) and can select either one; each carries its own value to submission.
- **Large option labels at the 200-character limit**: valid, and the label must wrap rather than truncate
  at 375px. 201 code points is a validation failure, consistent with every other label in the contract.
- **Dropdown with attachments configured**: valid. Attachments are a per-question policy independent of
  type, and a required-and-blank dropdown blocks the page whether or not a file is attached.

## Requirements _(mandatory)_

Feature 003 adds requirements for the dropdown type and inherits core validation rules from 001. Numbering
continues the 001 sequence.

#### Dropdown-specific

- **FR-080** _(new)_: A `dropdown` question MUST present a searchable single-select list of options from
  its `options` field (minimum 2, maximum 100 entries). It MUST render as a blank control until an option
  is selected; it MUST NOT render a placeholder or preselect the first option. When typing in the search
  field, options are filtered by case-insensitive substring match on the option's label OR value, and the
  list updates in real time. Activating an option closes the dropdown and shows the selected option's
  label. This type holds exactly one option value, or is unanswered if left blank.

- **FR-081** _(new)_: A `dropdown` question MUST enforce unique `value` within its options, and a
  duplicate value is a configuration error that names the path of the duplicate (FR-040). Fewer than 2
  options, more than 100 options, a non-string value, or a missing label or value are also configuration
  errors.

- **FR-082** _(new)_: An optional `dropdown` MUST offer a Clear action that returns the question to
  blank / unanswered (like rating and satisfaction). A required dropdown cannot use Clear while in blank
  state; the respondent must select a different option to change the answer (D-005).

#### Inherited from 001

- **FR-012** (confirmed, not restated): A required `dropdown` is answered only when a value is selected.
  The validation message is the same as required `radio`: "Choose one option" (FR-069).

- **FR-035** (confirmed): The submitted value for an answered dropdown is the selected option's native
  JSON string value; an unanswered dropdown omits the entry from the payload.

- **FR-040, FR-041, FR-042** (confirmed): An invalid dropdown config renders the configuration-error
  screen before any control renders, with the offending path named.

### Key Entities

- **`DropdownQuestion`** — a question carrying `type: 'dropdown'`, a non-empty options array (minimum 2,
  maximum 100 entries) with unique values, no preselected value, and no placeholder. Normalisation of
  defaults (absent means not shown) happens once, at config validation, so no component invents wording or
  a starting position of its own. Defined in `specs/001-survey-management/data-model.md`.
- **The dropdown answer** — a single string value (the selected option's `value` field), or unanswered if
  blank.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-027**: Every submission of a survey containing a dropdown carries exactly one entry for that
  question, with a native JSON string value, in 100% of runs where the respondent selected an option.
  Runs where the respondent left it blank omit the entry (never `null`, never empty string) in 100% of
  runs.
- **SC-028**: A required dropdown left blank blocks Next and blocks Submit in 100% of attempts, and no
  request crosses the submission boundary in any of them. The error reads "Choose one option".
- **SC-029**: Clearing an optional dropdown that has a selected option returns it to blank in 100% of
  runs. Clearing a required dropdown while blank has no effect — it remains blank and validation blocks
  the page.
- **SC-030**: Each of the seven authoring mistakes in User Story 3 renders the configuration-error screen
  with zero question controls present.
- **SC-031**: A respondent can search a dropdown with 20+ options by typing, see results filter in real
  time, select one, and submit, using the keyboard alone, and an automated accessibility check reports no
  WCAG 2.1 AA violation on the page at 375px and at 1280px.
- **SC-032**: The dropdown list displays up to 20 options at once; more than 20 trigger scrolling within
  the dropdown pane with no impact on page reflow. The dropdown pane does not scroll the page itself.
- **SC-033**: Adding a dropdown question to a survey touches one config file under `public/` and one
  manifest entry, and no file under `src/app` — the measurement of Principle I for this type, as SC-013
  is for feature 001.

## Assumptions

Each is a decision taken by the Product Owner, not an open question.

- The dropdown is the only presentation of a searchable single-select in this feature. A multi-select
  version is checkbox.
- Options are always supplied by the author as a static list. Dynamic loading from a server or filtering
  by a previous answer is out of scope for this feature.
- The 200-code-point label limit and the `id` pattern are inherited from the 001 contract, not restated
  as dropdown-specific rules.
- English only, consistent with 001. Options are authored in English and presented as authored.

## Open Clarifications

None. The six decisions above — options shape and minimum, search behaviour, starting state, required
validation, clear action, and submitted value — are decided as D-001 through D-006, each with the
alternative that was rejected and why.

## Next

QA Engineer maps each acceptance scenario above to a test and reports which are already covered and which
are not. Code Reviewer reviews the implementation against D-001 through D-006 and FR-080 through FR-082.
Solution Architect updates `specs/001-survey-management/contracts/survey-json.md` to add the dropdown
section and updates FR-003 and the `QUESTION_TYPES` enum to include `dropdown`.
