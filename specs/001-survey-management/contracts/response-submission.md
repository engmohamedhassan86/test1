# Contract: response submission

**Feature**: `001-survey-management` · **Status**: Checklisted, no open questions · **Owner of this document**:
Product Owner (behaviour). The TypeScript interface and the adapters that realise it are the Solution
Architect's to design in `/speckit-plan` and live in `src/app/core/services`.

A completed survey leaves the application through exactly one boundary. Everything above that boundary —
the survey model, validation, navigation, the response states — is unaware of the transport, so swapping
the simulated adapter for the real endpoint changes no survey logic (Constitution Principle II).

## 1. The boundary

One operation: take a submission payload, return an acknowledgement or a failure. Nothing else crosses.

- The caller MUST have validated every page immediately beforehand (spec FR-034) and re-checked every
  attachment (spec FR-027). The boundary is not the place where survey rules are discovered.
- The caller MUST treat anything other than a well-formed acknowledgement as a failure (spec FR-037).
- The caller MUST abandon the attempt as a failure after 15s without an acknowledgement (spec FR-038).
- The boundary MUST be callable at most once at a time per session (spec FR-039).

## 2. Payload

```json
{
  "surveyKey": "customer-feedback",
  "clientSubmissionId": "7f3c1a9e-5d42-4b18-9f06-2a1c84b6e0d3",
  "submittedAt": "2026-10-08T10:30:00.000Z",
  "answers": [
    { "questionId": "q_name", "type": "textbox", "value": "Dana" },
    { "questionId": "q_segment", "type": "radio", "value": "returning-customer" },
    { "questionId": "q_satisfaction", "type": "satisfaction", "value": 4 },
    { "questionId": "q_liked", "type": "checkbox", "value": ["delivery", "support"] },
    {
      "questionId": "q_evidence",
      "type": "textarea",
      "value": "The parcel arrived opened.",
      "attachments": [
        {
          "name": "receipt.pdf",
          "mimeType": "application/pdf",
          "sizeBytes": 1048576,
          "content": "JVBERi0xLjQKJc..."
        }
      ]
    }
  ]
}
```

| Field                | Required | Rule                                                                                                                                                                                                                                                                                        |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `surveyKey`          | yes      | The manifest key of the survey answered.                                                                                                                                                                                                                                                    |
| `clientSubmissionId` | yes      | Non-empty opaque string, at most 64 characters. Generated once per survey session when the first submission starts — on first entry to `submitting`, not on a Submit that validation blocks; identical on every retry of that session; different for a freshly opened survey (spec FR-061). |
| `submittedAt`        | yes      | ISO 8601 UTC timestamp taken on the client when this attempt's Submit was activated. Refreshed per attempt, including a retry.                                                                                                                                                              |
| `answers`            | yes      | One entry per **answered** question, in survey page then question order. Unanswered optional questions are omitted, not sent as `null`.                                                                                                                                                     |

`clientSubmissionId` exists because after a `timeout` the client cannot know whether the first attempt
landed. The receiver is expected to treat a repeat of a `clientSubmissionId` it has already accepted as the
same response and to re-acknowledge it rather than record a second one. The real adapter MUST also send the
value as an `Idempotency-Key` request header (spec FR-061).

### Answer entry

| Field         | Required | Rule                                                                                           |
| ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `questionId`  | yes      | A question id from that survey's config. No duplicates within `answers`.                       |
| `type`        | yes      | The question's type, carried so a reader needs no second lookup to interpret `value`.          |
| `value`       | yes      | Shape fixed by `type`, below.                                                                  |
| `attachments` | no       | Present only when the question accepted at least one file. Never `null`, never an empty array. |

| `type`         | `value` shape                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `radio`        | One option `value` string from that question's options.                                                                       |
| `checkbox`     | Array of option `value` strings, no duplicates, in the question's option order, length within the question's selection rules. |
| `textbox`      | Trimmed string, length within the question's length rules.                                                                    |
| `textarea`     | Trimmed string, length within the question's length rules.                                                                    |
| `rating`       | Integer within the question's `scale`.                                                                                        |
| `satisfaction` | Integer 1 to 5.                                                                                                               |

### Attachment entry

| Field       | Required | Rule                                                                 |
| ----------- | -------- | -------------------------------------------------------------------- |
| `name`      | yes      | The file name as selected, at most 255 characters.                   |
| `mimeType`  | yes      | Accepted by the question's `acceptedTypes`.                          |
| `sizeBytes` | yes      | Integer `> 0` and `<= maxSizeBytes` for that question.               |
| `content`   | yes      | The file's bytes, base64 encoded, matching `sizeBytes` once decoded. |

**Bytes travel inline** (spec clarification Q3, FR-063). Attachment content crosses the boundary base64
encoded inside this one JSON body — not as multipart, and not via a pre-signed upload. The worst case is
bounded by the config contract at `maxFiles` 3 × `maxSizeBytes` 10 MB, and keeping the bytes inline keeps a
submission to exactly one operation across one boundary (Constitution Principle II). The client enforces no
total payload ceiling of its own; a receiver's own limit arrives as `rejected` or `server-error`. Should a
real receiver later require multipart or a pre-signed upload, that is a change inside the real adapter and
changes nothing above the boundary — which is the point of having one.

## 3. Acknowledgement

```json
{ "submissionId": "sub_20261008_0001", "receivedAt": "2026-10-08T10:30:01.411Z" }
```

| Field          | Required | Rule                                                          |
| -------------- | -------- | ------------------------------------------------------------- |
| `submissionId` | yes      | Non-empty string. Shown to the respondent as their reference. |
| `receivedAt`   | yes      | ISO 8601 UTC timestamp from the receiver.                     |

An acknowledgement missing either field is a failure of kind `malformed-response`, not a success. This is
the only thing that may produce the `submitted` state.

## 4. Failure

```json
{
  "kind": "rejected",
  "message": "The response was rejected.",
  "details": [{ "questionId": "q_liked", "reason": "Select at least 1 option" }]
}
```

| `kind`               | Cause                                                        | What the respondent sees                                                               |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `transport-error`    | The request never completed (offline, DNS, connection reset) | "We could not reach the server. Your answers are safe — try again."                    |
| `timeout`            | No acknowledgement within 15s                                | "The submission timed out. Your answers are safe — try again."                         |
| `rejected`           | The receiver refused the payload (HTTP 400/422)              | "The server could not accept this response", plus each `details` reason.               |
| `not-found`          | The receiver does not know this `surveyKey` (HTTP 404)       | "This survey is no longer accepting responses."                                        |
| `unauthorized`       | The receiver demands a credential (HTTP 401/403)             | "This survey is not accepting responses right now. Your answers are safe — try again." |
| `server-error`       | The receiver failed (HTTP 5xx)                               | "Something went wrong at our end. Your answers are safe — try again."                  |
| `malformed-response` | Acknowledged, but not per section 3                          | "We could not confirm your submission. Your answers are safe — try again."             |

Every failure MUST name itself in the message the respondent reads, MUST be announced through an
assertive live region, and MUST leave every answer and attachment intact and editable (spec FR-045,
`submission-error`).

**The endpoint is anonymous** (spec clarification Q1, FR-062). Responses carry no respondent identity, so
the real adapter sends no `Authorization` header and relies on no session cookie. `unauthorized` therefore
describes a deployment that is misconfigured or has been closed to responses, not a respondent who needs to
sign in: it MUST fail closed to `submission-error` rather than be mistaken for an acknowledgement, and the
viewer MUST NOT present a credential prompt or a login screen. Adding authentication is a separate feature.

**A retry re-sends the same `clientSubmissionId`** (spec clarification Q2, FR-061) with a fresh
`submittedAt`. The client does not rely on the receiver de-duplicating; it supplies the key that makes
de-duplication possible.

## 5. Adapters

| Adapter              | Default | Behaviour                                                                                                                                                                                                                                                       |
| -------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulated            | yes     | No network call. **Always** acknowledges, after an artificial delay of at most 1s, with a generated `submissionId`. It never fails and has no failure-injection switch, so gate 3 stays deterministic (spec FR-068).                                            |
| Real                 | no      | `POST /api/survey-responses`, `Content-Type: application/json`, `Idempotency-Key: <clientSubmissionId>`, no authorization credential, body per section 2. HTTP 200/201 with a section 3 body is an acknowledgement; everything else maps to a section 4 `kind`. |
| Failing (tests only) | no      | Returns a chosen failure `kind`, or never answers, so each submission-error path can be tested. Reachable only from a test, never from a running build.                                                                                                         |

Selecting an adapter MUST NOT require a change to survey, validation or navigation behaviour.

## 6. State consequences

These restate spec FR-045 and FR-046 as they touch this boundary; the spec is authoritative if they ever
disagree.

| Transition                       | Trigger                        | Answers                                   |
| -------------------------------- | ------------------------------ | ----------------------------------------- |
| `editing -> validation-error`    | Submit with any page invalid   | Retained. No call is made.                |
| `editing -> submitting`          | Submit with every page valid   | Retained and locked against editing.      |
| `submitting -> submitted`        | Section 3 acknowledgement      | Discarded after the confirmation renders. |
| `submitting -> submission-error` | Any section 4 failure          | Retained in full, editable again.         |
| `submission-error -> submitting` | "Try again"                    | Retained; re-validated before the call.   |
| `submission-error -> editing`    | The respondent edits an answer | Retained; the stale error is cleared.     |

No other transition touches this boundary. In particular, nothing leaves `submitted`, and `submitted` is
reachable only from `submitting`.

## 7. Contract tests

The Survey Content Author and QA Engineer own these; they are the acceptance list for this document.

1. A valid payload for the default fixture matches section 2 exactly, including answer order and the
   omission of unanswered optional questions.
2. Each `value` shape per question type, including a checkbox answer in option order.
3. An attachment entry whose decoded `content` length equals `sizeBytes`.
4. A section 3 acknowledgement produces `submitted` and surfaces `submissionId` to the respondent.
5. An acknowledgement missing `submissionId` produces `submission-error`, not `submitted`.
6. Each failure `kind` in section 4 produces `submission-error` with its own message, answers intact.
7. A boundary that never answers produces `timeout` at 15s.
8. A second Submit during `submitting` starts no second call.
9. Submit with an invalid page makes no call at all.
10. A retry after any failure carries the same `clientSubmissionId` as the attempt it retries, and a later
    `submittedAt`; a survey reopened from `/` produces a different `clientSubmissionId`.
11. The real adapter sends `Idempotency-Key` equal to the payload's `clientSubmissionId`, and sends no
    `Authorization` header.
12. An HTTP 401 produces `submission-error` with the `unauthorized` message and no credential prompt.
13. A Submit blocked by FR-034 generates no `clientSubmissionId`; the value first sent is the one generated
    at the first entry to `submitting`, so a respondent bounced once and then successful produces exactly
    one value.

---

# Part B — TypeScript realisation

**Added by**: Solution Architect, `/speckit-plan`, 2026-10-08. Sections 1–7 above are the Product Owner's
behavioural contract and are unchanged. Sections 8–12 below are the typed boundary that realises them,
written before any implementation code exists (Principle II). Where the two could ever disagree,
sections 1–7 win and this part is the defect.

## 8. The payload type

```ts
import type { ClientSubmissionId, NonEmpty, QuestionId, SurveyKey } from '../models/branded';
import type { QuestionType } from '../models/survey.model';

/** Section 2, attachment entry. */
export interface AttachmentDescriptor {
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  /** Base64. Decoded length equals `sizeBytes` — contract test 3. */
  readonly content: string;
}

/** Section 2, answer entry. */
export interface AnswerEntry {
  readonly questionId: QuestionId;
  readonly type: QuestionType;
  readonly value: string | number | readonly string[];
  /** Key **absent** when the question accepted no file. Never `null`, never `[]`. */
  readonly attachments?: NonEmpty<AttachmentDescriptor>;
}

/** Section 2. The whole payload. Nothing else crosses the boundary. */
export interface SurveyResponse {
  readonly surveyKey: SurveyKey;
  readonly clientSubmissionId: ClientSubmissionId;
  /** ISO 8601 UTC, taken at the start of **this** attempt. Refreshed on every retry. */
  readonly submittedAt: string;
  /** Survey page order, then question order within the page. */
  readonly answers: readonly AnswerEntry[];
}
```

Four notes on the shape, each of which is a decision rather than a transcription:

- **`answers` is an ordered array, not a map.** Section 2 fixes the order and contract test 1 asserts it.
  The in-session representation _is_ keyed — `ReadonlyMap<QuestionId, Answer>` on
  `SurveySessionService` — and the payload builder is the single function that flattens one into the
  other. Keying the wire form as well would make the contract's ordering requirement unexpressible.
- **`value` is the widest of the three JSON shapes, not a discriminated union.** This is the wire type: it
  is serialised, never switched on. The typed, switched-on form is `Answer` in `../data-model.md` §6. A
  second discriminated union here would duplicate `Answer` with no second reader, and the per-type
  `value` shapes section 2 tabulates are enforced by the builder and pinned by contract test 2.
- **`attachments` is the one optional field in the whole model**, because section 2 requires the key to be
  absent rather than `null` or `[]`. `NonEmpty<AttachmentDescriptor>` makes the empty array
  unrepresentable, so "never `null`, never an empty array" cannot be violated by construction.
- **There is no `surveyVersion`.** The `/speckit-plan` brief named one. `contracts/survey-json.md` defines
  no version field on a survey config, so the viewer would have to invent the value, and a payload field
  whose value the author cannot control is worse than no field at all: a receiver would read it as
  meaningful. `surveyKey` identifies the survey; `clientSubmissionId` identifies the attempt, which is
  what a version would have been used for. Adding one is a change to `contracts/survey-json.md` §2 first
  and to this section second, and it is the Product Owner's call — recorded in `../research.md` D18 and
  `../plan.md` §10.

### 8.1 A question with attachments but no value

Section 2 says `answers` holds one entry per **answered** question, and an attachment list is a field on
an answer entry. The default fixture's `q_evidence` is an optional `textarea` that accepts up to three
files, so a respondent who attaches a receipt and types nothing would, by the letter of section 2, produce
no entry — and the attachment they were told was accepted would never cross the boundary.

**Resolution** (Solution Architect, `../research.md` D16; flagged to the Product Owner in `../plan.md`
§10): a question is included in `answers` when it has a value **or** at least one accepted attachment. An
attachment-only question carries the type's empty value — `""` for `textbox` and `textarea`. This is
consistent with the rest of the contract rather than an exception: FR-014 enforces `minLength` only on a
non-empty answer, so `""` satisfies an optional text question's length rules, and section 2's text `value`
rule is "trimmed string, length within the question's length rules".

The alternative readings both fail open — dropping the file loses evidence the respondent was shown as
accepted, and a top-level `attachments` block outside `answers` changes a payload shape that eleven
contract tests already pin. Principle III's "no success state may be shown until every attachment has been
fully handled" rules out any reading where a submission is acknowledged with an accepted attachment left
behind.

## 9. The gateway

```ts
/** Section 3. The only thing that may produce the `submitted` state. */
export interface SubmissionReceipt {
  readonly submissionId: string;
  readonly receivedAt: string;
}

/** Section 4. */
export type SubmissionFailureKind =
  | 'transport-error'
  | 'timeout'
  | 'rejected'
  | 'not-found'
  | 'unauthorized'
  | 'server-error'
  | 'malformed-response';

export interface SubmissionFailureDetail {
  readonly questionId: QuestionId;
  readonly reason: string;
}

export interface SubmissionFailure {
  readonly kind: SubmissionFailureKind;
  /** Respondent-facing, fixed per `kind` by section 4. Not composed at the call site. */
  readonly message: string;
  /** Empty unless `kind` is `rejected`. */
  readonly details: readonly SubmissionFailureDetail[];
}

export type SubmissionResult =
  | { readonly outcome: 'acknowledged'; readonly receipt: SubmissionReceipt }
  | { readonly outcome: 'failed'; readonly failure: SubmissionFailure };

/**
 * The one typed boundary a submission crosses (Principle II). Everything above it — the
 * survey model, validation, navigation, the response states — is unaware of transport.
 *
 * An abstract class rather than an interface, so that one symbol is both the type and the
 * Angular injection token.
 */
export abstract class SurveyResponseGateway {
  abstract submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>;
}
```

Three obligations on every implementation, which together are what make the eight response states
exhaustive:

| Obligation                         | Why                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **It resolves; it never rejects.** | A rejected promise is a path the type does not show, and the state it would leave behind is `submitting` — failing open at the worst moment. An adapter catches its own throw and maps it, normally to `transport-error`.                                                                       |
| **The caller owns the 15s clock.** | Section 1's deadline is a rule about submission, not about HTTP, so it applies identically to all three adapters. `SurveySessionService` starts an `AbortController`, races it against `submit`, and reports `timeout` itself. That makes contract test 7 one test rather than one per adapter. |
| **It honours `signal`.**           | An adapter that ignores the abort leaves a request in flight after the viewer has moved to `submission-error`, so a late acknowledgement could race a retry.                                                                                                                                    |

The 15s duration is not a literal inside the service: it comes from the injected
`SURVEY_TIMEOUTS` token (`{ fetchMs: 10_000, submitMs: 15_000 }`), which is what lets contract test 7 run
under `vitest` fake timers in milliseconds.

### 9.1 Recognising an acknowledgement

```ts
/** Section 3: both fields present and non-empty, or it is not an acknowledgement. */
export function isSubmissionReceipt(raw: unknown): raw is SubmissionReceipt;
```

A pure type guard, in `src/app/core/validators`. An adapter that receives a 200 whose body fails this
guard returns `malformed-response`, never `acknowledged` (section 3, FR-037). This is contract test 5, and
it is the only reason the `submitted` state can be trusted.

## 10. The simulated adapter (default)

```ts
@Injectable()
export class SimulatedSurveyResponseGateway extends SurveyResponseGateway {
  override submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>;
}
```

| Property       | Behaviour                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Network        | None. No `fetch`, no URL, no header.                                                                                              |
| Latency        | A single `setTimeout` of **400 ms** — a fixed value at most the 1s FR-036 allows, not a random one, so gate 3 is deterministic.   |
| Outcome        | **Always** `{ outcome: 'acknowledged', … }`. There is no failure branch and no injection switch (FR-068).                         |
| `submissionId` | `sim_` followed by the `IdFactoryService` value, so a test can predict it.                                                        |
| `receivedAt`   | `new Date().toISOString()` at the moment the timer fires.                                                                         |
| Abort          | If `signal` aborts first, the timer is cleared and the promise resolves `{ outcome: 'failed', failure: { kind: 'timeout', … } }`. |

**How it can fail:** only by being aborted by the caller's deadline. It has no other failure path, by
design — FR-068 makes the determinism of gate 3 the reason. Every other failure path is exercised by the
failing adapter in §12, which is reachable only from a test.

A fixed 400 ms is a deliberate choice over a random delay: US1 scenario 3 asserts the confirmation within
2s, and a random latency would make that assertion flaky for no benefit. It is still long enough that the
`submitting` state is observable, which is what US6 scenario 5 ("a second Submit starts no second
submission") needs.

## 11. The real adapter

```ts
@Injectable()
export class HttpSurveyResponseGateway extends SurveyResponseGateway {
  override submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>;
}
```

### 11.1 Request

```http
POST /api/survey-responses HTTP/1.1
Content-Type: application/json
Accept: application/json
Idempotency-Key: 7f3c1a9e-5d42-4b18-9f06-2a1c84b6e0d3
```

The body is exactly the §8 `SurveyResponse`, `JSON.stringify`d, with no envelope and no extra field. There
is **no `Authorization` header** and no credential of any kind: the request is sent with
`credentials: 'omit'`, so no cookie is attached either (section 4, FR-062). `Idempotency-Key` equals
`response.clientSubmissionId` (contract test 11).

### 11.2 Success response

HTTP 200 or 201 with a JSON body satisfying §9.1:

```json
{ "submissionId": "sub_20261008_0001", "receivedAt": "2026-10-08T10:30:01.411Z" }
```

→ `{ outcome: 'acknowledged', receipt: { submissionId, receivedAt } }`.

A 200 or 201 whose body does **not** satisfy §9.1 — including an empty body, an HTML body from an index
fallback, or a body missing `submissionId` — is `malformed-response`. The status alone never produces an
acknowledgement; the body decides, exactly as it does for a config (`contracts/survey-json.md` §9.0 R02).

### 11.3 Error responses

Complete mapping. Every row is a contract test (contract test 6).

| Receiver's answer                     | `kind`               | Respondent-facing `message` (section 4)                                                |
| ------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `fetch` threw — offline, DNS, reset   | `transport-error`    | "We could not reach the server. Your answers are safe — try again."                    |
| Caller's `AbortSignal` fired at 15s   | `timeout`            | "The submission timed out. Your answers are safe — try again."                         |
| 400, 422                              | `rejected`           | "The server could not accept this response", plus each `details` reason.               |
| 401, 403                              | `unauthorized`       | "This survey is not accepting responses right now. Your answers are safe — try again." |
| 404                                   | `not-found`          | "This survey is no longer accepting responses."                                        |
| 500–599                               | `server-error`       | "Something went wrong at our end. Your answers are safe — try again."                  |
| 200/201 with a body failing §9.1      | `malformed-response` | "We could not confirm your submission. Your answers are safe — try again."             |
| Any other status (e.g. 301, 418, 429) | `server-error`       | "Something went wrong at our end. Your answers are safe — try again."                  |

The last row is the fail-closed default: an unmapped status is a failure, never an acknowledgement. `429`
is listed there deliberately — the viewer has no retry-after behaviour in this feature, and a respondent
pressing "Try again" is the retry.

For `rejected`, `details` is read from the body's `details` array when it is present and well-formed, and
is `[]` otherwise; a malformed `details` downgrades to an empty list rather than turning the whole
response into `malformed-response`, because the failure is already correctly classified and the detail is
decoration. A `details` entry whose `questionId` is not a question of the open survey is dropped.

Nothing here maps a non-2xx status to an acknowledgement, and nothing maps a 401 or 403 to a credential
prompt (FR-062, contract test 12) — `unauthorized` is a `submission-error` like any other.

## 12. The failing adapter (tests only)

```ts
export class FailingSurveyResponseGateway extends SurveyResponseGateway {
  constructor(private readonly behaviour: { kind: SubmissionFailureKind } | 'never-answers');
  override submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>;
}
```

Lives at `src/app/core/services/testing/failing-survey-response.gateway.ts`, and
`"src/app/core/services/testing/**"` is added to `tsconfig.app.json`'s `exclude` array. An import from
application code is therefore a **build failure**, which is how "reachable only from a test, never from a
running build" (section 5, FR-068) is enforced rather than merely intended. The file is still type-checked
by `tsconfig.spec.json` and still counted by coverage, because the tests import it — no gate is relaxed.

`'never-answers'` returns a promise that settles only when `signal` aborts, which is how contract test 7
proves the 15s deadline is the caller's and not the adapter's.

## 13. Two rules restated in typed terms

Both already appear in sections 1 to 6; they are repeated here because they are the two the types are
shaped to enforce.

**No success state before acknowledgement.** `submitted` is the only `ResponseState` variant carrying a
`SubmissionReceipt`, a `SubmissionReceipt` is only constructible from a body that passes `isSubmissionReceipt`
(§9.1), and `RESPONSE_STATE_TRANSITIONS` gives `submitted` exactly one incoming edge, from `submitting`
(`../data-model.md` §8.1). So reaching the confirmation screen without an acknowledgement is not a bug that
needs a test to catch — it is three separate compile-time and assertion-time impossibilities. SC-006 is the
test that proves it anyway.

**A failed submission preserves the answers.** Answers and attachments are **not** carried in any
`ResponseState` variant; they are separate signals on `SurveySessionService`
(`../data-model.md` §8). `submitting -> submission-error` therefore replaces one state value and touches
nothing else, so there is no code path on which answers could be lost — the preservation is structural, not
remembered. The only place answers are deliberately discarded is on entry to `submitted`, which FR-045
requires. SC-007 and contract test 6 prove it.
