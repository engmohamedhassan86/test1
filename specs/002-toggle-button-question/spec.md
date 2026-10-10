# Feature Specification: `toggle_button` Question Type

**Feature Branch**: `001-survey-management` (feature 002 ships on the 001 branch; see
[Relationship to feature 001](#relationship-to-feature-001))
**Created**: 2026-10-10
**Status**: Semantics confirmed — no open clarifications, ready for QA mapping and code review
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Input**: An eighth question type for the Dynamic Survey Viewer: a boolean question rendered as one
on/off switch, with author-configurable on and off labels, an author-configurable starting position,
and a `required` rule. An implementation already exists at commit `cf9eb25`; it assumed three product
semantics that no Product Owner had confirmed. This spec confirms them, states the reason for each,
and gives QA the acceptance criteria to map tests to.

## Scope

In scope: the product meaning of `toggle_button` — what an author may configure, what the respondent
sees and can do, what `required` means on a switch, what the submission payload carries, and which
authoring mistakes must fail closed.

Out of scope: the three-state switch (on / off / not yet touched), a per-question override of what
`required` means, an author-supplied colour or icon in place of a label, a toggle that reveals or
hides other questions (conditional logic), and translating the labels. None of these are in feature
002; a later feature may add any of them.

## Relationship to feature 001

This type is already documented inside the 001 artifacts, and those remain the normative schema and
wire contract. This spec is the product decision record; it must not restate a rule in a form that
can drift from them. The pointers:

| What                                              | Where it lives, normatively                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Rendering and `required` behaviour                | `specs/001-survey-management/spec.md` FR-078, and the FR-069 message table |
| Type in the question-type enum                    | `specs/001-survey-management/spec.md` FR-003 / line 489                    |
| Authoring schema and failure codes R45a–R45c      | `specs/001-survey-management/contracts/survey-json.md` § `toggle_button`   |
| Allowed per-type keys (`options`, `defaultValue`) | `specs/001-survey-management/contracts/survey-json.md` R22                 |
| Submitted value and its always-present rule       | `specs/001-survey-management/contracts/response-submission.md`             |
| Typed model, `toggleValue`, `toggleLabel`         | `specs/001-survey-management/data-model.md`                                |
| Default-fixture entry `q_notifications`           | `public/surveys/customer-feedback.json`, last page                         |

If a rule in this spec and a rule in those files disagree, the 001 contract wins and this spec is the
file to correct.

## Decisions _(mandatory)_

Three semantics were chosen by the implementer at `cf9eb25` before a Product Owner had ruled on them.
All three stand, unchanged. Each is one sentence, then the reason it was chosen over the alternative.

### D-001 — Unanswered state: there is none, and an untouched toggle submits its `defaultValue`

**Decision**: A `toggle_button` has no unanswered state, so an untouched toggle is submitted carrying
its `defaultValue` as a native boolean, never omitted and never `null`.

**Why**: A switch always shows a position, and `defaultValue` is the position it showed, so omitting
it would send a response that contradicts what the respondent actually saw on screen — and because
`false` is a legitimate opt-out, a missing entry would make "they chose off" indistinguishable from
"they never touched it", which is the exact ambiguity we would be trying to avoid.

**Alternative rejected**: a payload that distinguishes "never touched" (a third state, or an omitted
entry). It was rejected because the only honest way to collect it is a control that _starts_ with no
position — a pair of radios or an unset checkbox — and that is a different question type, not this
one. An author who needs "no answer yet" to be visible in the data should use `radio` with two
options, which already has an unanswered state.

**Consequences**: there is no Clear action on a toggle (FR-060's Clear exists to return a control to
unanswered, and there is nothing to return to); the respondent reverses a toggle by flipping it back.

### D-002 — `required: true` means the value must be `true`

**Decision**: `required: true` on a `toggle_button` means the submitted value must be `true`; an
off toggle is a validation error that blocks Next and Submit.

**Why**: Because D-001 removed the unanswered state, "a value is present" is always satisfied and
would make `required` a no-op an author could set with no effect whatsoever — so the only reading
that does any work is the accept-the-terms gate, which is also the only thing a real survey asks of a
mandatory switch.

**User-facing error wording**: `Turn on LABEL to continue`, where `LABEL` is that question's
`options.onLabel`. Confirmed as-implemented. It names the question's own on-label rather than saying
"turn this on" because the label is the only word on the control the respondent can see — `Turn on
Send me news to continue` points at something they can find, where a generic sentence makes them hunt
for the switch. This is the row already present in the FR-069 message table.

**Alternative rejected**: `required` meaning "has a value". Rejected as a silent no-op (see above): an
author who set it would reasonably expect it to block, and it would never block.

**Authoring note**: a toggle whose author wants both positions acceptable must leave `required` absent
or `false`. `required: true` is a consent gate, not an emphasis marker.

### D-003 — `options` is an object of two labels, not a choice array

**Decision**: On a `toggle_button`, `options` is an object `{ onLabel, offLabel }` — each key optional,
each defaulting to `On` and `Off` respectively — and never the array of `{ id, label, value }` choices
that `radio` and `checkbox` carry.

**Why**: A switch has exactly two fixed positions whose meaning is "on" and "off", so there is nothing
for a choice array's `id` or `value` to vary — the only authorable thing is the wording shown for each
position, and an object with two named keys says that directly where a two-element array would invite
an author to add a third.

**Authoring risk, accepted and mitigated**: the same key name `options` now means two different shapes
depending on `type`, which is a real trap — an author copying a `radio` question into a toggle will
write an array, and an author copying the other way will write an object. The mitigation is that both
mistakes must fail closed at config-validation time with the path `Q.options` named, never render as a
switch with missing labels and never silently fall back to `On`/`Off`. This is R45a in
`contracts/survey-json.md`, and FR-079 below is the requirement that it be enforced.

**Alternative rejected**: renaming the field to `labels` on this type. It would remove the trap, but it
is a breaking change to a contract three other types already read and to the normalised model, and the
validator rejection in FR-079 closes the actual failure mode. Revisit only if a second boolean-shaped
type arrives.

## Minimum valid toggle question

```json
{ "id": "q_notify", "type": "toggle_button", "title": "Send me news?" }
```

Three fields: `id`, `type`, `title`. That is complete and valid. It renders a switch labelled `Off`,
starting in the off position, which the respondent may turn on to read `On`; it is optional; and it
submits `false` if left alone.

Defaults when a field is absent:

| Field              | Default                                  |
| ------------------ | ---------------------------------------- |
| `defaultValue`     | `false`                                  |
| `options.onLabel`  | `On`                                     |
| `options.offLabel` | `Off`                                    |
| `options`          | `{ "onLabel": "On", "offLabel": "Off" }` |
| `required`         | `false`                                  |
| `description`      | absent, nothing rendered in its place    |
| `attachments`      | absent, no attachment control            |

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Answer an optional toggle (Priority: P1)

A respondent reaches a page carrying an optional toggle, sees which position it is in and what that
position means, and either changes it or leaves it, in both cases submitting an unambiguous boolean.

**Why this priority**: this is the type. D-001 is only true if the position the respondent saw is the
value we send.

**Independent Test**: load the default `customer-feedback` fixture, reach the last page where
`q_notifications` renders, submit without touching it, and assert the payload carries
`{ "questionId": "q_notifications", "type": "toggle_button", "value": false }`.

**Acceptance Scenarios**:

1. **Given** `q_notifications` is configured with `options: { onLabel: "Send me news", offLabel: "No
news" }` and `defaultValue: false`, **When** the last page renders, **Then** one switch control is
   present showing the off position with the visible text `No news`, and no Clear action is present
   for that question.
2. **Given** that switch is showing `No news`, **When** the respondent activates it, **Then** it shows
   the on position with the visible text `Send me news`, and nothing else on the page changes.
3. **Given** the respondent turned it on and then activated it a second time, **When** the switch
   settles, **Then** it shows `No news` again and the question's stored answer is `false` — not
   unanswered.
4. **Given** the respondent never touched the switch, **When** they submit, **Then** the payload
   contains an entry for `q_notifications` with the native JSON boolean `false` — the entry is present,
   not omitted, and the value is not the string `"false"` and not `0`.
5. **Given** the respondent turned it on, **When** they submit, **Then** the payload entry for
   `q_notifications` carries the native JSON boolean `true`.
6. **Given** the respondent turned the switch on on the last page, **When** they navigate to the
   previous page and back, **Then** the switch still shows `Send me news`.
7. **Given** a toggle question authored with no `options` and no `defaultValue`, **When** its page
   renders, **Then** the switch shows the off position with the visible text `Off`, and turning it on
   shows `On`.

---

### User Story 2 - A required toggle gates the page (Priority: P1)

A respondent cannot advance past a mandatory consent switch they have left off, and the error tells
them which switch and what to do with it.

**Why this priority**: D-002 is the decision with a visible consequence for the respondent. If it is
not enforced, `required` on this type is a lie in the config.

**Independent Test**: configure a toggle with `required: true`, `defaultValue: false` and
`onLabel: "I accept"`, attempt Next without touching it, and assert Next is refused with the message
`Turn on I accept to continue`.

**Acceptance Scenarios**:

1. **Given** a toggle with `required: true`, `defaultValue: false` and `options.onLabel: "I accept"`,
   **When** the respondent activates Next without touching it, **Then** the page does not advance, the
   switch is focused, and the error `Turn on I accept to continue` is associated with that question and
   announced.
2. **Given** that same required toggle is now on, **When** the respondent activates Next, **Then** the
   page advances with no error.
3. **Given** that same required toggle is on and the respondent turns it back off, **When** they
   activate Next, **Then** the page does not advance and the same error is shown again.
4. **Given** a required toggle authored with `defaultValue: true`, **When** the page renders and the
   respondent activates Next without touching it, **Then** the page advances — the switch was already
   in the accepting position, and nothing asks the respondent to re-affirm a position they were shown.
5. **Given** a required toggle left off on page 2 of a survey and the respondent is on the last page,
   **When** they activate Submit, **Then** the submission is refused, the validation summary names that
   question, and no request crosses the submission boundary.
6. **Given** an **optional** toggle (`required` absent) left in its `defaultValue: false` position,
   **When** the respondent activates Next, **Then** the page advances with no error — `false` on an
   optional toggle is a valid answer, never a missing one.

---

### User Story 3 - A mis-authored toggle fails closed (Priority: P1)

A survey author who writes the wrong shape for `options`, or a non-boolean `defaultValue`, gets the
configuration-error screen, not a half-rendered switch.

**Why this priority**: this is the mitigation for the accepted authoring risk in D-003. Without it the
`options`-means-two-things trap produces a control with wrong or missing wording in front of a real
respondent.

**Independent Test**: take the default fixture, replace the toggle's `options` object with a
`radio`-style array, load the survey, and assert the configuration-error screen renders with zero
question controls present.

**Acceptance Scenarios**:

1. **Given** a toggle question whose `options` is an array (the `radio`/`checkbox` shape), **When** the
   config is loaded, **Then** validation fails naming the path `Q.options`, the configuration-error
   screen renders, and no question control is rendered.
2. **Given** a toggle question whose `options` object carries a third key such as `label`, **When** the
   config is loaded, **Then** validation fails naming that key's path and the configuration-error screen
   renders.
3. **Given** a toggle question with `"defaultValue": "true"` (a string), **When** the config is loaded,
   **Then** validation fails naming `Q.defaultValue` — a truthy string is never coerced to `true`.
4. **Given** a toggle question with `"options": { "onLabel": "   " }`, **When** the config is loaded,
   **Then** validation fails naming `Q.options.onLabel` — a blank label is not a label, and it does not
   silently fall back to `On`.
5. **Given** a toggle question carrying a key that belongs to another type, such as `scale` or
   `minSelections`, **When** the config is loaded, **Then** validation fails naming that key.
6. **Given** a `radio` question whose `options` is the toggle object shape `{ onLabel, offLabel }`,
   **When** the config is loaded, **Then** validation fails — the trap must close in both directions.

### Edge Cases

Each case below is a decision, not an open question.

- **An untouched toggle on a page the respondent never visited**: not reachable. Submit re-validates
  every page, and a toggle on an unvisited page still submits its `defaultValue` (D-001) and, if
  required and off, still blocks Submit (US-2 scenario 5).
- **`required: true` with `defaultValue: true`**: valid, and it passes with no respondent action
  (US-2 scenario 4). An author who wants a deliberate opt-in must pair `required: true` with
  `defaultValue: false`; the viewer does not second-guess the pairing.
- **Both labels authored the same string**: valid. The viewer does not require the two labels to
  differ, because a screen reader distinguishes the positions through the switch's own on/off state,
  not through the wording.
- **Labels at the 200-character limit**: valid, and the label must wrap rather than truncate at 375px.
  201 code points is a validation failure, consistent with every other label in the contract.
- **A toggle with attachments configured**: valid. Attachments are a per-question policy independent of
  type, and a required-and-off toggle blocks the page whether or not a file is attached.
- **Submission fails after a toggle was set**: the toggle's position is preserved exactly as the
  respondent left it, like every other answer (001 FR / US-6).
- **A page containing only a toggle**: valid, and it validates like any other page.
- **Reload mid-survey**: the toggle returns to `defaultValue`, because answers are in memory only. This
  is the same rule as every other type and is not a toggle-specific behaviour.

## Requirements _(mandatory)_

Feature 002 adds one new requirement to the 001 set and confirms one already written. Numbering
continues the 001 sequence so that QA maps against one list, not two.

- **FR-078** _(confirmed, already in 001 — not restated here)_: rendering, visible labels,
  `defaultValue` as starting position, native boolean in every payload, no Clear action, and
  `required` meaning the value is `true`. See `specs/001-survey-management/spec.md`. This spec's
  D-001 and D-002 are the product confirmation of it.
- **FR-079** _(new)_: A `toggle_button` whose `options` is not an object of the keys `onLabel` and
  `offLabel`, and a non-`toggle_button` whose `options` is such an object, MUST both fail config
  validation with the offending path named, and MUST render the configuration-error screen with zero
  question controls present. Neither MUST fall back to a default label and neither MUST render a
  partial control. This is the mitigation the accepted authoring risk in D-003 depends on; without it
  that risk is accepted with nothing behind it.

### Key Entities

- **`ToggleButtonQuestion`** — a question carrying `type: 'toggle_button'`, a normalised `options`
  object with both labels always present, and a normalised boolean `defaultValue`. Normalisation
  happens once, at config validation, so no component chooses wording or a starting position of its
  own. Defined in `specs/001-survey-management/data-model.md`.
- **The toggle answer** — a single boolean. It is the one answer shape whose absence still carries a
  value, because the absence means `defaultValue` (D-001).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-020**: Every submission of a survey containing a toggle carries exactly one entry for that
  question, with a native JSON boolean value, in 100% of runs — including runs where the respondent
  never touched the control.
- **SC-021**: A required toggle left off blocks Next and blocks Submit in 100% of attempts, and no
  request crosses the submission boundary in any of them.
- **SC-022**: The error shown for a required-and-off toggle contains that question's configured
  `onLabel` verbatim, for every toggle in every fixture.
- **SC-023**: Each of the six authoring mistakes in User Story 3 renders the configuration-error
  screen with zero question controls present.
- **SC-024**: A respondent can read the switch's position, change it, and submit, using the keyboard
  alone, and an automated accessibility check reports no WCAG 2.1 AA violation on the page carrying
  the toggle at 375px and at 1280px.
- **SC-025**: The toggle's label wraps rather than truncates at 375px with a 200-character label, and
  the page shows no horizontal scrolling at 320px.
- **SC-026**: Adding a toggle question to a survey touches one config file under `public/` and no file
  under `src/app` — the measurement of Principle I for this type, as SC-013 is for feature 001.

## Assumptions

Each is a decision taken by the Product Owner, not an open question.

- The switch is the only presentation of a boolean question in this feature. A boolean rendered as a
  checkbox, or as a two-option radio pair, is the author's choice to make with `checkbox` or `radio`;
  this type is always a switch.
- The on and off labels are the whole of the respondent-visible wording for the control. There is no
  author-supplied helper text specific to the switch beyond the question's ordinary `description`.
- Colour alone never conveys the position: the position is carried by the visible label and by the
  control's own on/off state, so a respondent who cannot distinguish the track colours still reads it.
- `required` on this type has exactly one meaning across all surveys (D-002). There is no per-question
  override, because two meanings for one key is the trap D-003 already accepts once and we will not
  accept twice.
- The 200-code-point label limit and the `id` pattern are inherited from the 001 contract, not restated
  as toggle-specific rules.
- English only, consistent with 001. `On` and `Off` are English defaults; an author who needs other
  wording sets both labels.

## Open Clarifications

None. The three questions this feature opened — the unanswered state, the meaning of `required`, and
the shape of `options` — are decided above as D-001, D-002 and D-003, each with the alternative that
was rejected and why. All three confirm the behaviour already implemented at `cf9eb25`, so no
implementation change follows from this spec except the enforcement FR-079 names, which QA must verify
is already covered by R45a rather than assume.

The one thing this spec records as a knowingly accepted cost rather than a resolved question is the
double meaning of the key `options` (D-003). It is accepted, not open: the decision is to keep the key
name and close the failure mode with FR-079.

## Next

QA Engineer (PRI-38) maps each acceptance scenario above to a test and reports which are already
covered by `cf9eb25` and which are not. Code Reviewer reviews `cf9eb25` against D-001, D-002, D-003
and FR-079.
