# Contract: response submission

**Feature**: `001-survey-management` · **Status**: Draft · **Owner of this document**: Product Owner
(behaviour). The TypeScript interface and the adapters that realise it are the Solution Architect's to
design in `/speckit-plan` and live in `src/app/core/services`.

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

| Field         | Required | Rule                                                                                                                                    |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `surveyKey`   | yes      | The manifest key of the survey answered.                                                                                                |
| `submittedAt` | yes      | ISO 8601 UTC timestamp taken on the client when Submit was activated.                                                                   |
| `answers`     | yes      | One entry per **answered** question, in survey page then question order. Unanswered optional questions are omitted, not sent as `null`. |

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

**[NEEDS CLARIFICATION: will the real endpoint accept attachment bytes inline as base64 in this JSON
payload, or does it require multipart or a pre-signed upload?]** Resolved in `/speckit-clarify`. The
simulated adapter works with the shape above either way; only the real transport is affected.

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

| `kind`               | Cause                                                        | What the respondent sees                                                                                                                       |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport-error`    | The request never completed (offline, DNS, connection reset) | "We could not reach the server. Your answers are safe — try again."                                                                            |
| `timeout`            | No acknowledgement within 15s                                | "The submission timed out. Your answers are safe — try again."                                                                                 |
| `rejected`           | The receiver refused the payload (HTTP 400/422)              | "The server could not accept this response", plus each `details` reason.                                                                       |
| `not-found`          | The receiver does not know this `surveyKey` (HTTP 404)       | "This survey is no longer accepting responses."                                                                                                |
| `unauthorized`       | The receiver demands a credential (HTTP 401/403)             | **[NEEDS CLARIFICATION: does `POST /api/survey-responses` require an authorization credential, and what should the respondent see on a 401?]** |
| `server-error`       | The receiver failed (HTTP 5xx)                               | "Something went wrong at our end. Your answers are safe — try again."                                                                          |
| `malformed-response` | Acknowledged, but not per section 3                          | "We could not confirm your submission. Your answers are safe — try again."                                                                     |

Every failure MUST name itself in the message the respondent reads, MUST be announced through an
assertive live region, and MUST leave every answer and attachment intact and editable (spec FR-045,
`submission-error`).

**[NEEDS CLARIFICATION: must a retry after a failure carry an idempotency key, or does the receiving
service de-duplicate repeat submissions?]** Until resolved, a retry re-sends the same payload with a
fresh `submittedAt`.

## 5. Adapters

| Adapter              | Default | Behaviour                                                                                                                                                                                 |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulated            | yes     | No network call. Acknowledges after an artificial delay of at most 1s with a generated `submissionId`.                                                                                    |
| Real                 | no      | `POST /api/survey-responses`, `Content-Type: application/json`, body per section 2. HTTP 200/201 with a section 3 body is an acknowledgement; everything else maps to a section 4 `kind`. |
| Failing (tests only) | no      | Returns a chosen failure `kind` so each submission-error path can be tested.                                                                                                              |

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
