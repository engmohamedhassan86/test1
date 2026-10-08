# Contract: survey JSON and manifest

**Feature**: `001-survey-management` · **Status**: Draft · **Owner of this document**: Product Owner
(behaviour). The TypeScript types and validators that realise it are the Solution Architect's to design
in `/speckit-plan` and live in `src/app/core/{models,validators}`.

This contract is the whole agreement between a survey author and the viewer. It is strict and it fails
closed: anything not described here is a validation failure, never a warning and never a repair
(Constitution Principle I).

## 1. The manifest

`public/survey-manifest.json` is the only index of surveys. The viewer reads it to build the catalog at
`/` and to resolve `/surveys/:surveyKey`.

```json
{
  "surveys": [
    {
      "key": "customer-feedback",
      "title": "Customer Feedback",
      "description": "Four short pages about your recent order.",
      "config": "surveys/customer-feedback.json"
    }
  ]
}
```

| Field         | Required | Rule                                                                              |
| ------------- | -------- | --------------------------------------------------------------------------------- |
| `surveys`     | yes      | Array, may be empty. An empty array is valid and renders "no surveys available".  |
| `key`         | yes      | `^[a-z0-9][a-z0-9-]{1,63}$`. Unique across the manifest. Used in the URL.         |
| `title`       | yes      | Non-empty string after trimming, at most 120 characters.                          |
| `description` | no       | String, at most 300 characters.                                                   |
| `config`      | yes      | Relative path under `public/`, ending `.json`. No absolute URL, no `..` segments. |

A manifest that cannot be fetched, is not parseable, or breaks any rule above renders the
configuration-error screen at `/` with no partial list (spec FR-044).

## 2. A survey config

```json
{
  "key": "customer-feedback",
  "title": "Customer Feedback",
  "description": "Four short pages about your recent order.",
  "pages": [
    {
      "id": "about-you",
      "title": "About You",
      "description": "Who we are hearing from.",
      "questions": []
    }
  ]
}
```

| Field         | Required | Rule                                                                       |
| ------------- | -------- | -------------------------------------------------------------------------- |
| `key`         | yes      | Same pattern as a manifest key, and MUST equal the key it is served under. |
| `title`       | yes      | Non-empty after trimming, at most 120 characters.                          |
| `description` | no       | At most 300 characters.                                                    |
| `pages`       | yes      | Array of at least one page, in display order.                              |

### Page

| Field         | Required | Rule                                                                 |
| ------------- | -------- | -------------------------------------------------------------------- |
| `id`          | yes      | `^[a-z0-9][a-z0-9-_]{0,63}$`, unique within the survey.              |
| `title`       | yes      | Non-empty after trimming, at most 120 characters.                    |
| `description` | no       | At most 300 characters.                                              |
| `questions`   | yes      | Array, in display order. May be empty; such a page always validates. |

### Question — fields common to all six types

| Field         | Required | Rule                                                                                 |
| ------------- | -------- | ------------------------------------------------------------------------------------ |
| `id`          | yes      | `^[a-z0-9][a-z0-9-_]{0,63}$`, unique within the survey (not merely within its page). |
| `type`        | yes      | Exactly one of `radio`, `checkbox`, `textbox`, `textarea`, `rating`, `satisfaction`. |
| `title`       | yes      | Non-empty after trimming, at most 300 characters.                                    |
| `description` | no       | At most 500 characters.                                                              |
| `required`    | no       | Boolean. Absent means `false`.                                                       |
| `attachments` | no       | Attachment policy, section 3. Allowed on any type.                                   |

A question carries only the fields listed for its own type. `minLength` on a `radio`, `options` on a
`textarea`, or `scale` on a `checkbox` are all validation failures.

### `radio`

| Field     | Required | Rule                             |
| --------- | -------- | -------------------------------- |
| `options` | yes      | At least 2 options, section 2.1. |

Holds at most one option value. `required` means one option must be selected.

### `checkbox`

| Field           | Required | Rule                                                                                                |
| --------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `options`       | yes      | At least 2 options, section 2.1.                                                                    |
| `minSelections` | no       | Integer, `0 <= minSelections <= maxSelections`. Absent means 0.                                     |
| `maxSelections` | no       | Integer, `max(1, minSelections) <= maxSelections <= options.length`. Absent means `options.length`. |

`minSelections > options.length` is unsatisfiable and therefore a configuration error. When `required` is
true the effective minimum is `max(minSelections, 1)`.

### `textbox` and `textarea`

| Field       | Required | Rule                                                                                                                        |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `minLength` | no       | Integer `>= 0` and `<= maxLength`. Absent means 0.                                                                          |
| `maxLength` | no       | Integer `>= 1`. Absent defaults to 255 for `textbox`, 2000 for `textarea`. Ceiling: 255 for `textbox`, 5000 for `textarea`. |

Lengths are measured on the trimmed value in Unicode code points.

### `rating`

| Field   | Required | Rule                                                                                                          |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `scale` | no       | `{ "min": integer, "max": integer }`. Absent means `{ "min": 1, "max": 5 }`. Requires `0 <= min < max <= 10`. |

Holds one integer in `[min, max]`.

### `satisfaction`

Takes no type-specific field. The scale is fixed at the five points 1 to 5 (very dissatisfied,
dissatisfied, neutral, satisfied, very satisfied). A `scale` field on a `satisfaction` question is a
validation failure.

### 2.1 Option

```json
{ "id": "returning-customer", "label": "A returning customer", "value": "returning-customer" }
```

| Field   | Required | Rule                                                                                                     |
| ------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `id`    | yes      | `^[a-z0-9][a-z0-9-_]{0,63}$`, unique within its question.                                                |
| `label` | yes      | Non-empty after trimming, at most 200 characters.                                                        |
| `value` | yes      | Non-empty string, at most 100 characters, unique within its question. This is what a submission carries. |

## 3. Attachment policy

```json
{
  "maxFiles": 3,
  "acceptedTypes": ["image/png", "image/jpeg", "application/pdf"],
  "maxSizeBytes": 5242880
}
```

| Field           | Required                | Rule                                                                                                             |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `maxFiles`      | yes                     | Integer 0 to 3. `0` means attachments are off for this question and no file control renders.                     |
| `acceptedTypes` | yes when `maxFiles > 0` | Non-empty array of lowercase MIME types (`type/subtype`) or extensions (`.pdf`). No duplicates, no `*` wildcard. |
| `maxSizeBytes`  | yes when `maxFiles > 0` | Integer 1 to 10485760 (10 MB).                                                                                   |

A file is of an accepted type when its reported MIME type is listed, or its lowercased file extension is
listed. Attachments are never required: zero files always satisfies the policy (spec FR-022).

## 4. Failure classes

Every row renders the configuration-error screen and nothing of the survey. The message MUST name the
location and the offending value. These rows are the contract test list.

| #   | Failure                                      | Example message                                                                       |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| F01 | Body is not parseable JSON                   | `customer-feedback: the survey configuration could not be read`                       |
| F02 | Required field missing                       | `pages[0].questions[1].title: required field is missing`                              |
| F03 | Unknown field present                        | `pages[0].questions[0].placeholder: unknown field`                                    |
| F04 | Unknown question type                        | `pages[1].questions[0].type: unknown question type "slider"`                          |
| F05 | Field not valid for its question type        | `pages[0].questions[0].minLength: not valid for a radio question`                     |
| F06 | Wrong JSON type for a field                  | `pages[0].questions[0].required: expected a boolean, got "yes"`                       |
| F07 | Duplicate page id                            | `pages[2].id: duplicate page id "p1"`                                                 |
| F08 | Duplicate question id                        | `pages[1].questions[0].id: duplicate question id "q_name"`                            |
| F09 | Duplicate option id or value                 | `pages[1].questions[1].options[2].value: duplicate option value "a"`                  |
| F10 | Fewer than 2 options on radio/checkbox       | `pages[0].questions[0].options: a radio question needs at least 2 options`            |
| F11 | `pages` empty                                | `pages: a survey needs at least one page`                                             |
| F12 | Unsatisfiable selection rule                 | `pages[1].questions[1].minSelections: 3 selections required but only 2 options exist` |
| F13 | Inverted or out-of-bound numeric rule        | `pages[3].questions[0].maxLength: must be at least minLength (10)`                    |
| F14 | Rating scale out of bounds                   | `pages[1].questions[2].scale.max: must be at most 10`                                 |
| F15 | Attachment policy incomplete or out of range | `pages[2].questions[0].attachments.maxFiles: must be between 0 and 3`                 |
| F16 | Config key does not match the key served     | `key: config declares "feedback" but is served as "customer-feedback"`                |
| F17 | Manifest config path missing or unreadable   | `customer-feedback: the survey configuration could not be loaded`                     |

A key absent from the manifest is **not** in this table. It renders the not-found screen (spec FR-050).

## 5. Default fixture

The default fixture `customer-feedback` MUST exercise every rule above. It has four pages and the
following questions; wording may be refined by the Survey Content Author, structure may not.

| Page             | Question id      | Type           | Required | Rules                                                                                                                                 |
| ---------------- | ---------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| About You        | `q_name`         | `textbox`      | yes      | `minLength: 2`, `maxLength: 80`                                                                                                       |
| About You        | `q_segment`      | `radio`        | yes      | 3 options (new, returning, business)                                                                                                  |
| Your Experience  | `q_satisfaction` | `satisfaction` | yes      | fixed 1-5                                                                                                                             |
| Your Experience  | `q_liked`        | `checkbox`     | yes      | 5 options, `minSelections: 1`, `maxSelections: 3`                                                                                     |
| Your Experience  | `q_delivery`     | `rating`       | no       | `scale: { min: 1, max: 5 }`                                                                                                           |
| Supporting Files | `q_evidence`     | `textarea`     | no       | `maxLength: 1000`, `attachments: { maxFiles: 3, acceptedTypes: ["image/png","image/jpeg","application/pdf"], maxSizeBytes: 5242880 }` |
| Final Thoughts   | `q_comments`     | `textarea`     | no       | `maxLength: 2000`                                                                                                                     |
| Final Thoughts   | `q_recommend`    | `radio`        | yes      | 3 options (yes, no, unsure)                                                                                                           |

Invalid fixtures, one per failure class in section 4, belong beside it for the contract tests.

## 6. Compliance

- **Principle I**: a new survey is a config file plus a manifest entry. Every rule here is checked before
  a single question renders, and any breach renders the error screen and none of the survey.
- **Principle II**: this contract is agreed before implementation; types, validators, fixtures and tests
  are all written against it.
- **Principle III**: this document governs the config. Answer-time rules are in the spec; the submission
  payload is in `response-submission.md`.
