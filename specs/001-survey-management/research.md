# Research: Dynamic Survey Viewer

**Feature**: `001-survey-management` · **Branch**: `001-survey-management` · **Date**: 2026-10-08
**Stage**: `/speckit-plan` Phase 0 · **Author**: Solution Architect
**Inputs**: `spec.md` (checklisted, no open clarifications), `.specify/memory/constitution.md` v1.0.0,
`contracts/survey-json.md`, `contracts/response-submission.md`

## 0. What was left to research

The spec carries no `NEEDS CLARIFICATION` marker and no open clarification: nine questions were decided in
`/speckit-clarify` and fourteen requirements-quality defects were fixed in `/speckit-checklist`. The
technology stack is fixed by the constitution, not chosen here. So Phase 0 is not technology discovery.
What was genuinely open is **how to shape the types and the service seams so that the spec's rules cannot
be broken by the code that comes next** — Principle II's "contract before implementation", and the
"make the illegal unrepresentable" lens.

Every decision below is recorded as Decision / Rationale / Alternatives rejected. Decisions D16, D17 and
D18 are cases where the spec or a contract is **under-specified or in tension with the task brief**; each
is resolved here in the fail-closed direction and listed again in `plan.md` §10 as a handback item for the
Product Owner. None of them blocks implementation.

## 1. Model shape

### D1 — Two layers: the authored JSON and the normalised domain model

**Decision.** `src/app/core/models` describes the **normalised** survey only: every optional authoring
field is already resolved to its default, and every "absent means X" rule from
`contracts/survey-json.md` has been applied. The authored JSON shape is never given a TypeScript type.
The validator's signature is `validateSurveyConfig(raw: unknown, servedKey: string): SurveyValidation`,
and it is the single place in the application that turns `unknown` into `Survey`.

**Rationale.** If the authored shape had a type, two types would describe one thing and every consumer
would have to re-apply the defaults — `question.minLength ?? 0` scattered across validators and
components, which is exactly the "silently repaired survey" Principle I forbids. Typing the input as
`unknown` also makes it impossible to read a field without proving it exists, which is what makes the
F02/F03/F06 failure classes enforceable rather than aspirational. One consequence is load-bearing: a
`Question` value in the application **cannot** exist unless it passed validation, so FR-042 ("validation
completes before any part of the survey renders") is a property of the type system, not a rule someone
must remember.

**Alternatives rejected.** (a) A single type with every validation field optional — pushes default
resolution into every caller and makes `maxLength` nullable at the point of comparison. (b) A JSON Schema
plus a generated type — adds a build step and a second source of truth for the same rules, and the error
messages a generic schema validator emits do not satisfy FR-041's "name the location and the offending
value" in the F01–F19 wording the contract fixes.

### D2 — `Question` is a discriminated union on `type`, with arity encoded in the type

**Decision.** Six interface members discriminated by a literal `type`, plus non-empty tuple types:
`pages` is `readonly [SurveyPage, ...SurveyPage[]]` (F11: at least one page) and `options` on `radio` and
`checkbox` is `readonly [SurveyOption, SurveyOption, ...SurveyOption[]]` (F10: at least two options).
Type-specific validation fields appear **only** on the members they are valid for, so F05 ("field not
valid for its question type") is a compile error for the application and a validation failure for a
config.

**Rationale.** `switch (question.type)` then exhausts with no `default` branch, and TypeScript's
`noFallthroughCasesInSwitch` plus an exhaustiveness helper makes a seventh question type a build failure
rather than a silently unrendered question. The tuple types mean no component ever has to defend against
`options.length < 2`.

**Alternatives rejected.** A single `Question` interface with a `type: QuestionType` field and all rules
optional — then `minLength` on a radio is representable, and FR-003/F05 can only be enforced at runtime.

### D3 — Branded ids for the four strings that are used as keys

**Decision.** `SurveyKey`, `PageId`, `QuestionId` and `OptionValue` are branded string types
(`string & { readonly [BRAND]: '…' }`). They are minted in exactly one place — the config and manifest
validators — and nowhere else.

**Rationale.** Session state is `ReadonlyMap<QuestionId, Answer>` and
`ReadonlyMap<QuestionId, readonly SessionAttachment[]>`. The realistic bug is keying one of those by a
page id, an option id, or an option _value_ — and the survey JSON contract deliberately distinguishes an
option's `id` from its `value` (F09 treats a duplicate of either as a failure), so a plain `string`
everywhere makes the two interchangeable at the type level. One cast site, in the validator, buys
compile-time separation for the rest of the codebase. `OptionValue` is branded because it is the thing a
submission carries; an option `id` is not branded, because it never leaves the question that owns it.

**Alternatives rejected.** Plain `string` — cheaper to write, but the mistake it allows (storing an answer
under an option value instead of a question id) produces a payload that validates and is wrong, which is
the worst failure class this feature has. Branding every string, including titles and labels — ceremony
with no bug to prevent.

### D4 — Unanswered is _absence_, not a sentinel

**Decision.** A question is answered if and only if its id is present in the answers map. There is no
`null`, no `''`, and no `[]` answer. `SurveySessionService.setAnswer` normalises on the way in: a text
value that is empty after trimming, and a checkbox selection that is empty, **delete** the entry rather
than storing an empty one. `Answer`'s checkbox variant is typed `readonly [OptionValue, ...OptionValue[]]`
so an empty selection is not representable at all.

**Rationale.** `contracts/response-submission.md` §2 requires that unanswered optional questions be
omitted from `answers`, "not sent as `null`". With three possible representations of "no answer", the
payload builder would need to recognise all three and one would eventually leak. With one, the builder is
`[...answers]`. It also makes FR-012 ("a required textbox is answered only when the trimmed value has at
least one character") the same check as "is it in the map", so US2 scenario 2 — the value `"  "` reporting
the _required_ rule and not the _length_ rule — falls out of the model instead of needing rule-ordering
logic. FR-013's trimming and FR-014's "minLength only on a non-empty answer" are then consistent by
construction.

**Alternatives rejected.** Storing every question's answer eagerly with a null/empty initial value —
simplifies the template binding slightly and then requires an `isAnswered()` predicate at every one of
the validation, payload, navigation and "clear the error" call sites.

### D5 — "Attachments off" is `null`, not `maxFiles: 0`

**Decision.** The normalised model carries `attachments: AttachmentPolicy | null`, and
`AttachmentPolicy.maxFiles` is `1 | 2 | 3`. The validator maps both authoring forms of "off" — an absent
`attachments` block and `"maxFiles": 0` — to `null`.

**Rationale.** FR-021 gives those two authoring forms one behaviour ("no file control renders"), so the
model should give them one representation and the component one branch (`@if (question.attachments)`).
Narrowing `maxFiles` to `1 | 2 | 3` also makes the contract's "`acceptedTypes` required when
`maxFiles > 0`" an unconditional required field instead of a conditional one, which removes the only
place where an attachment policy could be half-present.

**Alternatives rejected.** Keeping `maxFiles: 0 | 1 | 2 | 3` with optional `acceptedTypes` — forces every
reader to handle a policy that exists but says nothing, and reintroduces the conditional-required rule the
`null` form deletes.

### D6 — Attachment bytes are read at selection time, not at submit time

**Decision.** An accepted attachment is stored as
`{ id, name, mimeType, sizeBytes, bytes: Uint8Array }`. The bytes are read once, immediately after the
file passes the five FR-023 checks, and held for the session. Base64 encoding happens later, in
`AttachmentCodecService`, when the payload is built.

**Rationale.** Clarification Q7 and FR-065 require that name, MIME type, size **and bytes** survive
navigation for the whole session. Holding a `File` handle instead would mean the bytes are read at submit
time, when the file may have been moved, renamed or deleted — a failure with no home in the FR-045 state
machine and no respondent-facing message in FR-069. Reading eagerly moves that failure to selection time,
where FR-023 and FR-024 already specify "reject this file, name it, leave the others alone". The worst
case is bounded by the config contract at 3 files × 10 MB = 30 MB per question, which the spec already
accepted when it chose inline base64 (Clarification Q3).

**Alternatives rejected.** Holding the `File`/`Blob` and encoding at submit — one less copy in memory, but
it moves an unavoidable failure into the submission path, where the only honest outcome would be a new
`SubmissionFailureKind` that no contract row describes. See D17 for the residual read-failure case.

### D7 — `ResponseState` carries the validated survey; the session carries the answers

**Decision.** Each `ResponseState` variant carries only the data that is meaningful in that state, and
seven of the eight carry the `Survey` (the eighth, `configuration-error`, carries a `SurveyConfigError`
instead — there is no survey). Answers, attachments, the current page index and the per-question errors do
**not** live in the state variant; they are separate signals on the one `SurveySessionService`.

**Rationale.** The "fail closed" principle is strongest when `loading` and `configuration-error` have no
`Survey` to render _at the type level_ — a template that reads `state.survey` cannot compile in those
branches, so FR-040 and FR-042 are enforced by the compiler. Conversely, putting answers inside the
variant would force every state change to copy the whole answer map and would make "the answers survived
the failed submission" (FR-045, SC-007) a thing the transition code has to remember instead of a thing it
cannot forget.

**Alternatives rejected.** One flat state object with nullable fields — the classic shape, and the one
where `submitted` can be reached with a null receipt. A separate store per concern — splits the one source
of truth the constitution's own rationale argues for.

### D8 — The transition table is a pure value in `models`, not logic in a service

**Decision.** `response-state.model.ts` exports the `ResponseState` union, a frozen
`RESPONSE_STATE_TRANSITIONS: Readonly<Record<ResponseStateKind, readonly ResponseStateKind[]>>` transcribed
from FR-046, and a pure `canTransition(from, to): boolean`. `SurveySessionService` routes **every** state
write through one private `transitionTo()` that asserts `canTransition` and throws on a violation.

**Rationale.** FR-046 is a closed list of twelve legal edges with two terminal states, which is a datum,
not behaviour. As a value it is exhaustively testable — an 8 × 8 matrix test is 64 assertions and no
mocking — and it gives "nothing leaves `submitted`" a single enforcement point instead of a convention.

**Reading of FR-046 that this records.** FR-046 constrains transitions between _distinct_ states. Three
self-transitions are therefore not state changes and are permitted: re-validating from `validation-error`
and still failing (the report is refreshed, the kind is unchanged); navigating while in `editing`; and
navigating while in `submission-error` (the session-level submission error is not a page-level error, so
Previous/Next leave it standing, per FR-045's "Previous and Next still work" and
`contracts/response-submission.md` §6, which clears it on an _edit_). `canTransition(k, k)` returns `true`
for `editing`, `validation-error` and `submission-error`, and `false` for the other five — in particular a
second Submit during `submitting` is refused by the table itself, which is FR-039 and US6 scenario 5.

**Alternatives rejected.** Encoding the transitions as a `switch` inside the service — then the legal-edge
list can only be tested through the service's effects, and the terminal states are implicit.

### D9 — `ready` versus `editing` is the `dirty` signal

**Decision.** The viewer enters `ready` when a valid config has rendered. The first `setAnswer`,
`clearAnswer`, `addFiles` or `removeAttachment` of the session sets `dirty` and transitions to `editing`.
Navigation alone never changes the kind.

**Rationale.** FR-045 distinguishes the two states only by "with the respondent's entered values
retained", so the distinction is literally whether anything has been entered. Deriving it from one boolean
makes it one test, and keeps `ready -> editing` (an edge FR-046 lists) a real edge rather than something
that fires on arrival at page 2.

## 2. Service seams

### D10 — One effectful fetch seam, with the deadline injected

**Decision.** `JsonFetchService.fetchJson(url: string, deadlineMs: number): Promise<JsonFetchResult>` is
the only place in the feature that calls `fetch`. It applies the deadline with an `AbortController` plus
`setTimeout`, and returns a three-way union: `{ outcome: 'json', value: unknown }`,
`{ outcome: 'unreadable' }` (network failure, non-JSON body, or a parse failure — the F01/F17/F18 cases)
and `{ outcome: 'timeout' }` (F19). Durations come from an injected
`SURVEY_TIMEOUTS` token: `{ fetchMs: 10_000, submitMs: 15_000 }`.

**Rationale.** Two callers need identical behaviour — the manifest and a survey config — and the behaviour
is non-obvious: FR-076 says the **body** decides and the HTTP status is not evidence, and FR-075 says an
unanswered request is a failure at 10s. Writing that twice is how the two drift apart. Returning `unknown`
rather than a parsed shape keeps D1's rule that only a validator may narrow. Injecting the durations is
what lets `vitest`'s fake timers prove FR-075 and FR-038 in milliseconds; `AbortSignal.timeout()` was
rejected precisely because fake timers do not patch it.

**Alternatives rejected.** Angular's `HttpClient` — it rejects on a non-2xx status and resolves on a 200
HTML body, which is the exact inversion of FR-076, so every call site would need the status logic undone.
A per-service `fetch` call — two copies of the one rule that fails closed.

### D11 — The manifest is cached as an in-flight promise on a root service

**Decision.** `SurveyCatalogService` is `providedIn: 'root'` and memoises the manifest **promise**, not
the manifest value, in a private field. Every caller awaits the same promise.

**Rationale.** FR-067 requires at most one fetch per visit, reused by the catalog and by every survey
opened in that visit, with a reload fetching again. A root-provided service's lifetime _is_ the visit, and
memoising the promise rather than the value also collapses the race where `/` and a deep link both ask
before either answers. Caching the value would allow two concurrent fetches.

**Alternatives rejected.** A route resolver — couples the manifest to the router, and FR-067's "reused for
every survey opened in that visit" would need the resolver to hold state anyway. `sessionStorage` — the
spec's edge cases forbid writing anything to browser storage.

### D12 — The submission boundary is an abstract class behind a DI token, and it never throws

**Decision.** `SurveyResponseGateway` is an abstract class with one method,
`submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>`, where
`SubmissionResult` is `{ outcome: 'acknowledged'; receipt } | { outcome: 'failed'; failure }`. The
**caller** owns the 15s clock and passes the signal; the gateway must honour it and must never reject —
anything thrown inside an adapter is mapped to `transport-error` by the adapter itself. Three
implementations: simulated (default, always acknowledges), real (`POST /api/survey-responses`), and a
failing one for tests.

**Rationale.** FR-038's deadline is a rule about submission, not about HTTP, so it belongs above the
boundary where it applies to all three adapters identically — that is what makes contract test 7 ("a
boundary that never answers produces `timeout` at 15s") a single test rather than one per adapter. A
result union rather than exceptions means the eight FR-045 state outcomes are exhaustively checkable and
there is no path where an unhandled rejection leaves the viewer in `submitting` — which would be failing
open in the worst place. An abstract class rather than an interface gives a single symbol that is both the
type and the injection token.

**Alternatives rejected.** Throwing on failure — makes `submitting` → `?` depend on a `catch` nobody can
see in the type. An `Observable` return — the operation is exactly one request with no stream and no
retry operator (a retry is a respondent action, not an operator), so a Promise is the smaller surface.

### D13 — The test-only failing adapter is excluded from the app compilation

**Decision.** `src/app/core/services/testing/failing-survey-response.gateway.ts`, with
`"src/app/core/services/testing/**"` added to `tsconfig.app.json`'s `exclude` array.

**Rationale.** `contracts/response-submission.md` §5 says the failing adapter is "reachable only from a
test, never from a running build", and FR-068 explains why: a default that can fail makes gate 3
non-deterministic. A naming convention would not enforce that; excluding the directory from
`tsconfig.app.json` makes an accidental import from application code a build failure. This is not a gate
relaxation — the file is still type-checked by `tsconfig.spec.json` and still counted by coverage, because
tests do import it.

**Alternatives rejected.** An environment flag selecting the adapter — a flag that can be flipped in a
build is exactly what FR-068 is guarding against. Defining the fake inline in each spec — duplicates the
seven failure kinds across every spec that needs one.

### D14 — Pure validators, effectful services, and a single id factory

**Decision.** Everything in `src/app/core/validators` is a pure exported function with no Angular
decorator and no injection: configuration validation, answer validation, page validation, survey-wide
validation, attachment validation, and the FR-069 message catalogue. Everything that touches the clock,
the network, the DOM or randomness is an injectable service in `src/app/core/services`. The two sources of
non-determinism get one seam each: `SURVEY_TIMEOUTS` (D10) and an `IdFactoryService`
(`clientSubmissionId` and attachment ids).

**Rationale.** "Separate the pure from the effectful" is what lets the whole FR-069 catalogue, all
nineteen F-classes, and all five FR-023 checks be tested as functions — no TestBed, no mocks, no fake
timers — which is where the cheap half of the 80% coverage comes from. The id factory has two callers,
which is the smallest-useful-seam threshold; it would not have earned a seam for one.

**Alternatives rejected.** `@Injectable` validators — buys DI nobody needs and makes every validator test
a TestBed test. Calling `crypto.randomUUID()` directly — makes contract test 10 (same
`clientSubmissionId` across retries, different after reopening) assert on a value the test cannot predict.

### D15 — Components receive computed signals; the control-level rules are computed in core

**Decision.** No component contains a validation, transformation or submission expression. The two rules
that look like control behaviour are exposed as data: `SurveySessionService` provides
`isOptionSelectable(questionId, optionValue): Signal<boolean>` for FR-017 and the question's resolved
`maxLength` for FR-015, and templates bind them. Display formatting that FR-071/FR-072 fix — the file-size
string and the accepted-type label list — is a pure function in
`src/app/core/validators/display-format.ts`, called from a component's `computed`, never from a template
expression.

**Rationale.** Principle II forbids logic in components and templates, and the "templates are dumb" lens
says any branch worth testing belongs in core. `5242880 → "5 MB"` (FR-071) and
`["image/png","image/jpeg","application/pdf"] → "PNG, JPEG, PDF"` (FR-072) are both branchy, both asserted
verbatim by acceptance scenarios, and both would be untestable as template pipes without a TestBed.

**Alternatives rejected.** Angular pipes for the formatting — a pipe is testable, but it is reachable only
from a template and so invites the next rule to follow it there; a pure function in `core` is callable from
the payload builder and the error-message catalogue too, and FR-069's attachment row needs exactly that.

## 3. Open points resolved in the fail-closed direction

These three are the only places where the inputs did not already decide the answer. Each is resolved here
so implementation is not blocked, and each is listed in `plan.md` §10 for the Product Owner to confirm or
overrule in the next spec revision. None changes a rule the spec states; each fills a case the spec does
not reach.

### D16 — A question with attachments but no value still reaches the payload

**The gap.** `contracts/response-submission.md` §2 says `answers` holds "one entry per **answered**
question", and an attachment list is a field _on_ an answer entry. The default fixture's `q_evidence` is an
optional `textarea` that accepts up to three files. A respondent who attaches a receipt and types nothing
has, by the letter of §2, no answer entry — so the attachment they were told was accepted would not cross
the boundary. That is silent data loss on the path the spec calls "the highest-risk input path".

**Resolution.** A question is included in `answers` when it has a value **or** at least one accepted
attachment. For an attachment-only question the entry carries the type's empty value — `""` for `textbox`
and `textarea`. This is consistent with the rest of the contract rather than an exception to it: FR-014
enforces `minLength` only on a non-empty answer, so `""` satisfies an optional text question's length
rules, and `contracts/response-submission.md` §2's `value` rule for text is "trimmed string, length within
the question's length rules". No other question type can hold attachments without a value in the default
fixture, but the rule is stated for all six.

**Why this direction.** The alternative readings both fail open: dropping the attachment loses evidence the
respondent was shown as accepted, and inventing a top-level `attachments` block outside `answers` changes
the payload shape that eleven contract tests already pin. Principle III's "no success state until every
attachment has been fully handled" argues against any reading where a submission can be acknowledged with
an accepted attachment left behind.

### D17 — A file that passes all five FR-023 checks and then cannot be read

**The gap.** D6 reads an accepted file's bytes at selection time. FR-023 lists five checks and FR-024 fixes
the shape of a rejection, but neither covers a read that fails after those five pass — rare, but possible
if the file is removed between the picker closing and the read completing.

**Resolution.** Treat it as a sixth and final step in the FR-023 chain: the file is not attached, and it is
reported in the format FR-069's attachment row already fixes — `FILENAME: REASON` — with the reason
`this file could not be read`. The format is contracted; only the reason string is new, and it is the one
respondent-facing string in this plan that the spec does not supply. The other files in the same selection
are unaffected, per FR-024.

**Why this direction.** The fail-closed alternatives are worse: attaching a descriptor whose bytes are
missing would produce a payload that violates `contracts/response-submission.md`'s "decoded `content`
length equals `sizeBytes`", and deferring the discovery to submit time is the failure mode D6 exists to
remove. Silently dropping the file would contradict FR-024's "MUST produce an error naming the file".

### D18 — No `surveyVersion` is added to the payload

**The tension.** The `/speckit-plan` task brief describes the `SurveyResponse` payload as carrying "survey
key, survey version, answers keyed by question id, attachment descriptors, timestamps".
`contracts/response-submission.md` §2 — which is checklisted, Product-Owner-owned, and pinned by thirteen
contract tests — carries `surveyKey`, `clientSubmissionId`, `submittedAt` and an **ordered array** of
answers, with no version field.

**Resolution.** Follow the contract. No `surveyVersion` field is added, for a concrete reason: the survey
JSON contract defines no version field anywhere, so a `surveyVersion` would have no source — the viewer
would have to invent a constant or hash the config, and a payload field whose value the author cannot
control is worse than no field. `surveyKey` identifies the survey and `clientSubmissionId` identifies the
attempt, which is what the version field would have been used for. The brief's "answers keyed by question
id" is satisfied at the layer where keying matters: in-session state is
`ReadonlyMap<QuestionId, Answer>` (D4), and it is flattened to the contract's ordered array only in the
payload builder, because `contracts/response-submission.md` §2 fixes answer order and contract test 1
asserts it.

**If the Product Owner wants versioning**, it is a two-line change to `contracts/survey-json.md` (an
optional `version` string on a survey config, defaulted at validation) plus one field in §2 and one
fixture edit — but it is a contract change and therefore the Product Owner's, not the architect's. Noted
in `plan.md` §10.

## 4. Test-strategy research

### D19 — Four test layers, chosen so the 80% threshold is met by the cheap ones

**Decision.** Coverage is configured over `src/app/**/*.ts` with 80% on statements, branches, functions and
lines (`vitest.config.ts`), so components count toward the threshold — the strategy cannot be
"test core only". Four layers, in cost order:

1. **Pure function tests** (no TestBed): the F01–F19 config/manifest failure classes, the ten FR-069
   message rows with singular/plural substitution, the five FR-023 checks in order, FR-071's four size
   bands, FR-072's label mapping, the 8 × 8 transition matrix, and the payload builder. These are where
   the branch coverage comes from, because this is where the branches are.
2. **Service tests** (TestBed, fake timers, stub `fetch`, injected `SURVEY_TIMEOUTS`): the 10s fetch
   deadline, the 15s submission deadline, manifest-fetched-once, the three-way key resolution, and each of
   the seven `SubmissionFailureKind` mappings.
3. **Component tests** (TestBed, DOM assertions): one per screen and per state — the seven screens SC-009
   names, plus `validation-error` focus placement, `aria-invalid`/`aria-describedby` wiring, the live-region
   politeness levels, and the attachment list rendering from session state rather than the input's value
   (FR-065).
4. **Fixture contract tests** (owned by the Survey Content Author): the valid default fixture plus one
   invalid fixture per F-class, asserted against the validator.

**Rationale.** Branch coverage is the threshold most easily missed, and in this feature almost every branch
is in a validator or a formatter — all of which are pure by D14. Buying the threshold with layer 1 leaves
layer 3 free to assert the things that actually matter in a component (roles, labels, focus, announcements)
instead of being padded for coverage.

### D20 — `axe-core` in jsdom for SC-009, with its limit stated

**Decision.** Add `axe-core` as a devDependency and run it against the seven rendered screens in layer-3
tests, at the two gate widths. State in `plan.md` that jsdom computes no layout, so the contrast
(FR-057) and reflow/target-size (FR-058) criteria are **not** covered by this check and remain the manual
browser smoke test's (gate 5, QA Engineer).

**Rationale.** SC-009 asks for "an automated accessibility check" on seven named screens and the repo has
no a11y tooling today, so something must be added. `axe-core` runs directly against a jsdom document with
no browser driver, which keeps it inside gate 3 rather than requiring a new gate. Claiming it covers
contrast would be the dishonest version — SC-009 itself already warns that one AA criterion must not be
treated as met by SC-009 passing, and the same caution applies to the two criteria jsdom cannot see.

**Alternatives rejected.** `@axe-core/playwright` — real layout and real contrast, but it adds a browser
download and a sixth gate the constitution does not list. No automated check at all — SC-009 would be
unverifiable.

## 5. Decision index

| #   | Decision                                                     | Principle / lens it serves            |
| --- | ------------------------------------------------------------ | ------------------------------------- |
| D1  | Authored JSON stays `unknown`; `models` is normalised only   | I (fail closed), contract-before-impl |
| D2  | `Question` discriminated on `type`; arity in the type        | Make the illegal unrepresentable      |
| D3  | Branded `SurveyKey`/`PageId`/`QuestionId`/`OptionValue`      | Make the illegal unrepresentable      |
| D4  | Unanswered is absence from the map                           | One representation per state          |
| D5  | Attachments off is `null`, `maxFiles` is `1 \| 2 \| 3`       | Make the illegal unrepresentable      |
| D6  | Bytes read at selection time                                 | III (fail closed at the boundary)     |
| D7  | State variants carry only their own data                     | I, II                                 |
| D8  | FR-046 as a pure transition table in `models`                | Separate pure from effectful          |
| D9  | `ready` vs `editing` is the `dirty` signal                   | One source of truth                   |
| D10 | One `JsonFetchService`, deadlines injected                   | Smallest useful seam, I               |
| D11 | Manifest memoised as a promise on a root service             | FR-067, one source of truth           |
| D12 | Gateway: abstract class, result union, caller owns the clock | II (one typed boundary)               |
| D13 | Failing adapter excluded from `tsconfig.app.json`            | IV (deterministic gates)              |
| D14 | Pure validators, effectful services, one id factory          | Separate pure from effectful          |
| D15 | Components get computed signals; formatting is pure          | II (templates are dumb)               |
| D16 | Attachment-only question still reaches the payload           | III — flagged to Product Owner        |
| D17 | Read failure is a sixth FR-023 rejection                     | III — flagged to Product Owner        |
| D18 | No `surveyVersion`; contract wins over the brief             | II — flagged to Product Owner         |
| D19 | Four test layers, threshold bought by the pure layer         | IV                                    |
| D20 | `axe-core` in jsdom, contrast left to the manual gate        | IV, V — limitation stated             |
