# Data Model: Dynamic Survey Viewer

**Feature**: `001-survey-management` · **Stage**: `/speckit-plan` Phase 1 · **Author**: Solution Architect
**Realises**: `contracts/survey-json.md`, `contracts/response-submission.md`, `spec.md` FR-001 to FR-077
**Decisions**: `research.md` D1–D20

This document is the TypeScript domain model the Angular Engineer implements against. It is normative:
the declarations below are the agreed surface, and a change to one of them is a contract change, not an
implementation detail.

Two rules govern the whole model:

- **No `any`.** Not in a type, not in a cast, not in a test helper that lives under `src/app/core/**`.
  Unvalidated input is `unknown`; that is the only untyped thing in the feature.
- **Everything is `readonly`.** Every field, every array, every map. State changes replace a value; they
  never mutate one. This is what makes a signal's identity comparison meaningful and what stops a
  component from editing session state it was only given to render.

## 1. Layering

```text
                                    validators (pure)
public/survey-manifest.json  ──┐   ┌──────────────────────┐
public/surveys/*.json        ──┴──►│ unknown  ->  Survey  │──► models (normalised, total)
                                   │ unknown  -> ConfigErr│
                                   └──────────────────────┘          │
                                                                     ▼
                                                        services (effectful, signal-backed)
                                                                     │
                                                                     ▼
                                                        features/** (presentation only)
```

The authored JSON shape has **no TypeScript type** (D1). It is described by
`contracts/survey-json.md` and read as `unknown`. The only function that may narrow it is a validator.
Consequently a `Survey` value cannot exist in the application unless it passed validation, which is FR-042
("validation MUST complete before any part of the survey renders") expressed as a type, not as a rule
someone must remember.

Every optional authoring field is resolved to its default **inside** the validator, so the normalised model
has no optional validation fields. `question.maxLength` is always a number; `question.description` is
`string | null` and never `undefined`; `question.attachments` is `AttachmentPolicy | null` and never
`{ maxFiles: 0 }` (D5).

## 2. `src/app/core/models/branded.ts`

```ts
declare const BRAND: unique symbol;

/**
 * Nominal string type. A `Brand<string, 'QuestionId'>` is assignable to `string`,
 * but a plain `string` is not assignable to it — so a page id, an option id and a
 * question id cannot be used in each other's place.
 *
 * Brands are minted in exactly one layer: the validators. Nothing else casts.
 */
export type Brand<TValue, TBrand extends string> = TValue & { readonly [BRAND]: TBrand };

export type SurveyKey = Brand<string, 'SurveyKey'>;
export type PageId = Brand<string, 'PageId'>;
export type QuestionId = Brand<string, 'QuestionId'>;
export type OptionValue = Brand<string, 'OptionValue'>;
export type ClientSubmissionId = Brand<string, 'ClientSubmissionId'>;
export type AttachmentId = Brand<string, 'AttachmentId'>;

/** A `readonly` array guaranteed to hold at least one element. */
export type NonEmpty<T> = readonly [T, ...T[]];

/** A `readonly` array guaranteed to hold at least two elements. */
export type AtLeastTwo<T> = readonly [T, T, ...T[]];
```

`OptionValue` is branded and an option's `id` is not, because the `value` is what a submission carries
across the boundary and the `id` never leaves its question (D3). `contracts/survey-json.md` F09 treats a
duplicate of either as a configuration failure, so the two must not be interchangeable in the code either.

## 3. `src/app/core/models/survey.model.ts` — the survey

### 3.1 The six question types

```ts
import type { AtLeastTwo, NonEmpty, OptionValue, PageId, QuestionId, SurveyKey } from './branded';

export const QUESTION_TYPES = [
  'radio',
  'checkbox',
  'textbox',
  'textarea',
  'rating',
  'satisfaction',
] as const;

/** FR-003: exactly these six. Any other `type` value is configuration failure F04. */
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface SurveyOption {
  readonly id: string;
  readonly label: string;
  readonly value: OptionValue;
}

/** A MIME type (`image/png`) or a dotted extension (`.pdf`), both lowercase. */
export type AcceptedFileType = `${string}/${string}` | `.${string}`;

/**
 * FR-021 / contract §3. Present only when the question actually accepts files:
 * both `maxFiles: 0` and an absent `attachments` block normalise to `null` on the
 * question, so `maxFiles` here is always a usable count and `acceptedTypes` and
 * `maxSizeBytes` are unconditionally present.
 */
export interface AttachmentPolicy {
  readonly maxFiles: 1 | 2 | 3;
  readonly acceptedTypes: NonEmpty<AcceptedFileType>;
  readonly maxSizeBytes: number;
}

/** Invariant held by the validator: `0 <= min < max <= 10`. */
export interface RatingScale {
  readonly min: number;
  readonly max: number;
}

interface QuestionBase {
  readonly id: QuestionId;
  readonly title: string;
  /** `null`, never `undefined` and never `''` — FR-073 renders nothing in its place. */
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
  /** Authoring default 0. The *effective* minimum (FR-016) is derived, not stored. */
  readonly minSelections: number;
  /** Authoring default `options.length`. */
  readonly maxSelections: number;
}

export interface TextboxQuestion extends QuestionBase {
  readonly type: 'textbox';
  /** Authoring default 0. */
  readonly minLength: number;
  /** Authoring default 255; contract ceiling 255. */
  readonly maxLength: number;
}

export interface TextareaQuestion extends QuestionBase {
  readonly type: 'textarea';
  /** Authoring default 0. */
  readonly minLength: number;
  /** Authoring default 2000; contract ceiling 5000. */
  readonly maxLength: number;
}

export interface RatingQuestion extends QuestionBase {
  readonly type: 'rating';
  /** Authoring default `{ min: 1, max: 5 }`. */
  readonly scale: RatingScale;
}

/**
 * FR-010: the scale is fixed at five labelled points and is not configurable, so this
 * member carries no type-specific field. A `scale` on a `satisfaction` question is
 * configuration failure F05.
 */
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

/** The two members that own `options`; useful where only choice questions are legal. */
export type ChoiceQuestion = RadioQuestion | CheckboxQuestion;

/** The two members that own `minLength`/`maxLength`. */
export type TextQuestion = TextboxQuestion | TextareaQuestion;

/** The two members answered with an integer on a scale. */
export type ScaleQuestion = RatingQuestion | SatisfactionQuestion;
```

Why the arity is in the type rather than only in the validator: `AtLeastTwo<SurveyOption>` means no
component or validator ever has to defend against a radio with one option (`contracts/survey-json.md` F10),
and `NonEmpty<SurveyPage>` below means the "current page" lookup cannot be out of range on a valid survey
(F11). The validator is what proves the invariant once; the type is what stops it being re-checked
everywhere.

### 3.2 Survey and page

```ts
export interface SurveyPage {
  readonly id: PageId;
  readonly title: string;
  readonly description: string | null;
  /** May be empty: a page with zero questions is valid and always validates. */
  readonly questions: readonly Question[];
}

export interface Survey {
  readonly key: SurveyKey;
  readonly title: string;
  readonly description: string | null;
  /** FR-001, F11: at least one page, in display order. */
  readonly pages: NonEmpty<SurveyPage>;
}
```

### 3.3 Fixed scales and derived presentation

```ts
export type SatisfactionPoint = 1 | 2 | 3 | 4 | 5;

export const SATISFACTION_SCALE: RatingScale = { min: 1, max: 5 };

/** FR-010. Visible text, never an icon or a colour alone. */
export const SATISFACTION_LABELS: Readonly<Record<SatisfactionPoint, string>> = {
  1: 'Very dissatisfied',
  2: 'Dissatisfied',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Very satisfied',
};

/**
 * FR-009: stars when every point is >= 1, a labelled numeric row when the scale
 * starts at 0, because zero stars cannot be told apart from no answer.
 */
export type RatingPresentation = 'stars' | 'numbers';

export function ratingPresentation(question: RatingQuestion): RatingPresentation {
  return question.scale.min >= 1 ? 'stars' : 'numbers';
}

/** The inclusive answer range of either scale question. */
export function scaleOf(question: ScaleQuestion): RatingScale {
  return question.type === 'rating' ? question.scale : SATISFACTION_SCALE;
}

/** FR-016: `required` raises a checkbox minimum of 0 to 1. */
export function effectiveMinSelections(question: CheckboxQuestion): number {
  return question.required ? Math.max(question.minSelections, 1) : question.minSelections;
}
```

### 3.4 Field-by-field, against the authoring contract

| Model field                      | Authored field  | Required in JSON | Normalisation applied by the validator                 | Invalid value means       |
| -------------------------------- | --------------- | ---------------- | ------------------------------------------------------ | ------------------------- |
| `Survey.key`                     | `key`           | yes              | branded; must equal the key it is served under         | F16 (or F02 if missing)   |
| `Survey.title`                   | `title`         | yes              | trimmed                                                | F02 / F13 (length)        |
| `Survey.description`             | `description`   | no               | trimmed; absent or empty → `null`                      | F13 (over 300)            |
| `Survey.pages`                   | `pages`         | yes              | tuple, at least one                                    | F11                       |
| `SurveyPage.id`                  | `id`            | yes              | branded; unique in survey                              | F07                       |
| `SurveyPage.questions`           | `questions`     | yes              | may be empty                                           | F06 (not an array)        |
| `QuestionBase.id`                | `id`            | yes              | branded; unique in survey, not merely in its page      | F08                       |
| `QuestionBase.type`              | `type`          | yes              | narrowed to `QuestionType`                             | F04                       |
| `QuestionBase.required`          | `required`      | no               | absent → `false`                                       | F06                       |
| `QuestionBase.attachments`       | `attachments`   | no               | absent or `maxFiles: 0` → `null`                       | F15                       |
| `ChoiceQuestion.options`         | `options`       | yes              | tuple, at least two; ids and values unique             | F09 / F10                 |
| `CheckboxQuestion.minSelections` | `minSelections` | no               | absent → `0`                                           | F12 / F13                 |
| `CheckboxQuestion.maxSelections` | `maxSelections` | no               | absent → `options.length`                              | F13                       |
| `TextQuestion.minLength`         | `minLength`     | no               | absent → `0`                                           | F13                       |
| `TextQuestion.maxLength`         | `maxLength`     | no               | absent → 255 (`textbox`) / 2000 (`textarea`)           | F13                       |
| `RatingQuestion.scale`           | `scale`         | no               | absent → `{ min: 1, max: 5 }`                          | F14                       |
| `SatisfactionQuestion`           | —               | —                | no type-specific field exists                          | F05 if `scale` is present |
| `AttachmentPolicy.maxFiles`      | `maxFiles`      | yes              | `0` lifts the whole policy to `null`                   | F15 (outside 0–3)         |
| `AttachmentPolicy.acceptedTypes` | `acceptedTypes` | yes if used      | lowercased; tuple, at least one; no duplicates, no `*` | F15                       |
| `AttachmentPolicy.maxSizeBytes`  | `maxSizeBytes`  | yes if used      | —                                                      | F15 (outside 1–10485760)  |

An authored field that appears on a type it is not listed for is F05; an authored field that appears
nowhere in the contract is F03. Both are failures, never warnings (Principle I).

## 4. `src/app/core/models/survey-manifest.model.ts`

```ts
import type { NonEmpty, SurveyKey } from './branded';
import type { SurveyConfigError } from './survey-config-error.model';

export interface SurveyManifestEntry {
  readonly key: SurveyKey;
  readonly title: string;
  readonly description: string | null;
  /** Relative path under `public/`, ending `.json`. No absolute URL, no `..` segment. */
  readonly config: string;
}

export interface SurveyManifest {
  /** May be empty — FR-048 renders the empty catalog, which is not an error state. */
  readonly surveys: readonly SurveyManifestEntry[];
}

/** FR-074: the catalog's own four states. `ready` cannot be empty; that is `empty`. */
export type CatalogState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly entries: NonEmpty<SurveyManifestEntry> }
  | { readonly kind: 'empty' }
  | { readonly kind: 'configuration-error'; readonly error: SurveyConfigError };

/**
 * FR-050 / FR-066. Three outcomes, not two: a key the manifest does not list is
 * `not-found`, but a manifest that could not be read is `catalog-error` and MUST NOT
 * be reported as an unknown key, because without the manifest the key cannot be
 * resolved either way.
 */
export type SurveyKeyResolution =
  | { readonly outcome: 'found'; readonly entry: SurveyManifestEntry }
  | { readonly outcome: 'not-found'; readonly surveyKey: string }
  | { readonly outcome: 'catalog-error'; readonly error: SurveyConfigError };
```

`CatalogState.ready` carrying `NonEmpty<SurveyManifestEntry>` is what makes FR-074's distinction between
`ready` and `empty` a type-level fact: a catalog cannot be `ready` with nothing to list.

## 5. `src/app/core/models/survey-config-error.model.ts`

```ts
import type { NonEmpty } from './branded';
import type { SurveyManifest } from './survey-manifest.model';
import type { Survey } from './survey.model';

/** The F-classes of `contracts/survey-json.md` §4. This list is the contract-test list. */
export type ConfigFailureCode =
  | 'F01' // body is not parseable JSON
  | 'F02' // required field missing
  | 'F03' // unknown field present
  | 'F04' // unknown question type
  | 'F05' // field not valid for its question type
  | 'F06' // wrong JSON type for a field
  | 'F07' // duplicate page id
  | 'F08' // duplicate question id
  | 'F09' // duplicate option id or value
  | 'F10' // fewer than 2 options on radio/checkbox
  | 'F11' // pages empty
  | 'F12' // unsatisfiable selection rule
  | 'F13' // inverted or out-of-bound numeric rule
  | 'F14' // rating scale out of bounds
  | 'F15' // attachment policy incomplete or out of range
  | 'F16' // config key does not match the key served
  | 'F17' // manifest config path missing or unreadable
  | 'F18' // non-JSON body under any status, including 200
  | 'F19'; // manifest or config fetch unanswered after 10s

export interface ConfigIssue {
  readonly code: ConfigFailureCode;
  /** FR-041: the location, e.g. `pages[1].questions[0].type`, or `''` for a whole-document failure. */
  readonly path: string;
  /** FR-041: author-facing, naming the location and the offending value. */
  readonly message: string;
}

export interface SurveyConfigError {
  readonly scope: 'manifest' | 'survey';
  /** The survey key, or `survey-manifest.json` when `scope` is `manifest`. */
  readonly subject: string;
  readonly issues: NonEmpty<ConfigIssue>;
}

export type SurveyValidation =
  | { readonly outcome: 'valid'; readonly survey: Survey }
  | { readonly outcome: 'invalid'; readonly error: SurveyConfigError };

export type ManifestValidation =
  | { readonly outcome: 'valid'; readonly manifest: SurveyManifest }
  | { readonly outcome: 'invalid'; readonly error: SurveyConfigError };
```

The import of `SurveyManifest` here and of `SurveyConfigError` in `survey-manifest.model.ts` form a
cycle, which is why both are `import type`: a type-only import is erased, so no runtime cycle exists and
`isolatedModules` is satisfied. Every cross-model import in this feature is `import type` for the same
reason, except where a value is genuinely needed (`QUESTION_TYPES`, `SATISFACTION_LABELS`,
`RESPONSE_STATE_TRANSITIONS`, `SurveyResponseGateway`).

`issues` is `NonEmpty<ConfigIssue>` because a `SurveyConfigError` with nothing wrong is not a thing that
should be constructible. The validator reports **every** issue it can determine without guessing — a
structural failure stops it descending further, so F01 always yields exactly one issue, which is what
US5 scenario 1 asserts. The configuration-error screen lists them all; it is still one screen (FR-040).

## 6. `src/app/core/models/answer.model.ts` — session state

```ts
import type { AttachmentId, NonEmpty, OptionValue, QuestionId } from './branded';
import type { Question, SatisfactionPoint } from './survey.model';

/**
 * D4: unanswered is *absence* from the answers map. There is no `null` answer, no `''`
 * answer and no `[]` answer — `SurveySessionService.setAnswer` deletes the entry instead
 * of storing an empty one, and the checkbox variant below cannot hold an empty selection.
 */
export type Answer =
  | { readonly type: 'radio'; readonly value: OptionValue }
  | { readonly type: 'checkbox'; readonly value: NonEmpty<OptionValue> }
  | { readonly type: 'textbox'; readonly value: string }
  | { readonly type: 'textarea'; readonly value: string }
  | { readonly type: 'rating'; readonly value: number }
  | { readonly type: 'satisfaction'; readonly value: SatisfactionPoint };

/** The answer variant that belongs to a given question member, by discriminant. */
export type AnswerFor<TQuestion extends Question> = Extract<Answer, { type: TQuestion['type'] }>;

export type AnswerMap = ReadonlyMap<QuestionId, Answer>;

/**
 * An accepted attachment. D6: the bytes are read once, at selection time, and held for
 * the session, so FR-065's "name, MIME type, size and bytes survive navigation" is a
 * property of this record rather than of a file handle the browser may invalidate.
 */
export interface SessionAttachment {
  readonly id: AttachmentId;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly bytes: Uint8Array;
}

export type AttachmentMap = ReadonlyMap<QuestionId, readonly SessionAttachment[]>;

/** FR-023's ordered checks, plus the read step D6 adds after them. */
export type AttachmentRejectionReason =
  'unaccepted-type' | 'too-large' | 'empty' | 'duplicate' | 'no-free-slot' | 'unreadable';

/** FR-024: one per rejected file, naming the file and the reason. */
export interface AttachmentRejection {
  readonly questionId: QuestionId;
  readonly fileName: string;
  readonly reason: AttachmentRejectionReason;
  /** The respondent-facing text, already formatted by FR-071/FR-072 where needed. */
  readonly message: string;
}

/** The result of processing one multi-file selection (FR-024, US3 scenario 4). */
export interface AttachmentSelectionResult {
  readonly accepted: readonly SessionAttachment[];
  readonly rejected: readonly AttachmentRejection[];
}
```

### 6.1 Answered-ness, stated once

A question counts as answered exactly when `answers.has(question.id)`. Three normalisation rules, applied
only in `SurveySessionService.setAnswer`, keep that true:

| Input from the control                        | Stored                                       |
| --------------------------------------------- | -------------------------------------------- |
| text whose **trimmed** value is `''`          | entry deleted (FR-012, FR-013)               |
| checkbox selection reduced to zero options    | entry deleted                                |
| `rating`/`satisfaction` Clear action (FR-060) | entry deleted                                |
| text with content                             | the **trimmed** value (FR-013)               |
| checkbox selection                            | option values in the question's option order |

Trimming on the way in is what makes US2 scenario 2 fall out of the model: the value `"  "` never becomes
an answer, so the required rule reports and the `minLength` rule does not — FR-014's "a required empty
answer reports the required rule instead" needs no rule-ordering code.

## 7. `src/app/core/models/validation.model.ts`

```ts
import type { QuestionId } from './branded';

/** One row of the FR-069 catalogue. The config cannot add to this list. */
export type ValidationRuleId =
  | 'required-radio'
  | 'required-checkbox'
  | 'required-text'
  | 'required-scale'
  | 'min-length'
  | 'max-length'
  | 'min-selections'
  | 'max-selections'
  | 'scale-range'
  | 'attachment-invalid';

export interface ValidationError {
  readonly questionId: QuestionId;
  readonly rule: ValidationRuleId;
  /** FR-069 only. Derived from the question's type and configured numbers; never authored. */
  readonly message: string;
}

/** FR-030: errors in page order, with the control that must receive focus named. */
export interface PageValidationReport {
  readonly pageIndex: number;
  readonly errors: readonly ValidationError[];
  readonly firstInvalidQuestionId: QuestionId | null;
}

/** FR-034: all pages in order, with the earliest invalid page named. */
export interface SurveyValidationReport {
  readonly pages: readonly PageValidationReport[];
  readonly invalidPageIndexes: readonly number[];
  readonly earliestInvalidPageIndex: number | null;
}

/** What `validation-error` is showing, and therefore what the summary says. */
export type ValidationScope = 'page' | 'survey';
```

`firstInvalidQuestionId` is computed by the validator, not by the component, because "first in page order"
is the thing FR-030 and US2 scenario 7 assert and it is worth a test of its own.

## 8. `src/app/core/models/response-state.model.ts`

```ts
import type { Survey } from './survey.model';
import type { SurveyConfigError } from './survey-config-error.model';
import type {
  PageValidationReport,
  SurveyValidationReport,
  ValidationScope,
} from './validation.model';
import type { SubmissionFailure, SubmissionReceipt } from './survey-response.model';

export type ResponseStateKind =
  | 'loading'
  | 'ready'
  | 'editing'
  | 'validation-error'
  | 'submitting'
  | 'submitted'
  | 'submission-error'
  | 'configuration-error';

/**
 * FR-045. Each variant carries only what that state can show. Note that `loading` and
 * `configuration-error` carry no `Survey` at all, so a template branch for either
 * cannot read survey data — FR-040 and FR-042 enforced by the compiler (D7).
 *
 * Answers, attachments, the current page index and the per-question errors are NOT here;
 * they are separate signals on `SurveySessionService`, so a state change can never drop them.
 */
export type ResponseState =
  | { readonly kind: 'loading'; readonly surveyKey: string }
  | { readonly kind: 'ready'; readonly survey: Survey }
  | { readonly kind: 'editing'; readonly survey: Survey }
  | {
      readonly kind: 'validation-error';
      readonly survey: Survey;
      readonly scope: ValidationScope;
      readonly page: PageValidationReport;
      /** Present only when `scope` is `survey`; drives "more than one page" in the summary. */
      readonly surveyReport: SurveyValidationReport | null;
    }
  | { readonly kind: 'submitting'; readonly survey: Survey }
  | { readonly kind: 'submitted'; readonly survey: Survey; readonly receipt: SubmissionReceipt }
  | {
      readonly kind: 'submission-error';
      readonly survey: Survey;
      readonly failure: SubmissionFailure;
    }
  | { readonly kind: 'configuration-error'; readonly error: SurveyConfigError };
```

### 8.1 The transition table (FR-046)

```ts
/** FR-046, transcribed. Twelve edges between distinct states; two terminal states. */
export const RESPONSE_STATE_TRANSITIONS: Readonly<
  Record<ResponseStateKind, readonly ResponseStateKind[]>
> = {
  loading: ['ready', 'configuration-error'],
  ready: ['editing', 'validation-error'],
  editing: ['editing', 'validation-error', 'submitting'],
  'validation-error': ['validation-error', 'editing'],
  submitting: ['submitted', 'submission-error'],
  submitted: [],
  'submission-error': ['submission-error', 'editing', 'submitting'],
  'configuration-error': [],
};

export function canTransition(from: ResponseStateKind, to: ResponseStateKind): boolean {
  return RESPONSE_STATE_TRANSITIONS[from].includes(to);
}
```

Three self-edges are listed, and they are the only departure from a literal reading of FR-046. FR-046
constrains transitions between _distinct_ states; a self-edge is not a state change, and all three are
behaviour the spec requires (D8):

| Self-edge                              | Why it is required                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editing -> editing`                   | Changing another answer, and Previous/Next within the survey. FR-029, FR-031.                                                                                                            |
| `validation-error -> validation-error` | Submit or Next pressed again with the page still invalid — the report is refreshed, the kind is unchanged. US2 scenarios 1, 13.                                                          |
| `submission-error -> submission-error` | FR-045: "Previous and Next still work" in this state. The error is session-level, and `contracts/response-submission.md` §6 clears it on an **edit**, not on navigation. US6 scenario 4. |

Everything else the table forbids, and `SurveySessionService` routes every state write through one private
`transitionTo()` that throws on an illegal edge. In particular:

- `submitted` has no outgoing edge — nothing leaves it (FR-046).
- `submitted` has exactly one incoming edge, from `submitting` — so the confirmation screen cannot be
  reached without an acknowledgement (FR-037, SC-006).
- `submitting` has no self-edge — a second Submit while one is in flight is refused by the table itself
  (FR-039, US6 scenario 5).
- `configuration-error` has no outgoing edge — the way out is a router navigation to `/`, which destroys
  the component and starts a fresh session (FR-043).

### 8.2 The screen union for `/surveys/:surveyKey`

```ts
/**
 * FR-045 is explicit that the not-found screen "belongs to neither machine". This union
 * is that statement: the route renders either the viewer in one of its eight states, or
 * the not-found screen, and the two are not states of each other.
 */
export type SurveyScreen =
  | { readonly kind: 'viewer'; readonly state: ResponseState }
  | { readonly kind: 'not-found'; readonly surveyKey: string };
```

## 9. `src/app/core/models/survey-response.model.ts` — the submission boundary

This section is the TypeScript realisation of `contracts/response-submission.md`. The contract is
authoritative on behaviour; this is the surface that carries it.

```ts
import type { ClientSubmissionId, NonEmpty, QuestionId, SurveyKey } from './branded';
import type { QuestionType } from './survey.model';

/** Contract §2 attachment entry. `content` is base64; decoded length equals `sizeBytes`. */
export interface AttachmentDescriptor {
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly content: string;
}

/** Contract §2 answer entry. `value`'s shape is fixed by `type`. */
export interface AnswerEntry {
  readonly questionId: QuestionId;
  readonly type: QuestionType;
  readonly value: string | number | readonly string[];
  /** Omitted entirely when the question accepted no file. Never `null`, never `[]`. */
  readonly attachments?: NonEmpty<AttachmentDescriptor>;
}

/** Contract §2. The one payload that crosses the one boundary. */
export interface SurveyResponse {
  readonly surveyKey: SurveyKey;
  readonly clientSubmissionId: ClientSubmissionId;
  /** ISO 8601 UTC, refreshed on every attempt including a retry. */
  readonly submittedAt: string;
  /** Survey page order, then question order within a page. */
  readonly answers: readonly AnswerEntry[];
}

/** Contract §3. The only thing that may produce the `submitted` state. */
export interface SubmissionReceipt {
  readonly submissionId: string;
  readonly receivedAt: string;
}

/** Contract §4. */
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
  /** Respondent-facing text, fixed per `kind` by contract §4. */
  readonly message: string;
  /** Empty unless `kind` is `rejected`. */
  readonly details: readonly SubmissionFailureDetail[];
}

/** A gateway returns this. It never throws and never rejects. */
export type SubmissionResult =
  | { readonly outcome: 'acknowledged'; readonly receipt: SubmissionReceipt }
  | { readonly outcome: 'failed'; readonly failure: SubmissionFailure };
```

`AnswerEntry.value` is deliberately the widest of the three JSON shapes rather than a discriminated union
on `type`. The reason is that this is the **wire** type: it is serialised, not switched on. The typed,
switched-on form is `Answer` (§6), which is what the application reads; the payload builder is the one
function that flattens one into the other, and contract tests 1–3 are what pin the flattening. Making the
wire type a second discriminated union would duplicate `Answer` with no second reader.

`attachments` is the only optional field in the model, because contract §2 requires the key to be **absent**
rather than `null` or `[]` when there are no files, and `NonEmpty<AttachmentDescriptor>` makes the empty
array unrepresentable.

### 9.1 `SurveyResponse` field provenance

| Field                | Source                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `surveyKey`          | `Survey.key` of the open session                                                                        |
| `clientSubmissionId` | `IdFactoryService`, minted once on the **first entry to `submitting`** (FR-061); re-sent on every retry |
| `submittedAt`        | `Date` at the start of each attempt — refreshed per attempt, including a retry                          |
| `answers`            | `AnswerMap` + `AttachmentMap`, flattened in page-then-question order by the payload builder             |

There is **no `surveyVersion`** field. The `/speckit-plan` brief named one, but
`contracts/survey-json.md` defines no version field on a survey config, so the viewer would have to invent
the value — and a payload field whose value the author cannot control is worse than no field. `surveyKey`
identifies the survey and `clientSubmissionId` identifies the attempt. See `research.md` D18 and
`plan.md` §10.

### 9.2 The gateway

```ts
/**
 * The one typed boundary a submission crosses (Principle II). Everything above it —
 * the survey model, validation, navigation, the response states — is unaware of transport.
 *
 * Contract: an implementation MUST resolve, never reject. Anything thrown inside an
 * adapter is the adapter's job to map, normally to `transport-error`. The 15s deadline
 * of FR-038 is owned by the **caller**, which passes `signal`; an adapter MUST honour it.
 */
export abstract class SurveyResponseGateway {
  abstract submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>;
}
```

The abstract class is both the type and the injection token, so there is one symbol to provide and one to
inject. Three implementations, all in `src/app/core/services`:

| Implementation                   | Provided by default | Behaviour                                                                                                            |
| -------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `SimulatedSurveyResponseGateway` | yes                 | No network. Always acknowledges after a delay of at most 1s with a generated `submissionId` (FR-036, FR-068).        |
| `HttpSurveyResponseGateway`      | no                  | `POST /api/survey-responses`, `Idempotency-Key: <clientSubmissionId>`, no `Authorization` header (FR-062).           |
| `FailingSurveyResponseGateway`   | tests only          | Returns a chosen `kind`, or never answers. Lives under `services/testing/`, excluded from `tsconfig.app.json` (D13). |

## 10. Where validation runs

This is the statement the contracts-first rule requires, in one place. Every row is a pure validator call
except where marked.

| Moment                                        | What runs                                                                                                                            | Outcome on failure                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Manifest response received                    | `validateSurveyManifest(raw)` — F01/F02/F03/F06/F13/F18                                                                              | `CatalogState.configuration-error`; at a survey route, `catalog-error` (FR-066)                           |
| Manifest/config fetch deadline (10s)          | `JsonFetchService` deadline (effectful)                                                                                              | F19 → configuration error (FR-075)                                                                        |
| Config response received, **before render**   | `validateSurveyConfig(raw, servedKey)` — F01–F18                                                                                     | `configuration-error`, no part of the survey rendered (FR-040, FR-042)                                    |
| File chosen, at selection time                | `validateAttachmentSelection(policy, existing, candidates)` — FR-023 ×5                                                              | per-file `AttachmentRejection`; valid files in the same selection still attach (FR-024)                   |
| Bytes read, immediately after the five checks | `AttachmentCodecService.read` (effectful)                                                                                            | `unreadable` rejection (D17)                                                                              |
| Answer changed                                | nothing re-validates; that question's error is **cleared** (FR-020)                                                                  | —                                                                                                         |
| **Next pressed — before navigation**          | `validatePage(currentPage, answers, attachments)` — FR-011, FR-029                                                                   | `validation-error` with `scope: 'page'`; page does not change; focus to `firstInvalidQuestionId` (FR-030) |
| Previous pressed                              | **nothing** — Previous is never blocked (FR-031); errors are discarded (FR-064)                                                      | —                                                                                                         |
| **Submit pressed — before submitting**        | `validateSurvey(survey, answers, attachments)` over **all** pages in order — FR-011, FR-034; includes the FR-027 attachment re-check | `validation-error` with `scope: 'survey'`; earliest invalid page renders; no submission starts            |
| Payload built                                 | nothing — the builder validates nothing; contract §1 says the boundary is not where survey rules are discovered                      | —                                                                                                         |
| Acknowledgement received                      | `isSubmissionReceipt(raw)` — both fields present and non-empty                                                                       | `malformed-response` failure → `submission-error`, not `submitted` (FR-037)                               |

Two rows are the answer to "which validation runs before navigation and which runs before submit":
**before navigation, the current page only**; **before submit, every page in order, plus every
attachment re-checked**. Previous runs neither.

## 11. Entity cross-reference

| Spec key entity      | Model type                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| Survey               | `Survey`                                                                |
| Page                 | `SurveyPage`                                                            |
| Question             | `Question` (six-member union)                                           |
| Option               | `SurveyOption`                                                          |
| Attachment policy    | `AttachmentPolicy \| null`                                              |
| Answer               | `Answer` + `AttachmentMap` entry for the same `QuestionId`              |
| Attachment           | `SessionAttachment` (in session) / `AttachmentDescriptor` (on the wire) |
| Manifest entry       | `SurveyManifestEntry`                                                   |
| Response state       | `ResponseState`                                                         |
| Submission           | `SurveyResponse` + `SubmissionReceipt`                                  |
| Client submission id | `ClientSubmissionId`                                                    |
