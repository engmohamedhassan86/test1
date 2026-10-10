# Contract: survey JSON and manifest

**Feature**: `001-survey-management` · **Status**: Checklisted, no open questions · **Owner of this document**:
Product Owner (behaviour). The TypeScript types and validators that realise it are the Solution Architect's
to design in `/speckit-plan` and live in `src/app/core/{models,validators}`.

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
configuration-error screen at `/` with no partial list (spec FR-044), and renders the same screen at
`/surveys/:surveyKey` — never the not-found screen, because without the manifest no key can be resolved
either way (spec FR-066). The manifest is fetched at most once per visit and reused (spec FR-067).

Two rules govern how a response is judged, and both exist because this application is deployed as a SPA
behind an index fallback:

- **The body decides, not the status.** A manifest or config response is accepted only if its body is
  parseable JSON that satisfies this contract. A body that is not — including the HTML index document that
  the fallback returns for a missing `.json` file under HTTP 200 — is a configuration error whatever the
  status code (spec FR-076).
- **A request that never answers is a failure.** Either fetch is abandoned after 10s and becomes a
  configuration error, so neither screen can wait in `loading` indefinitely (spec FR-075).

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

Holds one integer in `[min, max]`. Presented as one selectable star per integer when `min >= 1`, and as a
labelled row of numeric choices when `min` is 0, since zero stars cannot be told apart from no answer (spec
FR-009). A Clear action returns the question to unanswered (spec FR-060).

### `satisfaction`

Takes no type-specific field. The scale is fixed at the five points 1 to 5, labelled "Very dissatisfied",
"Dissatisfied", "Neutral", "Satisfied" and "Very satisfied", each shown as visible text (spec FR-010). A
`scale` field on a `satisfaction` question is a validation failure. A Clear action returns the question to
unanswered (spec FR-060).

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

`acceptedTypes` holds contract values, which are not what the respondent reads. Each entry is shown as a
display label — a MIME type as its uppercased subtype, an extension as its uppercased extension without
the dot — joined in config order, so the policy above renders `PNG, JPEG, PDF` (spec FR-072). File sizes
are likewise shown by the rule in spec FR-071, which is what turns `5242880` into `5 MB`.

## 4. Failure classes

Every row renders the configuration-error screen and nothing of the survey. The message MUST name the
location and the offending value. These rows are the contract test list.

| #   | Failure                                       | Example message                                                                       |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| F01 | Body is not parseable JSON                    | `customer-feedback: the survey configuration could not be read`                       |
| F02 | Required field missing                        | `pages[0].questions[1].title: required field is missing`                              |
| F03 | Unknown field present                         | `pages[0].questions[0].placeholder: unknown field`                                    |
| F04 | Unknown question type                         | `pages[1].questions[0].type: unknown question type "slider"`                          |
| F05 | Field not valid for its question type         | `pages[0].questions[0].minLength: not valid for a radio question`                     |
| F06 | Wrong JSON type for a field                   | `pages[0].questions[0].required: expected a boolean, got "yes"`                       |
| F07 | Duplicate page id                             | `pages[2].id: duplicate page id "p1"`                                                 |
| F08 | Duplicate question id                         | `pages[1].questions[0].id: duplicate question id "q_name"`                            |
| F09 | Duplicate option id or value                  | `pages[1].questions[1].options[2].value: duplicate option value "a"`                  |
| F10 | Fewer than 2 options on radio/checkbox        | `pages[0].questions[0].options: a radio question needs at least 2 options`            |
| F11 | `pages` empty                                 | `pages: a survey needs at least one page`                                             |
| F12 | Unsatisfiable selection rule                  | `pages[1].questions[1].minSelections: 3 selections required but only 2 options exist` |
| F13 | Inverted or out-of-bound numeric rule         | `pages[3].questions[0].maxLength: must be at least minLength (10)`                    |
| F14 | Rating scale out of bounds                    | `pages[1].questions[2].scale.max: must be at most 10`                                 |
| F15 | Attachment policy incomplete or out of range  | `pages[2].questions[0].attachments.maxFiles: must be between 0 and 3`                 |
| F16 | Config key does not match the key served      | `key: config declares "feedback" but is served as "customer-feedback"`                |
| F17 | Manifest config path missing or unreadable    | `customer-feedback: the survey configuration could not be loaded`                     |
| F18 | Non-JSON body under any status, including 200 | `customer-feedback: the survey configuration could not be read`                       |
| F19 | Manifest or config fetch unanswered after 10s | `customer-feedback: the survey configuration could not be loaded`                     |

A key absent from the manifest is **not** in this table. It renders the not-found screen (spec FR-050).

F18 and F19 carry the same respondent-facing wording as F01 and F17 respectively, because the respondent
can act on neither distinction. They are separate rows because they are separate contract tests: F18 is the
index-fallback case that a status-code check would wave through, and F19 is the hang that no status code
ever arrives for.

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

---

# Part B — TypeScript realisation

**Added by**: Solution Architect, `/speckit-plan`, 2026-10-08. Sections 1–6 above are the Product Owner's
behavioural contract and are unchanged. Sections 7–10 below are the typed surface and the one-to-one
validator rule list that realise them, as Principle II requires before any implementation code exists.
Where the two could ever disagree, sections 1–6 win and this part is the defect.

## 7. The typed domain model

The authored JSON described in sections 1–5 has **no TypeScript type**. It is read as `unknown`, and the
validators in `src/app/core/validators` are the only functions permitted to narrow it. What they produce
is the **normalised** model below: every "absent means X" rule in sections 1–3 has already been applied, so
no consumer re-applies a default and no consumer sees an optional validation field.

Full declarations, imports and rationale are in `../data-model.md`. The six union members, which this
contract names as non-optional, are reproduced here verbatim so that this document stands alone.

```ts
export const QUESTION_TYPES = [
  'radio',
  'checkbox',
  'textbox',
  'textarea',
  'rating',
  'satisfaction',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Nominal string types, minted only by the validators. */
export type SurveyKey = Brand<string, 'SurveyKey'>;
export type PageId = Brand<string, 'PageId'>;
export type QuestionId = Brand<string, 'QuestionId'>;
export type OptionValue = Brand<string, 'OptionValue'>;

export type NonEmpty<T> = readonly [T, ...T[]];
export type AtLeastTwo<T> = readonly [T, T, ...T[]];

export interface SurveyOption {
  readonly id: string;
  readonly label: string;
  readonly value: OptionValue;
}

export type AcceptedFileType = `${string}/${string}` | `.${string}`;

export interface AttachmentPolicy {
  readonly maxFiles: 1 | 2 | 3;
  readonly acceptedTypes: NonEmpty<AcceptedFileType>;
  readonly maxSizeBytes: number;
}

export interface RatingScale {
  readonly min: number;
  readonly max: number;
}

interface QuestionBase {
  readonly id: QuestionId;
  readonly title: string;
  readonly description: string | null;
  readonly required: boolean;
  readonly attachments: AttachmentPolicy | null;
}

export interface RadioQuestion extends QuestionBase {
  readonly type: 'radio';
  readonly options: AtLeastTwo<SurveyOption>;
}

export interface CheckboxQuestion extends QuestionBase {
  readonly type: 'checkbox';
  readonly options: AtLeastTwo<SurveyOption>;
  readonly minSelections: number;
  readonly maxSelections: number;
}

export interface TextboxQuestion extends QuestionBase {
  readonly type: 'textbox';
  readonly minLength: number;
  readonly maxLength: number;
}

export interface TextareaQuestion extends QuestionBase {
  readonly type: 'textarea';
  readonly minLength: number;
  readonly maxLength: number;
}

export interface RatingQuestion extends QuestionBase {
  readonly type: 'rating';
  readonly scale: RatingScale;
}

export interface SatisfactionQuestion extends QuestionBase {
  readonly type: 'satisfaction';
}

export type Question =
  | RadioQuestion
  | CheckboxQuestion
  | TextboxQuestion
  | TextareaQuestion
  | RatingQuestion
  | SatisfactionQuestion;

export interface SurveyPage {
  readonly id: PageId;
  readonly title: string;
  readonly description: string | null;
  readonly questions: readonly Question[];
}

export interface Survey {
  readonly key: SurveyKey;
  readonly title: string;
  readonly description: string | null;
  readonly pages: NonEmpty<SurveyPage>;
}
```

Four properties of this surface are load-bearing, and each replaces a runtime check with a compile-time
one:

- **`type` is the discriminant.** `switch (question.type)` exhausts with no `default` branch, so a
  seventh question type is a build failure rather than a question that silently fails to render. A
  type-specific field exists only on the members it is valid for, so section 2's "`minLength` on a `radio`
  is a validation failure" (F05) is also a compile error for the application.
- **Arity lives in the type.** `AtLeastTwo<SurveyOption>` is F10 and `NonEmpty<SurveyPage>` is F11, proved
  once by the validator and never re-checked.
- **`attachments: AttachmentPolicy | null`.** Both authoring forms of "off" — an absent block and
  `"maxFiles": 0` — normalise to `null`, so `acceptedTypes` and `maxSizeBytes` become unconditionally
  present rather than conditionally required, and a question with a half-written policy is not
  representable.
- **No `undefined` anywhere.** An absent optional is `null`. A field is either present with a value or
  `null`, never a third thing.

## 8. The manifest, typed

```ts
export interface SurveyManifestEntry {
  readonly key: SurveyKey;
  readonly title: string;
  readonly description: string | null;
  readonly config: string;
}

export interface SurveyManifest {
  readonly surveys: readonly SurveyManifestEntry[];
}

/** FR-050 / FR-066: three outcomes, because an unresolvable manifest is never "unknown key". */
export type SurveyKeyResolution =
  | { readonly outcome: 'found'; readonly entry: SurveyManifestEntry }
  | { readonly outcome: 'not-found'; readonly surveyKey: string }
  | { readonly outcome: 'catalog-error'; readonly error: SurveyConfigError };
```

`SurveyManifest.surveys` is a plain `readonly` array, not `NonEmpty`, because section 1 makes an empty
manifest valid. The catalog's own state type (`CatalogState` in `../data-model.md` §4) is what separates
"ready with entries" from "empty", so the empty case is a state and not a special-cased list.

## 9. The validator rule set

Each rule below is one check, in the order given, emitting one `ConfigIssue`. A validator can be built
from this list one-to-one, and a contract test can be written per row. Every row is a **failure**; none is
a warning, none is repaired (Principle I).

```ts
export interface ConfigIssue {
  readonly code: ConfigFailureCode; // 'F01' .. 'F19'
  readonly path: string; // 'pages[1].questions[0].type', or '' for the whole document
  readonly message: string; // author-facing; names the location and the offending value
}

export interface SurveyConfigError {
  readonly scope: 'manifest' | 'survey';
  readonly subject: string; // the survey key, or 'survey-manifest.json'
  readonly issues: NonEmpty<ConfigIssue>;
}

export type SurveyValidation =
  | { readonly outcome: 'valid'; readonly survey: Survey }
  | { readonly outcome: 'invalid'; readonly error: SurveyConfigError };

export function validateSurveyConfig(raw: unknown, servedKey: string): SurveyValidation;
export function validateSurveyManifest(raw: unknown): ManifestValidation;
```

### 9.0 Rules owned by the fetch layer, before the validator sees anything

`JsonFetchService` decides these three; the validator is never called for them.

| Rule | Check                                                                   | Code                                                    | Issue text                                                |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| R00  | The request did not answer within 10s                                   | F19                                                     | `<subject>: the survey configuration could not be loaded` |
| R01  | The request failed at transport level, or answered a non-success status | F17                                                     | `<subject>: the survey configuration could not be loaded` |
| R02  | The body did not parse as JSON                                          | F18 when the status was a success status, otherwise F01 | `<subject>: the survey configuration could not be read`   |

R02 is why F18 and F01 share their wording, as section 4 notes: F18 is the same parse failure reached by
the SPA index fallback answering HTTP 200 with an HTML document, and F19 is the same unreachability as F17
reached by a request that never answers. The codes stay distinct so that each has its own contract test;
the respondent-facing text does not, because the respondent can act on neither distinction.

### 9.1 Document rules

| Rule | Check                                                                              | Code      | Path              |
| ---- | ---------------------------------------------------------------------------------- | --------- | ----------------- |
| R03  | The parsed value is a JSON object, not an array, string, number, boolean or `null` | F01       | `''`              |
| R04  | Only the keys `key`, `title`, `description`, `pages` are present                   | F03       | the offending key |
| R05  | `key`, `title`, `pages` are present                                                | F02       | the missing key   |
| R06  | `key` is a string matching `^[a-z0-9][a-z0-9-]{1,63}$`                             | F06 / F13 | `key`             |
| R07  | `key` equals `servedKey`                                                           | F16       | `key`             |
| R08  | `title` is a string, non-empty after trimming, at most 120 code points             | F06 / F13 | `title`           |
| R09  | `description`, when present, is a string of at most 300 code points                | F06 / F13 | `description`     |
| R10  | `pages` is an array with at least one element                                      | F06 / F11 | `pages`           |

### 9.2 Page rules, for each `pages[i]`

| Rule | Check                                                                  | Code      | Path                   |
| ---- | ---------------------------------------------------------------------- | --------- | ---------------------- |
| R11  | The element is a JSON object                                           | F06       | `pages[i]`             |
| R12  | Only the keys `id`, `title`, `description`, `questions` are present    | F03       | `pages[i].<key>`       |
| R13  | `id`, `title`, `questions` are present                                 | F02       | `pages[i].<key>`       |
| R14  | `id` is a string matching `^[a-z0-9][a-z0-9-_]{0,63}$`                 | F06 / F13 | `pages[i].id`          |
| R15  | `id` has not been seen on an earlier page                              | F07       | `pages[i].id`          |
| R16  | `title` is a string, non-empty after trimming, at most 120 code points | F06 / F13 | `pages[i].title`       |
| R17  | `description`, when present, is a string of at most 300 code points    | F06 / F13 | `pages[i].description` |
| R18  | `questions` is an array — it **may** be empty                          | F06       | `pages[i].questions`   |

### 9.3 Question rules, for each `pages[i].questions[j]`

Paths below are abbreviated `Q` for `pages[i].questions[j]`.

| Rule | Check                                                                                                                                                                                                                                                                                                                         | Code                                                           | Path            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------- |
| R19  | The element is a JSON object                                                                                                                                                                                                                                                                                                  | F06                                                            | `Q`             |
| R20  | `type` is present and is a string                                                                                                                                                                                                                                                                                             | F02 / F06                                                      | `Q.type`        |
| R21  | `type` is one of the six in `QUESTION_TYPES`                                                                                                                                                                                                                                                                                  | F04                                                            | `Q.type`        |
| R22  | Only keys in (common set ∪ the set for this `type`) are present. Common: `id`, `type`, `title`, `description`, `required`, `attachments`. Per type: `radio` → `options`; `checkbox` → `options`, `minSelections`, `maxSelections`; `textbox`/`textarea` → `minLength`, `maxLength`; `rating` → `scale`; `satisfaction` → none | F05 when the key is a contract field on another type, else F03 | `Q.<key>`       |
| R23  | `id` and `title` are present                                                                                                                                                                                                                                                                                                  | F02                                                            | `Q.<key>`       |
| R24  | `id` is a string matching `^[a-z0-9][a-z0-9-_]{0,63}$`                                                                                                                                                                                                                                                                        | F06 / F13                                                      | `Q.id`          |
| R25  | `id` has not been seen on **any** earlier question in the survey, not merely on this page                                                                                                                                                                                                                                     | F08                                                            | `Q.id`          |
| R26  | `title` is a string, non-empty after trimming, at most 300 code points                                                                                                                                                                                                                                                        | F06 / F13                                                      | `Q.title`       |
| R27  | `description`, when present, is a string of at most 500 code points                                                                                                                                                                                                                                                           | F06 / F13                                                      | `Q.description` |
| R28  | `required`, when present, is a boolean                                                                                                                                                                                                                                                                                        | F06                                                            | `Q.required`    |

### 9.4 Type-specific rules

| Rule | Applies to          | Check                                                                                                                   | Code            | Path                     |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------ |
| R29  | `radio`, `checkbox` | `options` is present and is an array                                                                                    | F02 / F06       | `Q.options`              |
| R30  | `radio`, `checkbox` | `options.length >= 2`                                                                                                   | F10             | `Q.options`              |
| R31  | `radio`, `checkbox` | each option is an object whose only keys are `id`, `label`, `value`, all present                                        | F02 / F03 / F06 | `Q.options[k]`           |
| R32  | `radio`, `checkbox` | `id` matches `^[a-z0-9][a-z0-9-_]{0,63}$`; `label` is non-empty trimmed, at most 200; `value` is non-empty, at most 100 | F06 / F13       | `Q.options[k].<key>`     |
| R33  | `radio`, `checkbox` | no `id` repeats and no `value` repeats within the question                                                              | F09             | `Q.options[k].id\|value` |
| R34  | `checkbox`          | `minSelections`, when present, is an integer `>= 0`                                                                     | F06 / F13       | `Q.minSelections`        |
| R35  | `checkbox`          | `maxSelections`, when present, is an integer `>= 1`                                                                     | F06 / F13       | `Q.maxSelections`        |
| R36  | `checkbox`          | `minSelections <= maxSelections` after defaults (`0`, `options.length`)                                                 | F13             | `Q.maxSelections`        |
| R37  | `checkbox`          | `minSelections <= options.length`                                                                                       | F12             | `Q.minSelections`        |
| R38  | `checkbox`          | `maxSelections <= options.length`                                                                                       | F13             | `Q.maxSelections`        |
| R39  | text types          | `minLength`, when present, is an integer `>= 0`                                                                         | F06 / F13       | `Q.minLength`            |
| R40  | text types          | `maxLength`, when present, is an integer `>= 1`                                                                         | F06 / F13       | `Q.maxLength`            |
| R41  | text types          | `maxLength >= minLength` after defaults                                                                                 | F13             | `Q.maxLength`            |
| R42  | text types          | `maxLength <= 255` for `textbox`, `<= 5000` for `textarea`                                                              | F13             | `Q.maxLength`            |
| R43  | `rating`            | `scale`, when present, is an object whose only keys are `min` and `max`, both present integers                          | F02 / F03 / F06 | `Q.scale`                |
| R44  | `rating`            | `0 <= min`, `min < max`, `max <= 10`                                                                                    | F14             | `Q.scale.min\|max`       |
| R45  | `satisfaction`      | no type-specific key is present — `scale` here is F05 by R22                                                            | F05             | `Q.scale`                |

### 9.5 Attachment-policy rules, when `attachments` is present

| Rule | Check                                                                                           | Code      | Path                             |
| ---- | ----------------------------------------------------------------------------------------------- | --------- | -------------------------------- |
| R46  | The value is an object whose only keys are `maxFiles`, `acceptedTypes`, `maxSizeBytes`          | F03       | `Q.attachments.<key>`            |
| R47  | `maxFiles` is present and is an integer in 0–3                                                  | F02 / F15 | `Q.attachments.maxFiles`         |
| R48  | When `maxFiles` is 0, no other key is present; the policy normalises to `null`                  | F15       | `Q.attachments.<key>`            |
| R49  | When `maxFiles > 0`, `acceptedTypes` and `maxSizeBytes` are both present                        | F15       | `Q.attachments.<key>`            |
| R50  | `acceptedTypes` is a non-empty array of lowercase strings, each either `type/subtype` or `.ext` | F15       | `Q.attachments.acceptedTypes[k]` |
| R51  | No entry in `acceptedTypes` repeats, and none contains `*`                                      | F15       | `Q.attachments.acceptedTypes[k]` |
| R52  | `maxSizeBytes` is an integer in 1–10485760                                                      | F15       | `Q.attachments.maxSizeBytes`     |

### 9.6 Manifest rules

`validateSurveyManifest` runs R00–R02 via the fetch layer and then:

| Rule | Check                                                                                   | Code      | Path                     |
| ---- | --------------------------------------------------------------------------------------- | --------- | ------------------------ |
| R53  | The parsed value is a JSON object whose only key is `surveys`                           | F01 / F03 | `''` / `<key>`           |
| R54  | `surveys` is present and is an array — it **may** be empty                              | F02 / F06 | `surveys`                |
| R55  | Each entry is an object whose only keys are `key`, `title`, `description`, `config`     | F03       | `surveys[i].<key>`       |
| R56  | `key`, `title`, `config` are present                                                    | F02       | `surveys[i].<key>`       |
| R57  | `key` matches `^[a-z0-9][a-z0-9-]{1,63}$`                                               | F06 / F13 | `surveys[i].key`         |
| R58  | `key` has not been seen on an earlier entry                                             | F07       | `surveys[i].key`         |
| R59  | `title` is a string, non-empty after trimming, at most 120 code points                  | F06 / F13 | `surveys[i].title`       |
| R60  | `description`, when present, is a string of at most 300 code points                     | F06 / F13 | `surveys[i].description` |
| R61  | `config` is a string ending `.json`, with no scheme, no leading `/` and no `..` segment | F13       | `surveys[i].config`      |

### 9.7 Ordering, and how many issues a failure reports

The validator descends in the order above and collects every issue it can determine **without guessing**.
A structural failure stops it descending into the thing that failed: R03 or R53 yields exactly one issue
and no field is examined, and an element that fails R11, R19 or R55 is not descended into. Sibling
elements are still checked, so a config with two bad questions reports both. This is what lets US5
scenario 1 assert exactly one configuration-error screen while FR-041 still names every actionable
location.

## 10. Worked examples

### 10.1 A valid config

Parses, satisfies R03–R52, and normalises as shown.

```json
{
  "key": "mini-pulse",
  "title": "Mini Pulse",
  "description": "Two questions about today.",
  "pages": [
    {
      "id": "p1",
      "title": "Today",
      "questions": [
        {
          "id": "q_mood",
          "type": "satisfaction",
          "title": "How was today?",
          "required": true
        },
        {
          "id": "q_why",
          "type": "textarea",
          "title": "Anything to add?",
          "description": "Optional.",
          "maxLength": 500,
          "attachments": {
            "maxFiles": 2,
            "acceptedTypes": ["image/png", ".pdf"],
            "maxSizeBytes": 1048576
          }
        }
      ]
    }
  ]
}
```

Normalised to:

```ts
const survey: Survey = {
  key: 'mini-pulse' as SurveyKey,
  title: 'Mini Pulse',
  description: 'Two questions about today.',
  pages: [
    {
      id: 'p1' as PageId,
      title: 'Today',
      description: null, // absent -> null
      questions: [
        {
          id: 'q_mood' as QuestionId,
          type: 'satisfaction',
          title: 'How was today?',
          description: null,
          required: true,
          attachments: null, // absent -> null
        },
        {
          id: 'q_why' as QuestionId,
          type: 'textarea',
          title: 'Anything to add?',
          description: 'Optional.',
          required: false, // absent -> false
          minLength: 0, // absent -> 0
          maxLength: 500,
          attachments: {
            maxFiles: 2,
            acceptedTypes: ['image/png', '.pdf'],
            maxSizeBytes: 1048576,
          },
        },
      ],
    },
  ],
};
```

The respondent sees: "Mini Pulse", the description above the page title, page title "Today", "Page 1 of 1",
a disabled Previous, and Submit rather than Next (FR-033, and the single-page edge case). `q_why` renders a
file control accepting `PNG, PDF` (FR-072) at up to `1 MB` each (FR-071).

### 10.2 Invalid — an unknown field (F03)

```json
{
  "key": "mini-pulse",
  "title": "Mini Pulse",
  "pages": [
    {
      "id": "p1",
      "title": "Today",
      "questions": [
        {
          "id": "q_name",
          "type": "textbox",
          "title": "Your name",
          "placeholder": "Dana"
        }
      ]
    }
  ]
}
```

Fails **R22**. Exactly one issue:

```ts
{
  code: 'F03',
  path: 'pages[0].questions[0].placeholder',
  message: 'pages[0].questions[0].placeholder: unknown field',
}
```

The configuration-error screen renders with that message and a link to `/`. No page title, no question and
no navigation control is in the DOM (FR-040) — this is US5 scenario 3, and it is why unknown fields are
failures rather than warnings: a `placeholder` the viewer ignored would look to the author like a feature
that does not work.

### 10.3 Invalid — an unknown question type (F04)

The same config with `"type": "slider"` on `pages[1].questions[0]` fails **R21**:

```ts
{
  code: 'F04',
  path: 'pages[1].questions[0].type',
  message: 'pages[1].questions[0].type: unknown question type "slider"',
}
```

R21 runs before R22, so the type is rejected without the validator first deciding which field set applies
— there is no field set for `slider`. This is US5 scenario 2, whose asserted text this message is.

### 10.4 Invalid — a duplicate page id (F07)

```json
{
  "key": "mini-pulse",
  "title": "Mini Pulse",
  "pages": [
    { "id": "p1", "title": "One", "questions": [] },
    { "id": "p1", "title": "Two", "questions": [] }
  ]
}
```

Fails **R15** on the second page:

```ts
{
  code: 'F07',
  path: 'pages[1].id',
  message: 'pages[1].id: duplicate page id "p1"',
}
```

The path names the **second** occurrence, because the first was legal when it was read. US5 scenario 4.

### 10.5 Invalid — an unsatisfiable selection rule (F12)

```json
{
  "id": "q_liked",
  "type": "checkbox",
  "title": "What did you like?",
  "minSelections": 3,
  "options": [
    { "id": "a", "label": "Delivery", "value": "delivery" },
    { "id": "b", "label": "Support", "value": "support" }
  ]
}
```

Fails **R37** at `pages[1].questions[1]`:

```ts
{
  code: 'F12',
  path: 'pages[1].questions[1].minSelections',
  message: 'pages[1].questions[1].minSelections: 3 selections required but only 2 options exist',
}
```

Note that R36 passes here — `minSelections: 3` is not greater than the defaulted
`maxSelections: options.length = 2`… it is, so R36 fails first and reports F13 at `maxSelections`. The
rule order therefore matters, and it is fixed: **R36 before R37**, so the reported issue for this config is
R36's F13 and R37 exists for the case where `maxSelections` was authored explicitly at or above
`minSelections`. The contract test for F12 must author `maxSelections: 3` alongside `minSelections: 3` with
two options. US5 scenario 5 asserts only that validation fails naming the question and the unsatisfiable
rule, which both orderings satisfy.

### 10.6 Invalid — a field on the wrong type (F05)

```json
{ "id": "q_segment", "type": "radio", "title": "You are…", "minLength": 2, "options": [] }
```

Fails **R22** before R29/R30 are reached, because the key set is checked before the per-type values:

```ts
{
  code: 'F05',
  path: 'pages[0].questions[0].minLength',
  message: 'pages[0].questions[0].minLength: not valid for a radio question',
}
```

`minLength` is a contract field — it is valid on `textbox` and `textarea` — so R22 emits F05 rather than
F03. A key that appears nowhere in the contract, like `placeholder`, is F03 (§10.2). That distinction is
what makes the message actionable: F05 tells the author the field exists but is on the wrong question,
F03 tells them it does not exist at all.
