# Tasks: Dynamic Survey Viewer

**Branch**: `001-survey-management` | **Date**: 2026-10-08 | **Stage**: `/speckit-tasks`
**Author**: Solution Architect

**Input**: Design documents from `specs/001-survey-management/`

**Prerequisites**: [`plan.md`](./plan.md) (required), [`spec.md`](./spec.md) (user stories),
[`research.md`](./research.md), [`data-model.md`](./data-model.md),
[`contracts/survey-json.md`](./contracts/survey-json.md),
[`contracts/response-submission.md`](./contracts/response-submission.md)

**Constitution**: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) v1.0.0 — binding.

**Tests**: **Required, not optional.** The spec's `User Scenarios & Testing` section is mandatory, SC-010
requires spec scenarios to map to automated tests, and Principle IV makes `pnpm vitest run --coverage` at

> = 80% on statements, branches, functions and lines an unconditional gate. Every test task below is
> therefore a deliverable, not a suggestion. No test may be skipped, no threshold moved and no file added to
> `coverage.exclude` (Principle IV, second paragraph).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, and no dependency on an incomplete task.
- **[Story]**: `[US1]`–`[US6]`, mapping to the six user stories in `spec.md`. Setup, Foundational,
  Content and Polish tasks carry no story label.
- Every task names an exact file path and a done-condition that can be checked.

## Ownership

Two owners write files in this feature. Each phase and sub-section below states which.

| Owner                     | Owns                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Angular Engineer**      | Everything under `src/`, plus `package.json`, `tsconfig.app.json`. Phases 1, 2, 4, 5–10, and the app half of Phase 11.         |
| **Survey Content Author** | `public/survey-manifest.json`, `public/surveys/**`, the invalid-config fixture modules and the fixture contract test. Phase 3. |
| **QA Engineer**           | Runs the five gates, maps scenarios to tests, owns gate 5 (browser smoke test at 375px and 1280px). Phase 11 tasks T142–T146.  |

The Solution Architect owns no task here: this stage hands the plan over. The Code Reviewer reviews after
Phase 11 and writes no fix (Principle IV: spec, code and review are three different agents).

## Path conventions

Single-project Angular SPA, per [`plan.md`](./plan.md) §1.2. Application code under `src/app/`, survey data
under `public/`. Test files sit beside their subject as `*.spec.ts`, which is what the existing
`vitest.config.ts` includes (`src/**/*.spec.ts`).

## How this task list is organised, and why it is not purely story-sliced

The template's default is one phase per user story. This feature is organised **layer-first for core, then
story-first for screens**, and the deviation is deliberate and recorded here so `/speckit-analyze` reads it
as a decision rather than a gap:

- Constitution Principle II requires the contract — types, validators, service interfaces — to be complete
  **before** implementation. [`plan.md`](./plan.md) §8 therefore has no vertical slice: WP1 (models) and
  WP2/WP3 (validators) are layers that four of the six stories depend on. Slicing `survey.model.ts` or
  `survey.validator.ts` across US1, US2, US3 and US6 would mean editing one file in four phases and
  shipping a half-written validator, which is exactly the partially-enforced contract Principle I forbids.
- So Phases 2 and 4 realise the whole contract and the whole service layer, and Phases 5–10 are one phase
  per user story over the **screens**, which is where a respondent-visible increment actually exists.
- Phase 3 (Content) depends only on the models and runs **in parallel with the rest of Phase 2 onward**.
- Each story phase from Phase 5 on is independently testable at the DOM level and carries that story's
  acceptance scenarios as named test cases.

The first demoable increment is the end of Phase 5 (the catalog renders from the manifest). The MVP is the
end of Phase 7 (a respondent can complete and submit the default fixture).

Two files are added that [`plan.md`](./plan.md) §1.2 does not list; both are flagged in their task
description so review catches them: `src/app/core/models/assert-never.ts` (§5.3 names the helper but places
no file) and `src/app/core/validators/__fixtures__/` (§7 Layer 4 requires invalid fixtures but names no
location).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the two configuration changes the plan allows, and a recorded baseline.
**Owner**: Angular Engineer (T001–T002), QA Engineer (T003).

- [ ] T001 Add `axe-core` to `devDependencies` in `package.json` and update `pnpm-lock.yaml` via `pnpm add -D axe-core`. Done when `pnpm install --frozen-lockfile` succeeds from a clean `node_modules` and `pnpm ls axe-core` prints a resolved version. This is the only dependency this feature adds (plan §Technical Context).
- [ ] T002 Add `"src/app/core/services/testing/**"` to the `exclude` array in `tsconfig.app.json`, keeping the existing `"src/**/*.spec.ts"` and `"src/test-setup.ts"` entries. Done when the array contains all three entries and `pnpm tsc --noEmit` passes. Per plan §5.4 this is the whole diff outside `src/`, `public/` and `specs/` besides T001; it is **not** a coverage or typecheck relaxation — `tsconfig.spec.json` still compiles that directory and coverage still counts it.
- [ ] T003 Record a baseline run of all five gates on the branch before any source change, pasting the real output into the implement task's comment: `pnpm prettier --check .`, `pnpm tsc --noEmit`, `pnpm vitest run --coverage`, `pnpm ng build`, and a browser load at 375px and 1280px. Done when all five pass and the output is recorded; a red baseline is a blocker for the DevOps Engineer, not something to work around.

---

## Phase 2: Foundational — the contract realised (Blocking Prerequisites)

**Purpose**: the complete typed surface and every pure validator, before any service or component exists.
**Owner**: Angular Engineer.

**⚠️ CRITICAL**: no service task (Phase 4) and no story task (Phases 5–10) may begin until Phase 2 is
complete. Phase 3 (Content) may begin as soon as Phase 2A is complete.

### Phase 2A — Models (plan §8 WP1)

Normative source: [`data-model.md`](./data-model.md) §2–§8. Every type is `readonly` throughout, including
arrays and `ReadonlyMap` (plan §5.2). No `any` anywhere under `src/app/core/**`.

- [ ] T004 Create branded id types in `src/app/core/models/branded.ts` per data-model §2: `SurveyKey`, `PageId`, `QuestionId`, `OptionValue`, `AttachmentId`, `ClientSubmissionId`, plus the `NonEmpty<T>` and `AtLeastTwo<T>` array types. Done when the file compiles under `strict` and a `NonEmpty<string>` cannot be assigned from `[]` (asserted with `@ts-expect-error` in T016). Blocks every other model task.
- [ ] T005 [P] Create the exhaustiveness helper `assertNever(value: never): never` in `src/app/core/models/assert-never.ts`. Done when calling it with a non-`never` argument is a compile error. **Addition to plan §1.2**: §5.3 requires the helper and names no file; flag it in review.
- [ ] T006 Create the survey domain model in `src/app/core/models/survey.model.ts` per data-model §3 — a survey as an ordered list of pages, each an ordered list of questions (FR-001): the six-member `Question` discriminated union on `type` (`radio`, `checkbox`, `textbox`, `textarea`, `rating`, `satisfaction` — exactly these six, FR-003), `Survey`, `SurveyPage`, `SurveyOption`, `AttachmentPolicy`, `RatingScale`, `SatisfactionPoint` (`1 | 2 | 3 | 4 | 5`), the `QUESTION_TYPES` tuple, `SATISFACTION_LABELS` (`"Very dissatisfied"`, `"Dissatisfied"`, `"Neutral"`, `"Satisfied"`, `"Very satisfied"` — FR-010), and the pure functions `ratingPresentation` (stars when `scale.min >= 1`, a labelled numeric row when `min` is 0 — FR-009) and `effectiveMinSelections` (`max(minSelections, 1)` when `required` is true, else `minSelections` — FR-016). `options` on `radio`/`checkbox` is typed `AtLeastTwo<SurveyOption>` so "at least 2 options" is unrepresentable to break. Attachments off is `AttachmentPolicy | null`, never `maxFiles: 0` (research D5). Depends on T004.
- [ ] T007 [P] Create `src/app/core/models/survey-manifest.model.ts` per data-model §4: `SurveyManifestEntry` (`key: SurveyKey`, `title: string`, `description?: string`, `config: string`), `SurveyManifest`, the four-state `CatalogState` union (`loading` | `ready` with a `NonEmpty<SurveyManifestEntry>` list | `empty` | `configuration-error` — FR-074), and `SurveyKeyResolution` (`found` | `not-found` | `catalog-error` — FR-050, FR-066). `ready` cannot hold an empty list; that case is `empty` (FR-048). Depends on T004.
- [ ] T008 [P] Create `src/app/core/models/survey-config-error.model.ts` per data-model §5 and contract §9: the `ConfigFailureCode` union of exactly `'F01'`–`'F19'`, `ConfigIssue` (`code`, `path`, `message`), and `SurveyConfigError` (`scope: 'manifest' | 'survey'`, `subject: string`, `issues: NonEmpty<ConfigIssue>`). `issues` is `NonEmpty` so an error with no issue is unrepresentable. Depends on T004.
- [ ] T009 Create `src/app/core/models/answer.model.ts` per data-model §6: the `Answer` union (one member per question type; `checkbox` holds `NonEmpty<OptionValue>`), `AnswerFor<TQuestion>`, `AnswerInput`, `AnswerMap = ReadonlyMap<QuestionId, Answer>`, `SessionAttachment` (`id`, `name`, `mimeType`, `sizeBytes`, `bytes: Uint8Array`), `AttachmentMap = ReadonlyMap<QuestionId, readonly SessionAttachment[]>`, `AttachmentRejectionReason` (exactly `'unaccepted-type' | 'too-large' | 'empty' | 'duplicate' | 'no-free-slot' | 'unreadable'`), `AttachmentRejection` and `AttachmentSelectionResult`. There is no `null`, `''` or `[]` answer — unanswered is absence from the map (research D4). Depends on T004, T006.
- [ ] T010 [P] Create `src/app/core/models/validation.model.ts` per data-model §7: `ValidationRuleId`, `ValidationError` (`questionId`, `ruleId`, `message`), `PageValidationReport` (including `firstInvalidQuestionId`) and `SurveyValidationReport` (including `earliestInvalidPageIndex` and the "more than one page" flag FR-034 needs). Depends on T004.
- [ ] T011 Create `src/app/core/models/response-state.model.ts` per data-model §8: the eight-variant `ResponseState` union with exactly the payload each variant carries from plan §3 — `loading` carries only `surveyKey` and `configuration-error` carries only `error`, so **neither can reach survey data** (FR-040, FR-042 enforced by the compiler); the frozen `RESPONSE_STATE_TRANSITIONS` table reproducing plan §3's eight rows verbatim; `canTransition(from, to): boolean` reading that table; and the `SurveyScreen` union from data-model §8.2. `submitted` has no outgoing edge and exactly one incoming edge from `submitting`; `submitting` has no self-edge (FR-039); `configuration-error` is terminal. Depends on T004, T006, T008, T010.
- [ ] T012 [P] Create `src/app/core/models/survey-response.model.ts` per data-model §9 and `contracts/response-submission.md` §8–§9: `AttachmentDescriptor` (`name`, `mimeType`, `sizeBytes`, `content` base64), `AnswerEntry` (`questionId`, `type`, `value: string | number | readonly string[]`, optional `attachments: NonEmpty<AttachmentDescriptor>`), `SurveyResponse` (`surveyKey`, `clientSubmissionId`, `submittedAt`, `answers: readonly AnswerEntry[]`), `SubmissionReceipt`, the seven-member `SubmissionFailureKind` union (`transport-error`, `timeout`, `rejected`, `not-found`, `unauthorized`, `server-error`, `malformed-response`), `SubmissionFailure` and `SubmissionResult`. `attachments` is the only optional field in the model, because contract §2 requires the key absent rather than `null` or `[]`. There is **no** `surveyVersion` field (research D18, plan §10 item 3). Depends on T004, T006.
- [ ] T013 [P] Create `src/app/core/models/display-format.ts`: `formatFileSize(bytes)` per FR-071 — binary units, at most one decimal place, below 1024 as `N bytes`, below 1048576 as kilobytes, otherwise megabytes, trailing `.0` omitted, so `800` → `800 bytes`, `240000` → `234.4 KB`, `1048576` → `1 MB`, `5242880` → `5 MB`; and `formatAcceptedTypes(types)` per FR-072 — a MIME type as its uppercased subtype (`image/png` → `PNG`), an extension as its uppercased extension without the dot (`.pdf` → `PDF`), joined with `, ` in config order, duplicate labels collapsed, so `["image/png","image/jpeg","application/pdf"]` → `PNG, JPEG, PDF`. Depends on T004.
- [ ] T014 [P] Create `src/app/core/models/screen-title.ts`: the pure `documentTitleFor(screen)` returning exactly the five FR-077 titles — `Surveys`, `<survey title> — Survey`, `<survey title> — Response received`, `Survey not available`, `Survey not found` — and the `ScreenId` union it switches on, ending in `assertNever`. Depends on T005, T006.
- [ ] T015 Add a barrel `src/app/core/models/index.ts` re-exporting every model file from T004–T014, and replace the placeholder `src/app/core/models/README.md` with a one-paragraph statement of the `models` / `validators` / `services` boundary from plan §5.1. Done when `pnpm tsc --noEmit` passes and no file under `src/app/` imports a model by a deep path that the barrel also exposes. Depends on T004–T014.

### Phase 2B — Model tests (test strategy Layer 1)

Normative source: [`plan.md`](./plan.md) §7 Layer 1. These are where the branch coverage comes from.

- [ ] T016 [P] Write `src/app/core/models/branded.spec.ts` asserting the branded types are not interchangeable and that `NonEmpty<T>` and `AtLeastTwo<T>` reject a shorter literal, using `@ts-expect-error` for each. Depends on T004.
- [ ] T017 [P] Write `src/app/core/models/survey.model.spec.ts` covering `ratingPresentation` for `scale.min` 0 (numeric row) and 1 (stars), `effectiveMinSelections` for required/not-required × `minSelections` 0 and 2, `SATISFACTION_LABELS` being exactly the five FR-010 strings in order, and `QUESTION_TYPES` holding exactly the six FR-003 values. Depends on T006.
- [ ] T018 [P] Write `src/app/core/models/response-state.model.spec.ts` asserting the **full 8 × 8 `canTransition` matrix (64 assertions)** against plan §3's table, and separately that `submitted` and `configuration-error` have no outgoing edge, that `submitted` has exactly one incoming edge (from `submitting`), and that `submitting` has no self-edge. Depends on T011.
- [ ] T019 [P] Write `src/app/core/models/display-format.spec.ts` covering FR-071's four bands — `800`, `240000`, `1048576`, `5242880` — plus the dropped trailing `.0`, and FR-072's MIME case, extension case, duplicate-collapse case and config-order case. Depends on T013.
- [ ] T020 [P] Write `src/app/core/models/screen-title.spec.ts` asserting all five FR-077 titles, including both survey-specific titles interpolating the survey title. Depends on T014.

### Phase 2C — Validators (plan §8 WP2 + WP3)

Normative source: [`contracts/survey-json.md`](./contracts/survey-json.md) §9 (rules R00–R61) and
[`data-model.md`](./data-model.md) §10. Every function here is **pure**: no injection, no clock, no network.
Every `switch` on a discriminant ends in `assertNever` with no `default` branch (plan §5.3).

- [ ] T021 Create `src/app/core/validators/json-reader.ts`: `requireObject`, `requireString`, `requireInt`, `requireBoolean`, `requireArray`, `rejectUnknownKeys`, and a code-point length helper (lengths are measured on the **trimmed** value in Unicode code points, contract §2, so an emoji counts as one character). Each returns a discriminated result over `unknown`; none throws and none returns `any`. Depends on T008, T015.
- [ ] T022 Create `src/app/core/validators/messages.ts` holding every respondent-facing string this feature produces: the **ten FR-069 rows verbatim** — `Choose one option`, `Select at least N option(s)`, `Enter an answer`, `Choose a value between MIN and MAX`, `Use at least N characters`, `Use at most N characters`, `Select at least N option(s)`, `Select no more than N options`, `Choose a value between MIN and MAX`, `FILENAME: REASON` — with `option(s)` singular at `N === 1` and plural otherwise; the six `AttachmentRejectionReason` texts, including `this file could not be read` for `unreadable` (plan §10 item 2, the one string the spec does not supply — flag it in review); and the seven `SubmissionFailureKind` texts verbatim from `contracts/response-submission.md` §4. No message may name the question it belongs to — association is FR-054's job, and FR-019 requires each error to be rendered with its own question in plain language (FR-069). No survey config can supply wording. Depends on T015.
- [ ] T023 Create `src/app/core/validators/survey-config.validator.ts` exporting `validateSurveyConfig(raw: unknown, servedKey: string): SurveyValidation`, implementing **rules R03–R52 one-to-one** (including unique page and question ids, a duplicate being a configuration error — FR-002) in the order contract §9 gives them, and applying every normalised default exactly once here and nowhere else (plan §6.1): `minLength` 0, `maxLength` 255 for `textbox` / 2000 for `textarea` (ceilings 255 and 5000), `scale` `{ min: 1, max: 5 }`, `required` false, `attachments` `null` when absent or when `maxFiles` is 0. Descent order per §9.7: a structural failure (R03, R11, R19) stops descent into the thing that failed but sibling elements are still checked, so two bad questions report two issues. The `raw` parameter is `unknown` and a `Survey` cannot be constructed without passing — FR-042 as a property of the type system. Depends on T021, T022.
- [ ] T024 [P] Create `src/app/core/validators/survey-manifest.validator.ts` exporting `validateSurveyManifest(raw: unknown): ManifestValidation`, implementing **rules R53–R61 one-to-one**: only key `surveys`; `surveys` present, an array, **may be empty**; each entry's only keys `key`, `title`, `description`, `config`; `key` matching `^[a-z0-9][a-z0-9-]{1,63}$` and unique; `title` non-empty trimmed and at most 120 code points; `description` at most 300 code points; `config` a string ending `.json` with no scheme, no leading `/` and no `..` segment. Depends on T021, T022.
- [ ] T025 [P] Create `src/app/core/validators/answer.validator.ts` exporting `validateAnswer(question, answer | undefined): ValidationError | null`, implementing FR-012 to FR-018 and FR-070 for one question: required-unanswered reports the **required** rule (FR-014) and never the `minLength` rule; `minLength`, `minSelections` and the range rules apply **only** to a question that has a value; `maxLength` is checked here as well as refused at the control (FR-015); exceeding `maxSelections` is a validation error here, not only a control constraint (FR-070). At most one error per question. Pure — no injection, no clock. Depends on T022.
- [ ] T026 [P] Create `src/app/core/validators/attachment.validator.ts` exporting `validateAttachmentSelection(policy, existing, candidates)` returning `AttachmentSelectionResult`, running **FR-023's five checks in this order** over the selection — accepted type, taken **only** from the question's `acceptedTypes` and never from a viewer-wide list (FR-028), size against `maxSizeBytes`, 0 bytes, duplicate by name **and** size against `existing`, and a free slot against `maxFiles` — taking files in selection order until `maxFiles` is reached and rejecting each remaining one with the count message. A mixed selection still attaches its valid files (FR-024). Zero files always passes: attachments are never required (FR-022). Depends on T009, T013, T022.
- [ ] T027 Create `src/app/core/validators/page.validator.ts` exporting `validatePage(page, answers, attachments): PageValidationReport` — the one function FR-011 names, validating every answer on the page before the respondent may leave it — which calls `validateAnswer` for each question **in page order** and reports `firstInvalidQuestionId` as the first in that order (FR-030). A page with zero questions always validates (spec Edge Cases). Depends on T025.
- [ ] T028 Create `src/app/core/validators/survey.validator.ts` exporting `validateSurvey(survey, answers, attachments): SurveyValidationReport`, which calls `validatePage` for **every page in survey order**, reports `earliestInvalidPageIndex` (FR-034) and whether more than one page is invalid, and performs the **FR-027 attachment re-check** — every held attachment is re-tested against its question's current policy, and a file that no longer satisfies it is reported as a `FILENAME: REASON` error on that question. Depends on T026, T027.
- [ ] T029 [P] Create `src/app/core/validators/submission-receipt.validator.ts` exporting `isSubmissionReceipt(raw: unknown): raw is SubmissionReceipt`, true only when `submissionId` and `receivedAt` are both present, both strings and both non-empty (FR-037, contract §3). This is the **only** predicate that may produce the `submitted` state. Depends on T012.
- [ ] T030 Add a barrel `src/app/core/validators/index.ts` re-exporting T021–T029 and replace the placeholder `src/app/core/validators/README.md` with plan §5.1's definition of what belongs in `validators` versus `models`. Depends on T021–T029.

### Phase 2D — Validator tests (test strategy Layer 1)

- [ ] T031 [P] Write `src/app/core/validators/json-reader.spec.ts` covering each `require*` helper on a matching value, a wrong-typed value and a missing value, `rejectUnknownKeys` with one and two unknown keys, and the code-point counter on an ASCII string, a trimmed string and a single emoji (one character). Depends on T021.
- [ ] T032 [P] Write `src/app/core/validators/messages.spec.ts` asserting **all ten FR-069 rows verbatim**, `option(s)` singular at `N = 1` and plural at `N = 2`, the `FILENAME: REASON` row with each of the six reasons, and all seven submission-failure texts from `contracts/response-submission.md` §4 verbatim. Depends on T022.
- [ ] T033 [P] Write `src/app/core/validators/survey-config.validator.spec.ts` with **one case per rule R03–R52 (50 cases)**, each asserting the expected `ConfigFailureCode` and `path` from contract §9, plus the valid `mini-pulse` config from contract §10.1 asserting **every normalised default** (`minLength` 0, `maxLength` 255/2000, `scale` 1–5, `required` false, `attachments` `null`), plus the five worked examples in contract §10.2–§10.6 (F03 unknown field, F04 unknown type, F07 duplicate page id, F12 unsatisfiable selection rule, F05 field on the wrong type), plus §9.7's ordering rule: an R03 failure yields exactly one issue, and a config with two bad questions yields two. Depends on T023.
- [ ] T034 [P] Write `src/app/core/validators/survey-manifest.validator.spec.ts` with one case per rule R53–R61 (9 cases) asserting code and path, plus a valid two-entry manifest and a **valid empty** manifest (`{"surveys": []}` is valid, contract §1). Depends on T024.
- [ ] T035 [P] Write `src/app/core/validators/answer.validator.spec.ts` covering, per question type: required-unanswered, required-satisfied, optional-empty-passes, and each numeric rule at `boundary − 1`, `boundary` and `boundary + 1`; FR-013's trimming and code-point counting (an emoji is one character); FR-014's required-beats-`minLength` using the value `"  "` on a required `minLength: 2` textbox, which must report `Enter an answer` and not `Use at least 2 characters` (US2 scenario 2); FR-070's `maxSelections` exceeded by a value the control cannot produce (US2 scenario 13); and `maxLength` exceeded at 81 trimmed characters against `maxLength: 80` (US2 scenario 14). Depends on T025.
- [ ] T036 [P] Write `src/app/core/validators/attachment.validator.spec.ts` covering the five checks in order; a mixed selection where `a.png` attaches and `b.txt` and an 8 MB `c.png` are rejected with one named error each (US3 scenario 4); an over-count selection taking files in selection order with the remainder rejected (US3 scenario 5); a duplicate by name **and** size (US3 scenario 6); a 0-byte file (US3 scenario 7); and zero files passing (US3 scenario 9). Every violating file is rejected **at selection**, never carried to submit (SC-004). Depends on T026.
- [ ] T037 [P] Write `src/app/core/validators/page.validator.spec.ts` asserting `firstInvalidQuestionId` is the first in page order when two questions are invalid (US2 scenario 7) and that a page with zero questions always validates. Depends on T027.
- [ ] T038 [P] Write `src/app/core/validators/survey.validator.spec.ts` asserting `earliestInvalidPageIndex` is page 1 when pages 1 and 3 are invalid and that "more than one page" is reported (US6 scenario 6), and that the FR-027 re-check fails for an attachment that passed at selection time and no longer satisfies its policy (US6 scenario 7). Depends on T028.
- [ ] T039 [P] Write `src/app/core/validators/submission-receipt.validator.spec.ts` covering both fields present; each field missing; each field empty; and a non-object body (contract test 5). Depends on T029.

**Checkpoint**: the contract is realised and tested. `pnpm tsc --noEmit` passes, `pnpm vitest run --coverage`
is green, and coverage of `src/app/core/{models,validators}/**` is above 90%. Phase 3 and Phase 4 can now
run in parallel.

---

## Phase 3: Content — survey data and fixture contract tests

**Purpose**: the manifest, the default fixture, a second survey to prove SC-013, and the invalid fixtures
the F-class contract tests need.
**Owner**: **Survey Content Author.**

**Dependency note**: T040–T042 need only the **types** from Phase 2A, so they can start as soon as T015
lands — in parallel with Phase 2C/2D. T043–T045 need `validateSurveyConfig` and `validateSurveyManifest`,
so they wait for T023 and T024.

- [x] T040 [P] Create `public/survey-manifest.json` with exactly two entries in this order: `customer-feedback` / "Customer Feedback" / description `Four short pages about your recent order.` / config `surveys/customer-feedback.json`, and `product-pulse` / "Product Pulse" / config `surveys/product-pulse.json` (US4 scenario 1). Only the keys `key`, `title`, `description`, `config` may appear (R55); `config` must be a relative path under `public/` ending `.json` with no scheme, no leading `/` and no `..` (R61). Done when `validateSurveyManifest` on the parsed file returns `outcome: 'valid'` with two entries in manifest order. Depends on T015.
- [x] T041 [P] Create the default fixture `public/surveys/customer-feedback.json` with `key: "customer-feedback"`, `title: "Customer Feedback"`, `description: "Four short pages about your recent order."` and exactly four pages (FR-052), matching `contracts/survey-json.md` §5 — wording may be refined, **structure may not**: page 1 `About You` with `description: "Who we are hearing from."` holding required `textbox` `q_name` (`minLength: 2`, `maxLength: 80`) and required `radio` `q_segment` (3 options: new, returning, business); page 2 `Your Experience` with **no** `description` (US1 scenario 7) holding required `satisfaction` `q_satisfaction` (no `scale` field — a `scale` on a satisfaction question is F05), required `checkbox` `q_liked` (5 options, `minSelections: 1`, `maxSelections: 3`), and optional `rating` `q_delivery` (`scale: { min: 1, max: 5 }`); page 3 `Supporting Files` holding optional `textarea` `q_evidence` (`maxLength: 1000`, `attachments: { maxFiles: 3, acceptedTypes: ["image/png","image/jpeg","application/pdf"], maxSizeBytes: 5242880 }`); page 4 `Final Thoughts` holding optional `textarea` `q_comments` (`maxLength: 2000`) and required `radio` `q_recommend` (3 options: yes, no, unsure). Every option needs a unique `id`, a `label` of at most 200 characters and a unique `value` of at most 100 characters (R32, R33). Done when `validateSurveyConfig(parsed, 'customer-feedback')` returns `outcome: 'valid'`, asserted by T043. Depends on T015.
- [x] T042 [P] Create the second survey `public/surveys/product-pulse.json` — `key: "product-pulse"`, `title: "Product Pulse"`, at least one page, at least one question — to give SC-013 something to add and remove. Done when `validateSurveyConfig(parsed, 'product-pulse')` returns `outcome: 'valid'` and the file plus its one manifest entry are the complete diff for adding it (`git diff --stat -- src/app` reports no change, measured in T147). Depends on T015.
- [x] T043 Create `src/app/core/validators/__fixtures__/invalid-survey-configs.ts` exporting one deliberately invalid config per failure class **F01 to F16** (F17/F18/F19 are the fetch layer's and are covered by T059 and T065, not by a config file). F01 is exported as a raw unparseable **string**; the rest as `unknown`-typed object literals. Each export is named for its code and carries a comment naming the expected `path`. Done when there are 16 exports and T045 asserts each. **Addition to plan §1.2**: §7 Layer 4 requires these and names no location; flag it in review. Depends on T023.
- [x] T044 [P] Create `src/app/core/validators/__fixtures__/invalid-manifests.ts` exporting one invalid manifest per manifest-reachable failure class (F01 unparseable, F02 missing `surveys`, F03 unknown key, F06 wrong JSON type, F07 duplicate `key`, F13 bad `config` path). Depends on T024.
- [x] T045 Write the fixture contract test `src/app/core/validators/survey-fixtures.contract.spec.ts` (plan §7 Layer 4) which: loads `public/survey-manifest.json`, `public/surveys/customer-feedback.json` and `public/surveys/product-pulse.json` from disk; asserts each is `outcome: 'valid'`; asserts the normalised `customer-feedback` survey has 4 pages, 8 questions in the §5 order, `q_delivery.required === false`, `q_evidence.attachments` non-`null` with `maxFiles: 3`, `q_comments.attachments === null`, and `q_name.maxLength === 80`; and asserts that **every** export of T043 and T044 produces its expected `ConfigFailureCode` and `path`. Done when all three valid fixtures pass and all 22 invalid fixtures produce their own code. Depends on T040, T041, T042, T043, T044.

**Checkpoint**: survey data exists and is proven against the contract. A survey is now a file plus a
manifest entry, with no `src/app/**` change (Principle I).

---

## Phase 4: Foundational — the service layer (Blocking Prerequisites for Phases 5–10)

**Purpose**: every effectful seam and the one signal-backed session, behind the interfaces plan §4 fixes.
**Owner**: Angular Engineer.

Three tracks run in parallel after Phase 2: **Track A** (fetch and loading, plan WP5), **Track B**
(submission and encoding, plan WP7), **Track C** (session and announcements, plan WP6). Track C's T077
depends on Track A and Track B.

### Track A — fetch, catalog, loader (plan §8 WP5)

- [ ] T046 [P] Create `src/app/core/services/survey-timeouts.ts` with the `SURVEY_TIMEOUTS` injection token and its `{ fetchMs: number; submitMs: number }` type. Not `@Injectable` — it has no dependency to inject (plan §5.1). Done when the token exists and is typed; the value `{ fetchMs: 10_000, submitMs: 15_000 }` is provided in `app.config.ts` by T082. Depends on T015.
- [ ] T047 Create `src/app/core/services/json-fetch.service.ts` — the **only** `fetch()` call in the feature — exporting `JsonFetchResult` (`{ outcome: 'json', value: unknown, status }` | `{ outcome: 'unreadable', status: number | null }` | `{ outcome: 'timeout' }`) and `JsonFetchService.fetchJson(url, deadlineMs)`. Two rules live here and nowhere else: **the body decides, not the status** — `outcome: 'json'` requires a body `JSON.parse` accepted, so a 200 carrying the deployment's HTML index is `unreadable` (FR-076); and **an unanswered request is a failure** — the deadline is an `AbortController` plus a `setTimeout` driven by the injected `SURVEY_TIMEOUTS.fetchMs`, **not** `AbortSignal.timeout()`, which Vitest's fake timers do not patch (research D10, FR-075). Angular's `HttpClient` must not be used here: it inverts both rules. Never returns `any`. Depends on T046.
- [ ] T048 Create `src/app/core/services/survey-catalog.service.ts` — root-provided — with `state: Signal<CatalogState>`, `load(): Promise<ManifestValidation>` and `resolve(surveyKey: string): Promise<SurveyKeyResolution>`, per plan §4.1; a manifest that cannot be fetched or does not satisfy its contract puts the state in `configuration-error` (FR-044). The **promise** is memoised in a private field, not the value, so two concurrent callers share one fetch (research D11, FR-067); root provision makes the lifetime the visit, so a reload refetches (US4 scenario 8). `resolve` returns `catalog-error` whenever `load` failed, for any reason and at any route — an unresolvable key is **never** reported as `not-found` (FR-066, US4 scenario 7). Nothing is written to `localStorage` or `sessionStorage`. Depends on T024, T047.
- [ ] T049 Create `src/app/core/services/survey-loader.service.ts` — root-provided — with `load(entry: SurveyManifestEntry): Promise<SurveyValidation>`, composing `fetchJson(entry.config, SURVEY_TIMEOUTS.fetchMs)` with `validateSurveyConfig(value, entry.key)` and mapping the three non-`json` outcomes to **F17** (transport or non-success status), **F18** (non-JSON body under a success status) and **F19** (deadline passed), per contract §9.0 R00–R02. Depends on T023, T047.
- [ ] T050 [P] Write `src/app/core/services/json-fetch.service.spec.ts` with a stubbed `fetch` and fake timers: a JSON body → `json`; an **HTML body under HTTP 200** → `unreadable` (FR-076, US4 scenario 11); a network throw → `unreadable` with `status: null`; a 404 → `unreadable` with `status: 404`; and a request that never answers → `timeout` **at exactly `fetchMs`** and not before, which is what makes the catalog leave `loading` for the configuration-error screen after 10s (FR-075, SC-014, US4 scenario 9). Depends on T047.
- [ ] T051 [P] Write `src/app/core/services/survey-catalog.service.spec.ts`: **one** fetch for two `resolve` calls (FR-067, US4 scenario 8); each of the four `CatalogState`s including `empty` for `{"surveys": []}`; `not-found` for an absent key; and `catalog-error` — not `not-found` — for an unreadable manifest reached at a survey route (FR-066, US4 scenario 7). Depends on T048.
- [ ] T052 [P] Write `src/app/core/services/survey-loader.service.spec.ts`: a valid config; each of F17, F18 and F19; and F16 when the config's `key` differs from the key it was served under. Depends on T049.

### Track B — submission and encoding (plan §8 WP7)

- [ ] T053 [P] Create `src/app/core/services/id-factory.service.ts` — root-provided — minting `ClientSubmissionId` and `AttachmentId` values. The only source of randomness in the feature, so it is injectable and stubbable (research D14). Depends on T015.
- [ ] T054 [P] Create `src/app/core/services/attachment-codec.service.ts` — root-provided — with `read(file: File): Promise<Uint8Array | 'unreadable'>` and `toBase64(bytes: Uint8Array): string`. Bytes are read **at selection time**, not at submit time (research D6), and a read that fails after FR-023's five checks pass yields `'unreadable'` (research D17, plan §10 item 2). Depends on T009.
- [ ] T055 [P] Create the abstract boundary `src/app/core/services/survey-response.gateway.ts`: `abstract class SurveyResponseGateway { abstract submit(response: SurveyResponse): Promise<SubmissionResult> }`, used as its own DI token per `contracts/response-submission.md` §9. **A gateway resolves and never rejects** — a thrown error inside an adapter is its own bug, and the caller owns the 15s clock so FR-038 applies identically to all three adapters. Depends on T012.
- [ ] T056 Create `src/app/core/services/simulated-survey-response.gateway.ts` — the **default** adapter — which makes no network call and **always** acknowledges after an artificial delay of at most 1s with a generated `submissionId`. It has no failure-injection switch, so gate 3 stays deterministic (FR-068, contract §5). Done when it never resolves to a failure and aborts cleanly when the caller's deadline fires. Depends on T053, T055.
- [x] T057 Create `src/app/core/services/http-survey-response.gateway.ts` — the real adapter, not wired by default — which `POST`s to `/api/survey-responses` with `Content-Type: application/json` and `Idempotency-Key: <clientSubmissionId>` and **no `Authorization` header and no session cookie** (the endpoint is anonymous, FR-062, contract §4). HTTP 200/201 whose body satisfies `isSubmissionReceipt` is an acknowledgement; everything else maps to a §4 `kind` per the complete table in contract §11.3 — 400/422 → `rejected` with each `details` reason, 404 → `not-found`, 401/403 → `unauthorized`, 5xx → `server-error`, a 2xx body that fails `isSubmissionReceipt` → `malformed-response`, a transport failure → `transport-error`. Depends on T029, T055.
- [ ] T058 Create the test-only adapter `src/app/core/services/testing/failing-survey-response.gateway.ts` returning a chosen `SubmissionFailureKind`, or never answering. Reachable only from a test — T002's `tsconfig.app.json` exclusion makes an import of it from application code a **build failure**, which is how FR-068's "never from a running build" becomes enforced rather than intended. Done when `pnpm ng build` fails if any file under `src/app/features/**` imports it, and `pnpm tsc --noEmit` still type-checks it via `tsconfig.spec.json`. Depends on T002, T055.
- [ ] T059 [P] Create `src/app/core/services/survey-response-payload.ts` exporting the **pure** `buildSurveyResponse(survey, answers, attachments, encoded, ids): SurveyResponse`. Not `@Injectable` — it has no dependency (plan §5.1). `answers` is ordered by **survey page order, then question order within the page** (FR-035, FR-063, contract §2); an unanswered optional question is omitted; a checkbox `value` is in the question's option order; the `attachments` key is **absent** when the question accepted no file, never `null` and never `[]`; and a question with at least one accepted attachment but no value is included with the type's empty value `""` (research D16, contract §8.1 — the resolution of plan §10 item 1). The builder validates nothing (data-model §10). Depends on T012, T054.
- [ ] T060 [P] Write `src/app/core/services/attachment-codec.service.spec.ts` asserting the round trip `Uint8Array` → base64 → decoded length equals `sizeBytes` (contract test 3) and that an unreadable file yields `'unreadable'`. Depends on T054.
- [ ] T061 [P] Write `src/app/core/services/survey-response-payload.spec.ts` covering **contract tests 1–3**: a valid payload for the default fixture matching contract §2 exactly including answer order; each `value` shape per question type with a checkbox answer in option order; the omission of unanswered optional questions; the D16 attachment-only entry carrying `""`; and the `attachments` key being absent when there are no files. Depends on T059.
- [ ] T062 [P] Write `src/app/core/services/simulated-survey-response.gateway.spec.ts` asserting it always acknowledges inside 1s with a non-empty `submissionId` and that it has no failure path. Depends on T056.
- [x] T063 [P] Write `src/app/core/services/http-survey-response.gateway.spec.ts` with a stubbed `fetch`: `Idempotency-Key` equals the payload's `clientSubmissionId` and **no `Authorization` header is sent** (contract test 11); all eight rows of the §11.3 status mapping (contract tests 6, 12), including HTTP 401 → `unauthorized` with contract §4's exact text and no credential prompt; and a 200 with a body missing `submissionId` → `malformed-response` (contract test 5). Depends on T057.
- [ ] T064 [P] Write `src/app/core/services/id-factory.service.spec.ts` asserting two calls produce distinct ids and that the format matches what `Idempotency-Key` requires. Depends on T053.

### Track C — session, announcements, titles (plan §8 WP6)

- [ ] T065 [P] Create `src/app/core/services/announcer.service.ts` — root-provided — holding exactly two signals, `polite` and `assertive`, each a message or `null`. Components never compose announcement text: FR-069 and contract §4 fix the wording and both live in `core` (plan §4.5). Depends on T022.
- [ ] T066 [P] Create `src/app/core/services/document-title.service.ts` — root-provided — with `apply(screen: ScreenId): void` writing the title the pure `documentTitleFor` returns (FR-077). The `lang="en"` half of FR-077 is already satisfied by `src/index.html`, so no code is needed for it — only the assertion in T148. Depends on T014.
- [ ] T067 Create `src/app/core/services/survey-session.service.ts` — root-provided, **the one source of truth** — with exactly the surface plan §4.3 declares: the seven writable-only-from-inside state signals (`state`, `currentPageIndex`, `answers`, `attachments`, `questionErrors`, `attachmentRejections`, `dirty`); the derived signals (`survey`, `currentPage`, `pageCount`, `positionLabel` "Page N of M" FR-032, `isFirstPage` FR-031, `primaryAction` `'next' | 'submit'` FR-033, `inputsLocked` true only in `submitting` FR-039, `focusRequest`); `maxLengthOf(question)` FR-015 and `isOptionSelectable(question, value)` FR-017; and the ten commands `open`, `openFailed`, `setAnswer`, `clearAnswer`, `addFiles`, `removeAttachment`, `next`, `previous`, `submit`, `retry`. Every state write goes through **one private `transitionTo()` that asserts `canTransition(from, to)` and throws on a violation** (FR-046 — only the transitions plan §3 names are allowed), so plan §3's table is the enforcement and not a comment. `focusRequest` carries `{ questionId, token: number }` so re-pressing Next on the same still-invalid question produces a new value. `questionErrors` holds at most one error per question. Answers and attachments live **outside** the `ResponseState` variant, so "a failed submission preserves the answers" is structural. Depends on T011, T028, T046, T048, T049, T053, T054, T055, T059, T065.
- [ ] T068 Implement `setAnswer` and `clearAnswer` behaviour in `src/app/core/services/survey-session.service.ts` per plan §4.3 and data-model §6.1: normalise on the way in — **trim** text and **delete** the entry when the trimmed value is empty, delete the entry when a checkbox selection reduces to zero, delete on a `rating`/`satisfaction` Clear (FR-060, allowed even on a required question), and order checkbox values by the question's option order; delete that question's error **immediately** (FR-020, US2 scenario 8); set `dirty`; and transition `ready -> editing` and `submission-error -> editing` (contract §6). Trimming on the way in is what makes US2 scenario 2 fall out of the model with no rule-ordering code. Depends on T067.
- [ ] T069 Implement `next` and `previous` in `src/app/core/services/survey-session.service.ts`: `next` validates **the current page only** (FR-029) — valid moves the index forward and sets `focusRequest` to the new page's heading; invalid goes to `validation-error` with `scope: 'page'`, leaves the page index unchanged, sets `focusRequest` to `firstInvalidQuestionId` and announces assertively (FR-030). `previous` validates **nothing** and is never blocked (FR-031), decrements the index, and **clears `questionErrors` and the page summary** so the page returns in `editing` with answers intact (FR-064, US2 scenario 12). Depends on T068.
- [ ] T070 Implement `submit` and `retry` in `src/app/core/services/survey-session.service.ts`: `submit` validates **every page in order including the FR-027 attachment re-check** (FR-034) — any page invalid goes to `validation-error` with `scope: 'survey'`, moves the page index to `earliestInvalidPageIndex`, mints **no** `clientSubmissionId` and makes **no** gateway call (FR-061, contract tests 9 and 13); all valid mints the `clientSubmissionId` if this is the session's first submission, transitions to `submitting`, encodes then builds the payload (order: validate → encode → build → call, so nothing is encoded for a blocked submission), races the gateway against `SURVEY_TIMEOUTS.submitMs` and transitions to `submitted` or `submission-error`; on `submitted` it discards the session answers (FR-045). The `submitted` state — and so the confirmation screen — is reachable **only** through a gateway acknowledgement that satisfies `isSubmissionReceipt` (SC-006). `retry` is identical except that the **existing** `clientSubmissionId` is re-used with a fresh `submittedAt` (FR-061, contract test 10). A second Submit during `submitting` is refused by the transition table, not by a flag (FR-039). Depends on T069.
- [ ] T071 Implement `addFiles` and `removeAttachment` in `src/app/core/services/survey-session.service.ts`: `addFiles` runs `validateAttachmentSelection` over the selection **in order**, accepting until `maxFiles` is reached, reads the bytes of each accepted file immediately (research D6) and demotes a file whose read fails to an `unreadable` rejection (research D17), publishes **one `AttachmentRejection` per rejected file** and announces politely (FR-024, FR-026, FR-055); valid files in a mixed selection still attach. `removeAttachment` frees the slot immediately and announces politely. Depends on T026, T054, T068.
- [ ] T072 [P] Write `src/app/core/services/announcer.service.spec.ts` asserting each signal is set and cleared independently and that no message text is composed outside `core`. Depends on T065.
- [ ] T073 [P] Write `src/app/core/services/document-title.service.spec.ts` asserting `apply` writes each of the five FR-077 titles to `document.title`. Depends on T066.
- [ ] T074 Write `src/app/core/services/survey-session.service.spec.ts` covering **every command in the plan §4.3 table**, and specifically: an illegal `transitionTo` **throws**; `open` resets every signal to page index 0 and mints no `clientSubmissionId`; FR-020's immediate error clear; FR-064's error discard on Previous (US2 scenario 12); the blocked-Next path leaving the page index unchanged; the blocked-Submit path making **no** gateway call and minting **no** `clientSubmissionId` (contract tests 9, 13); a second Submit during `submitting` starting no second call (contract test 8, US6 scenario 5); the 15s deadline producing `timeout` at exactly `submitMs` (contract test 7, US6 scenario 2); `clientSubmissionId` identical across retries with a later `submittedAt`, and different after a reopen (contract test 10, SC-011, US6 scenario 9); that no path reaches `submitted` without a receipt satisfying `isSubmissionReceipt`, so the confirmation is unreachable without an acknowledgement (SC-006); and every answer and attachment intact after **each** of the seven failure kinds (SC-007). Depends on T070, T071.
- [ ] T075 Add a barrel `src/app/core/services/index.ts` re-exporting T046–T071 (not the `testing/` adapter) and replace the placeholder `src/app/core/services/README.md` with plan §5.1's definition of what belongs in `services`. Depends on T046–T071.

**Checkpoint**: all business logic exists and is tested. From here on, a component may contain **only** the
four things plan §6.2 permits — an `input()`/`output()`, a `computed()` reading a core signal or calling a
pure core function, a method forwarding an event to a core command, and an `effect()` applying a core signal
to the DOM. Nothing else.

---

## Phase 5: User Story 4 — Find a survey from the catalog (Priority: P1) 🎯 first demoable increment

**Goal**: a visitor sees which surveys exist and opens one; an unknown key is a dead end with a way back,
never a blank screen.
**Owner**: Angular Engineer.

**Independent Test**: serve a manifest with two entries, assert both titles render as links in manifest
order, then request an absent key and assert the not-found screen; then make the manifest unreadable and
assert the configuration-error screen at both `/` and `/surveys/customer-feedback`.

Every component in this and every later phase is **standalone**, uses **signals**,
`ChangeDetectionStrategy.OnPush` and `@if`/`@for` control flow. No NgModules, no `*ngIf`, no `*ngFor`
(Principle V). Colour reaches the UI only through `src/styles/tokens.css` and `src/app/theme/`; no component
file declares a colour value.

- [ ] T076 [US4] Create the shared live-region component `src/app/shared/live-region.ts` rendering exactly one `aria-live="polite"` and one `aria-live="assertive"` region, both **present from first render** so a later message is announced, each bound to its `AnnouncerService` signal. Contains no logic. Depends on T065.
- [ ] T077 [US4] Reduce the shell to the skip link, `<app-live-region />` and `<router-outlet />` in `src/app/app.html`, `src/app/app.ts` and `src/app/app.css`, removing the foundation's placeholder card content — the foundation's own comment says survey rendering "will live behind the router outlet" (plan §2). Done when `src/app/app.html` contains those three things and nothing else, and `src/app/app.spec.ts` is updated in the same task so no assertion refers to the removed card. Depends on T076.
- [ ] T078 [P] [US4] Create the configuration-error screen `src/app/shared/configuration-error.ts` serving **both** scopes (`manifest` and `survey`), naming the location and the offending value **per issue** from `SurveyConfigError.issues`, and offering a link to `/` so the catalog is reachable without a reload (FR-041, FR-043, US5 scenario 6). Renders no question control and no page title. Depends on T008.
- [ ] T079 [P] [US4] Create the not-found screen `src/app/shared/not-found-page.ts` naming the requested key and linking to `/` (FR-050, FR-051). One component reached two ways — an unknown `surveyKey` and the `'**'` route — rendering one way. Depends on T066.
- [ ] T080 [US4] Create the catalog screen `src/app/features/catalog/catalog-page.ts`, `.html` and `.css` switching on `SurveyCatalogService.state()` across all four `CatalogState`s (FR-047, FR-074): `loading` shows a busy indication announced politely and **no** list, no "no surveys available" text and no error text (US4 scenario 10); `ready` renders each entry's title as a link to `/surveys/<key>` **in manifest order**, so activating an entry navigates to that survey's route and page 1 renders (US4 scenarios 1 and 2); `empty` renders the plain statement that no surveys are available and **no error state** (US4 scenario 3); `configuration-error` renders `<app-configuration-error />` and no list (US4 scenario 4). Applies `DocumentTitleService` in an `effect()`. Depends on T048, T066, T078.
- [ ] T081 [US4] Add the `''` and `'**'` routes to `src/app/app.routes.ts` with `loadComponent` (lazy, so SC-002's 1s catalog budget does not pay for the survey bundle), `title: 'Surveys'` on `''` and `title: 'Survey not found'` on `'**'` (FR-077). Done when `/` renders the catalog and `/about` renders the not-found screen. Depends on T079, T080.
- [ ] T082 [US4] Add `withComponentInputBinding()` to `provideRouter` and provide `{ provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } }` in `src/app/app.config.ts`, updating `src/app/app.config.spec.ts` in the same task. Depends on T046, T081.
- [ ] T083 [P] [US4] Write `src/app/features/catalog/catalog-page.spec.ts` asserting manifest order is preserved; the empty manifest renders the plain statement and no error (US4 scenario 3); `loading` contains none of the three other states' content (US4 scenario 10); the configuration-error state renders the reason and no list (US4 scenario 4); and the HTML-under-200 manifest produces the configuration-error screen (US4 scenario 11, FR-076); that activating the `Customer Feedback` link puts the URL at `/surveys/customer-feedback` and renders page 1 of that survey (US4 scenario 2); and that a manifest request which never answers leaves `loading` for the configuration-error screen once the 10s deadline passes, so the catalog never stays in `loading` (US4 scenario 9, FR-075). Depends on T080.
- [ ] T084 [P] [US4] Write `src/app/shared/not-found-page.spec.ts` asserting the requested key is named and `/` is linked (US4 scenarios 5, 6), and that the configuration-error screen does **not** render for an absent key. Depends on T079.
- [ ] T085 [P] [US4] Write `src/app/shared/live-region.spec.ts` asserting both regions exist before any message is set and that each announces its own politeness level. Depends on T076.

**Checkpoint**: US4 is independently functional. `/` lists surveys from the manifest, an unknown key is
not-found, an unreadable manifest is a configuration error at both routes, and adding a survey has so far
touched no file under `src/app/**`.

---

## Phase 6: User Story 5 — An invalid survey config fails closed (Priority: P1)

**Goal**: an invalid survey config renders an actionable error and **none** of the survey — never a partial
or repaired form.
**Owner**: Angular Engineer.

**Independent Test**: for each failure class in `contracts/survey-json.md` §4, load that fixture and assert
exactly one configuration-error screen, **zero question controls in the DOM**, and a reason naming the
offending path.

- [x] T086 [US5] Create the survey viewer shell `src/app/features/survey/survey-page.ts`, `.html` and `.css` taking `surveyKey` as a routed `input()` (no resolver and no guard — plan §2), driving `SurveyCatalogService.resolve` then `SurveyLoaderService.load` itself — FR-049's load-then-validate-then-render for `/surveys/:surveyKey`, and switching on the `SurveyScreen` union. In this task it implements only three of the eight `ResponseState` branches: `loading` (busy indication announced politely, **no** question, no control, no error), `configuration-error` (`<app-configuration-error />` alone, with the link to `/`) and the `not-found` screen. Because `loading` and `configuration-error` carry no `Survey`, a template branch for either **cannot** read survey data — FR-040 and FR-042 enforced by the compiler. Applies `DocumentTitleService` in an `effect()`. Depends on T049, T067, T078, T079.
- [x] T087 [US5] Add the `'surveys/:surveyKey'` route to `src/app/app.routes.ts` with `loadComponent`, and **no static `title`** — this screen has three different FR-077 titles depending on the survey and the state, so `DocumentTitleService` sets it. Depends on T086.
- [x] T088 [US5] Write `src/app/features/survey/survey-page.config-error.spec.ts` asserting, for each of T043's F01–F16 fixtures plus the F17/F18/F19 fetch outcomes: exactly **one** configuration-error screen renders, `querySelectorAll` finds **zero** question controls (`input`, `textarea`, `[role="radio"]`, `[role="radiogroup"]`) at every point in the lifecycle (SC-005, US5 scenarios 1, 8), the reason names the offending path (US5 scenarios 2, 3, 4, 5), and the link to `/` is present (US5 scenario 6). Also asserts the F17 index-fallback case — HTTP 200 with an HTML body — renders the error rather than treating 200 as a usable config (US5 scenario 7, FR-076), and that a config request unanswered after 10s leaves `loading` for the error screen (US5 scenario 8, FR-075). Depends on T043, T086.
- [x] T089 [P] [US5] Write `src/app/shared/configuration-error.spec.ts` asserting both scopes render, that every issue's location and value is named, and that the link to `/` works without a reload. Depends on T078.

**Checkpoint**: US4 and US5 both work independently. A broken config is a dead end that names itself, and
no partial survey can render.

---

## Phase 7: User Story 1 — Complete a survey end to end (Priority: P1) 🎯 MVP

**Goal**: a respondent opens a survey, answers every question across its pages, and submits once, receiving
a confirmation they can trust.
**Owner**: Angular Engineer.

**Independent Test**: load the default `customer-feedback` fixture, answer all four pages with valid input,
submit, and assert the confirmation screen appears with a submission reference.

Per plan §6.4 **every** question component in this phase gives its control a programmatic label naming
the question (FR-053), in whichever of the two forms FR-053 requires for that type:

- **Grouped** — `radio`, `checkbox`, `rating`, `satisfaction` are exposed as a labelled **group**
  (`role="radiogroup"` or `fieldset` + `legend`) naming the question. Four types, asserted in T103,
  T104, T106, T107.
- **Single control** — `textbox` and `textarea` are **not** grouped controls, so they take a plain
  programmatic label naming the question (`<label for>`, or `aria-labelledby` pointing at the title
  the host renders) and **must not** be wrapped in a `radiogroup`. One component, asserted in T105.

Every component also sets `aria-invalid` and `aria-describedby` pointing at its error text whenever
`questionErrors` holds its id (FR-054), and gives any control whose label is an icon or a single
character a 44 × 44px target at 375px (FR-058).

- [ ] T090 [US1] Provide `{ provide: SurveyResponseGateway, useClass: SimulatedSurveyResponseGateway }` in `src/app/app.config.ts` and assert it in `src/app/app.config.spec.ts`. The simulated adapter is the default; selecting another must not require a change to survey, validation or navigation behaviour (contract §5). Depends on T056, T082.
- [x] T091 [US1] Create `src/app/features/survey/questions/question-host.ts` switching on `question.type` with `@switch`, **no `default` branch**, and `assertNever` in the fallthrough, so adding a seventh type is a build failure here (plan §5.3, FR-003). It also renders, once for all six types, each question's title, its optional `description` when present with **no empty element left behind when absent**, and a visible indication of whether an answer is required (FR-005) — placing it here means no question type can omit it. Depends on T005, T006.
- [x] T092 [P] [US1] Create `src/app/features/survey/questions/radio-question.ts` rendering a `role="radiogroup"` labelled by the question title, one radio per option in config order with the option's `label` as visible text, storing the option's `value`, and holding at most one value (FR-006; the minimum of two options is unrepresentable to break, via `AtLeastTwo` in T006). Depends on T067, T091.
- [x] T093 [P] [US1] Create `src/app/features/survey/questions/checkbox-question.ts` rendering a `fieldset` + `legend` naming the question, one checkbox per option in config order holding a set of selected values (FR-007), binding `[disabled]="!session.isOptionSelectable(question, option.value)()"` so options are non-selectable at `maxSelections` and selectable again after a de-selection (FR-017, US2 scenario 5) — the predicate is a computed signal in core, the template only binds its result — and rendering the hint `Select up to N options`. Depends on T067, T091.
- [x] T094 [P] [US1] Create `src/app/features/survey/questions/text-question.ts` serving **both** `textbox` (one line of free text) and `textarea` (multi-line) per FR-008, binding `[maxlength]="session.maxLengthOf(question)"` so the browser refuses excess input while `answer.validator.ts` checks the same `maxLength` again at Next and at Submit, because FR-015 requires both and a control constraint alone would fail open. Depends on T067, T091.
- [x] T095 [P] [US1] Create `src/app/features/survey/questions/rating-question.ts` rendering **one selectable star per integer when `scale.min >= 1`** and a **labelled row of numeric choices when `min` is 0**, reading `ratingPresentation` from `models` rather than deciding in the template (FR-009), plus a Clear action returning the question to unanswered (FR-060, US1 scenario 6). Each star is 44 × 44px at 375px (FR-058). Depends on T067, T091.
- [x] T096 [P] [US1] Create `src/app/features/survey/questions/satisfaction-question.ts` rendering **exactly five** choices with the five `SATISFACTION_LABELS` as **visible text**, storing the integers 1–5, offering no sixth and no zero value (FR-010, US2 scenario 11), plus a Clear action (FR-060). Depends on T067, T091.
- [x] T097 [US1] Create `src/app/features/survey/survey-page-body.ts` rendering the survey's optional `description` as visible text **above** the current page title and the page's optional `description` as visible text **below** it, with **nothing rendered in place of either when absent and no empty element left behind** (FR-073, US1 scenario 7); then the page's questions in array order via `<app-question-host />`. Carries an `effect()` that moves focus to the page heading after a successful Next (FR-029). Depends on T091.
- [x] T098 [US1] Create `src/app/features/survey/survey-navigation.ts` rendering `positionLabel` as text ("Page N of M", FR-032), a Previous control **disabled on page 1** (FR-031), Next or Submit according to `primaryAction` so Submit appears **only** on the last page (FR-033), and a busy state on Submit while `inputsLocked` is true (FR-039). Reads all four from core computed signals and decides nothing itself. Depends on T067.
- [x] T099 [US1] Create `src/app/features/survey/submission-confirmation.ts` rendering the `submitted` screen **alone**: the survey title, the text that the response was received, the `submissionId` as the respondent's reference, and a link to `/` — and **no question control** (US1 scenario 4). Depends on T012, T066.
- [ ] T100 [US1] Extend `src/app/features/survey/survey-page.html` with the `ready`, `editing`, `submitting` and `submitted` branches, each rendering exactly what FR-045 prescribes for that state and nothing it forbids: `ready` and `editing` render the title, page title, position, questions and Previous/Next with **no error**; `submitting` renders as `editing` with everything non-editable; `submitted` renders `<app-submission-confirmation />` and **no** question control. Depends on T097, T098, T099.
- [ ] T101 [P] [US1] Write `src/app/features/survey/survey-page.states.spec.ts` asserting each of the **eight** `ResponseState`s renders what FR-045 prescribes and nothing it forbids — in particular that `loading`, `configuration-error` and `submitted` each contain **zero** question controls (SC-005). Depends on T100.
- [ ] T102 [P] [US1] Write `src/app/features/survey/survey-page.end-to-end.spec.ts` covering US1 scenarios 1–5 and 8: page 1 "About You" renders with "Page 1 of 4", a disabled Previous and an enabled Next; a valid page 1 advances to "Your Experience" with "Page 2 of 4" and focus on the page-2 heading; a valid Submit on page 4 reports busy, makes all inputs non-editable and renders the confirmation **within 2s** (the simulated adapter answers within 1s per FR-036; FR-038's 15s bounds a real adapter, not this scenario); the confirmation shows the title, the received text, the reference and the link to `/`, and no question control; reopening from `/` starts at page 1 with every answer empty; and the document title is `Customer Feedback — Survey` on the survey route and `Surveys` at `/`. Depends on T100.
- [ ] T103 [P] [US1] Write `src/app/features/survey/questions/radio-question.spec.ts` asserting a `role="radiogroup"` labelled by the question title, options in config order, at most one value held, and `aria-invalid` plus `aria-describedby` wired when an error is present. Depends on T092.
- [ ] T104 [P] [US1] Write `src/app/features/survey/questions/checkbox-question.spec.ts` asserting the labelled group, options in config order, unselected options non-selectable at `maxSelections: 3` with 3 selected and selectable again after a de-selection, the hint `Select up to 3 options` (US2 scenario 5), and the error wiring. Depends on T093.
- [ ] T105 [P] [US1] Write `src/app/features/survey/questions/text-question.spec.ts` asserting `maxlength` is bound from `session.maxLengthOf`, that both `textbox` and `textarea` render through this one component, that **each of the two renders carries a programmatic label whose accessible name is that question's title** and is **not** wrapped in a `radiogroup` (FR-053 single-control form — assert the name's text, not merely its presence), and the error wiring. Depends on T094.
- [ ] T106 [P] [US1] Write `src/app/features/survey/questions/rating-question.spec.ts` asserting **stars when `scale.min >= 1`** and a **labelled numeric row when `min` is 0** (FR-009), that **the group is exposed as a labelled group whose accessible name is the question's title in both presentations** (FR-053 grouped form — assert the name's text, not merely its presence), that Clear returns the question to unanswered and Next is still accepted for an optional rating (US1 scenario 6), and that each star target is 44 × 44px. Depends on T095.
- [ ] T107 [P] [US1] Write `src/app/features/survey/questions/satisfaction-question.spec.ts` asserting **exactly five** choices with the five visible labels, that **the group is exposed as a labelled group whose accessible name is the question's title** (FR-053 grouped form — assert the name's text, not merely its presence), that selecting "Satisfied" stores the integer `4`, and that no sixth and no zero value is offered (US2 scenario 11). Depends on T096.
- [ ] T108 [P] [US1] Write `src/app/features/survey/survey-navigation.spec.ts` asserting "Page N of M" as text, Previous disabled on page 1 and on a single-page survey, Submit as the primary control only on the last page, and the busy state in `submitting`. Depends on T098.
- [ ] T109 [P] [US1] Write `src/app/features/survey/survey-page-body.spec.ts` asserting the survey `description` renders above the page title and the page `description` below it, that **no empty element remains** for a page without one (US1 scenario 7, FR-073), and that a page with zero questions renders its title and navigation. Depends on T097.
- [ ] T110 [P] [US1] Write `src/app/features/survey/submission-confirmation.spec.ts` asserting the title, the received text, the reference and the link to `/`, and that no question control is present. Depends on T099.
- [ ] T111 [P] [US1] Write `src/app/features/survey/questions/question-host.spec.ts` asserting each of the six types routes to its own component, and that the host renders the question title, renders the optional `description` only when the config supplies one, and shows a visible required indication on a required question and none on an optional one (FR-005). Depends on T091.

**Checkpoint**: **MVP.** A respondent can open the default fixture from the catalog, answer all four pages
and submit, and the confirmation names their reference. US4, US5 and US1 all work independently.

---

## Phase 8: User Story 2 — Blocked from advancing with invalid answers (Priority: P1)

**Goal**: a respondent who leaves a required or malformed answer cannot carry the problem forward; the first
offending field is focused, the reason is announced, and nothing already typed is lost.
**Owner**: Angular Engineer.

**Independent Test**: on each question type, supply an invalid value, activate Next, and assert the page
does not change, the specific FR-069 error text appears, and focus sits on the first offending control.

The rules themselves already exist (T025–T028) and the per-question `aria-invalid` / `aria-describedby`
wiring is built into T092–T096. This phase adds the page-level presentation and the focus movement, and
pins the scenarios.

- [ ] T112 [US2] Create `src/app/features/survey/validation-summary.ts` rendering an **assertive** region listing every invalid question **in page order**, each as a link to its own control, plus the FR-034 statement that there are answers to fix on more than one page when `scope` is `'survey'` and more than one page is invalid (FR-030, US6 scenario 6). Reads `PageValidationReport` / `SurveyValidationReport` from core and composes no message text. Depends on T010, T067.
- [ ] T113 [US2] Add the `validation-error` branch to `src/app/features/survey/survey-page.html` rendering as `editing` **plus** per-question errors, `<app-validation-summary />`, and refusing forward navigation and Submit; and add the `effect()` in `src/app/features/survey/survey-page-body.ts` that moves focus to `focusRequest` after a blocked Next, re-firing when the `token` changes so re-pressing Next on the same still-invalid question moves focus again (FR-030). Depends on T112.
- [ ] T114 [P] [US2] Write `src/app/features/survey/survey-page.validation.spec.ts` covering US2 scenarios 1–8 and 10–14 at the DOM level: an unselected required radio blocks Next, shows `Choose one option`, announces assertively and focuses the first radio of `q_segment`; `"  "` on a required `minLength: 2` textbox shows `Enter an answer`, not the length error; `"D"` shows `Use at least 2 characters`; 0 selections on `minSelections: 1` shows `Select at least 1 option` and focuses the first checkbox; an empty required satisfaction shows `Choose a value between 1 and 5`; two invalid questions on page 2 render both errors, list both in the summary in page order and focus the first; selecting an option clears that question's error **immediately** without activating Next; Previous is never blocked by validation; returning to a page shows answers intact with **no error text and no `aria-invalid` on any control**, and the error returns on the next Next (US2 scenario 12); a `maxSelections` breach arriving by any other route shows `Select no more than 3 options` and starts no submission (US2 scenario 13); and 81 trimmed characters against `maxLength: 80` shows `Use at most 80 characters` (US2 scenario 14). Together with the per-type specs T103–T107 this discharges **SC-003**: each of the six question types blocks Next on an invalid input. Depends on T113.
- [ ] T115 [P] [US2] Write `src/app/features/survey/validation-summary.spec.ts` asserting the region is assertive, lists invalid questions in page order with a link to each control, and states "more than one page" only when more than one page is invalid. Depends on T112.
- [ ] T116 [P] [US2] Write `src/app/features/survey/survey-page.retention.spec.ts` covering US2 scenario 9 and SC-012: with answers typed on pages 1 and 2, activating Previous twice and Next twice leaves **every** answer on pages 1, 2 and 3 exactly as it was, including attached file names, and shows no error for a page the respondent has not tried to leave forward. Depends on T113.

**Checkpoint**: US1, US2, US4 and US5 — all four P1 stories — work independently.

---

## Phase 9: User Story 3 — Attach supporting files to a question (Priority: P2)

**Goal**: a respondent can attach up to three files to a question that allows them, and is told immediately
and by name when a file is the wrong type, too large, a duplicate, or one too many.
**Owner**: Angular Engineer.

**Independent Test**: on `q_evidence` (`maxFiles: 3`, `acceptedTypes: ["image/png","image/jpeg","application/pdf"]`,
`maxSizeBytes: 5242880`) select valid, oversized, wrong-type, duplicate and over-count files and assert each
outcome.

- [ ] T117 [US3] Create `src/app/features/survey/questions/question-attachments.ts` rendering **nothing at all** when `question.attachments` is `null` — which covers both `maxFiles: 0` and an absent block (FR-021, US3 scenario 10); otherwise a file control, the counter `N of 3 files`, and the attachment list rendered from **`session.attachments()`, never from the input element's `value`** (FR-065), each row showing the file name, its size via `formatFileSize` and a Remove control (FR-025, FR-071). Rejections render from `session.attachmentRejections()`, one named error per rejected file. Forwards selections to `session.addFiles` and removals to `session.removeAttachment`; composes no message and decides no acceptance itself. Depends on T013, T071, T091.
- [ ] T118 [US3] Render `<app-question-attachments />` inside each question component's template via `question-host.ts`, so the policy is honoured on **any** of the six types (contract §2: `attachments` is allowed on any type). Done when `q_evidence` (a `textarea`) shows the control and `q_comments` (also a `textarea`, no policy) shows none. Depends on T117.
- [ ] T119 [P] [US3] Write `src/app/features/survey/questions/question-attachments.spec.ts` covering US3 scenarios 1–3 and 7–10: a 1 MB `receipt.pdf` is listed with its name and size, the counter reads `1 of 3 files` and no error shows; `notes.txt` is rejected with `notes.txt: this file type is not accepted (allowed: PNG, JPEG, PDF)`; a 6291456-byte `scan.png` is rejected with `scan.png: this file is larger than the 5 MB limit`; a 0-byte file is rejected with `empty.png: this file is empty`; removing one of three files makes the counter read `2 of 3 files`, re-opens the control and announces the removal; an optional `q_evidence` with 0 files passes Next; and a question whose policy is `null` renders **no** file control. Depends on T117.
- [ ] T120 [P] [US3] Write `src/app/features/survey/questions/question-attachments.survival.spec.ts` covering US3 scenario 11 and FR-065: with `receipt.pdf` (1048576 bytes) and `photo.png` (240000 bytes) attached to `q_evidence`, a Previous-to-page-2 then Next-back-to-page-3 round trip leaves both files listed with the same names and sizes, the counter still reading `2 of 3 files`, each still carrying a Remove control, and the submission payload for `q_evidence` still carrying both files' bytes. Depends on T117.
- [ ] T121 [P] [US3] Write `src/app/features/survey/questions/question-attachments.mixed.spec.ts` covering US3 scenarios 4–6 through the component: a three-file selection of `a.png` (valid), `b.txt` (wrong type) and an 8 MB `c.png` attaches `a.png` only and renders one named error per rejected file; with 2 files held, selecting 2 more valid files attaches the first in selection order, rejects the second with `You can attach up to 3 files to this question`, and leaves the counter at `3 of 3 files`; and a same-name same-size file is rejected with `a.png is already attached`. No rejected file is ever held (SC-004). Depends on T117.
- [ ] T122 [P] [US3] Write `src/app/features/survey/survey-page.attachment-submit.spec.ts` covering US6 scenario 7 and FR-027: an attachment that passed at selection time and no longer satisfies its question's rules at submit time starts **no** submission, renders that question's page in `validation-error` with the file named, and lists the file as rejected. Also asserts the research D16 case: `q_evidence` with a file attached and no text produces an answer entry carrying `""` with the attachment, rather than being dropped — this is the test that pins the plan §10 item 1 resolution. Depends on T117.

**Checkpoint**: US1–US5 all work independently. The highest-risk input path rejects bad files by name at
selection time and re-checks them before submit.

---

## Phase 10: User Story 6 — A failed submission does not lose answers (Priority: P2)

**Goal**: when submission fails the respondent keeps every answer and attachment and can try again; no
confirmation is ever shown for a submission that was not acknowledged.
**Owner**: Angular Engineer.

**Independent Test**: force the submission boundary to reject, assert the `submission-error` state, assert
all answers and attachments survive, then force success on retry and assert the confirmation.

- [ ] T123 [US6] Create `src/app/features/survey/submission-error-banner.ts` rendering an **assertive** region that names the failure using the `SubmissionFailure` message composed in `core` — never in this component — and offers a "Try again" action forwarding to `session.retry()` (FR-045). Depends on T012, T067.
- [ ] T124 [US6] Add the `submission-error` branch to `src/app/features/survey/survey-page.html` rendering **the last page as the respondent left it**, with answers and attachments intact and editable, `<app-submission-error-banner />`, and Previous and Next still working (FR-045, US6 scenario 4). Depends on T123.
- [ ] T125 [P] [US6] Write `src/app/features/survey/survey-page.submission-failure.spec.ts` using the test-only `FailingSurveyResponseGateway` and covering US6 scenarios 1–5 and 8: a transport failure renders an assertive error with "Try again", keeps page 4 visible and leaves every answer on every page unchanged; a boundary that never answers renders the timeout message at 15s and **no** confirmation (US6 scenario 2); "Try again" on an acknowledging boundary renders the confirmation with the returned reference; navigating to page 2, editing an answer and returning to page 4 makes Submit available again and clears the stale error; a second Submit during `submitting` starts no second submission; and HTTP 401 renders exactly `This survey is not accepting responses right now. Your answers are safe — try again.` with **no credential prompt and no login screen** (US6 scenario 8, FR-062). Depends on T058, T124.
- [ ] T126 [P] [US6] Write `src/app/features/survey/submission-error-banner.spec.ts` asserting the region is assertive, that each of the seven `SubmissionFailureKind` messages renders verbatim from contract §4, and that "Try again" forwards to `retry`. Depends on T123.
- [ ] T127 [P] [US6] Write `src/app/features/survey/survey-page.blocked-submit.spec.ts` covering US6 scenario 6: on page 4 with pages 1 and 3 invalid, Submit starts no submission, page 1 (the earliest invalid page) renders, focus moves to its first invalid control, and the summary states that there are answers to fix on more than one page. Depends on T113, T124.
- [ ] T128 [P] [US6] Write `src/app/features/survey/survey-page.idempotency.spec.ts` covering US6 scenario 9, SC-011 and contract tests 10 and 13: the first attempt's `clientSubmissionId` is re-sent unchanged on "Try again" with a **later** `submittedAt`; returning to `/` and reopening the survey produces a **different** `clientSubmissionId` on the next first Submit; and a Submit blocked by FR-034 generates **no** `clientSubmissionId`, so a respondent bounced once and then successful produces exactly one value. Depends on T124.

**Checkpoint**: all six user stories are independently functional. No failure path can reach the
confirmation screen, and no failure path loses an answer.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: the accessibility and responsiveness obligations that span every screen, and the five gates.
**Owner**: Angular Engineer (T129–T141), QA Engineer (T142–T148).

- [ ] T129 [P] Write `src/app/a11y.axe.spec.ts` running `axe-core` in jsdom against **each of the seven screens** SC-009 names — catalog, survey viewer, validation-error, submission-error, confirmation, configuration-error, not-found — asserting zero violations. The "survey viewer" screen is **all four pages of `customer-feedback.json`, swept one page at a time**, not page 1 alone: the viewer renders a single page per route and the fixture spreads the six question types across four pages (page 1 `textbox`/`radio`, page 2 `satisfaction`/`checkbox`/`rating`, page 3 `textarea`, page 4 `textarea`/`radio`), so a page-1-only sweep never sees four of the six types — `satisfaction`, `checkbox`, `rating` **and `textarea`**. Sweeping pages 1 and 2 is **not** enough either: `textarea` appears only on pages 3 and 4. Only all four pages reach all six types. Record in the file's header comment **three** limits, not two. The two from plan §Constitution-Check: jsdom computes no layout, so FR-057 (contrast) and FR-058 (reflow and target size) are **not** covered here and remain gate 5's. And one more: axe detects a **missing** accessible name, never a **wrong** one, so this sweep is not evidence for FR-053 — the per-type assertions in T103–T107 own that, and they assert the name's text. All three are statements of what the automated check can see, not a relaxation of any requirement (D20, A-07). Depends on T100, T113, T124.
- [ ] T130 [P] Verify in `src/app/features/**` and `src/app/shared/**` that no `.html` or component file contains a validation, transformation or submission expression, and that each component contains only the four things plan §6.2 permits. Done when a grep for `trim(`, `length >`, `JSON.`, `fetch(`, `.filter(`, `validate` across `src/app/features/**` and `src/app/shared/**` returns only forwarding calls into `core`, and the two deliberate bindings (`[maxlength]="session.maxLengthOf(...)"` and `[disabled]="!session.isOptionSelectable(...)()"`) are the only computed constraints in a template (plan §6.3). Depends on T124.
- [ ] T131 [P] Verify no component file declares a colour value: every colour reaches the UI through `src/styles/tokens.css` and `src/app/theme/survey-viewer-preset.ts` (FR-059, Principle V). Done when a grep for `#`, `rgb(`, `hsl(`, `maroon` across `src/app/features/**/*.css` and `src/app/shared/**/*.css` returns no colour literal. Depends on T124.
- [ ] T132 [P] Verify no NgModule, no `*ngIf` and no `*ngFor` exists anywhere under `src/app/`, and that every component declares `ChangeDetectionStrategy.OnPush` (Principle V). Done when a grep for `NgModule`, `*ngIf` and `*ngFor` returns nothing and every `@Component` block under `src/app/features/**` and `src/app/shared/**` carries `changeDetection: ChangeDetectionStrategy.OnPush`. Depends on T124.
- [ ] T133 [P] Verify there is no `any` anywhere under `src/app/core/**` and that unvalidated input is typed `unknown` (Principle Technology Constraints). Done when a grep for `: any`, `as any` and `<any>` under `src/app/core/**` returns nothing. Depends on T075.
- [ ] T134 [P] Verify every `switch` on a discriminant under `src/app/core/**` and `src/app/features/**` has **no `default` branch** and ends in `assertNever` (plan §5.3). Done when adding a seventh member to `QuestionType` in a scratch edit produces a compile error at every such switch, and the edit is reverted. Depends on T132.
- [ ] T135 [P] Add responsive styles for the 320px reflow floor with 375px and 1280px as the two gate widths, in `src/app/features/**/*.css` and `src/app/shared/**/*.css` using PrimeFlex layout utilities: no horizontal scrolling and no truncated control at any of the three widths, and 44 × 44px in **both** dimensions for any control whose label is an icon or a single character (FR-058). Depends on T124.
- [ ] T136 [P] Add a skip link to `src/app/app.html` targeting the main landmark on every screen, with a visible focus ring, and confirm full keyboard operation of every control with a focus indicator visible at every step (FR-056, Principle V). Depends on T077.
- [ ] T137 [P] Write `src/app/app.spec.ts` additions asserting the shell renders the skip link, both live regions and the router outlet, and nothing else. Depends on T077.
- [ ] T138 [P] Replace the remaining placeholder README content under `src/app/core/` if any survives T015, T030 or T075, so no `README.md` under `src/app/core/**` still describes an empty directory. Depends on T015, T030, T075.
- [ ] T139 Update `specs/001-survey-management/quickstart.md` only if a command or path in it drifted during implementation, recording the change and its reason. Do **not** edit `spec.md`: it is the Product Owner's, and a spec defect found here goes back to them (plan §9). Depends on T128.
- [ ] T140 [P] Confirm the three items plan §10 hands back to the Product Owner are implemented as the plan resolved them and are visible in the code: a question with attachments but no value reaches the payload with `""` (item 1, T059/T122); the sixth `unreadable` attachment reason carries the text `this file could not be read` (item 2, T022/T071); and the payload carries **no** `surveyVersion` (item 3, T012). Done when each is asserted by a named test and the three are listed in the implement task's comment for the Product Owner to confirm or overrule. Depends on T128.
- [ ] T141 [P] Confirm `src/index.html` still declares `lang="en"` and add the assertion that keeps it there (FR-077). Depends on T077.
- [x] T142 Run gate 1, `pnpm prettier --check .`, and fix any formatting it reports by running `pnpm prettier --write .`. Done when `--check` exits 0. **No Prettier ignore entry may be added** (Principle IV). Depends on T141.
- [x] T143 Run gate 2, `pnpm tsc --noEmit`, across both `tsconfig.app.json` and `tsconfig.spec.json`. Done when it exits 0 with no diagnostic. **No `tsconfig` flag may be loosened** (Principle IV). Depends on T142.
- [x] T144 Run gate 3, `pnpm vitest run --coverage`. Done when every test passes and statements, branches, functions and lines are **all >= 80%** as enforced by the runner, with the `text-summary` output pasted into the implement task's comment. **No file may be added to `coverage.exclude`, no threshold moved and no test skipped or marked expected-to-fail** (Principle IV). If branch coverage in `src/app/features/**` falls short, the fix is to move the branch into `core` per plan §6 — not to add a test that pads the number. Depends on T143.
- [x] T145 Run gate 4, `pnpm ng build`, and confirm the output lands in `dist/survey-viewer/browser`. Done when the build succeeds and the bundle contains **no** reference to `failing-survey-response.gateway` (T058, FR-068). Depends on T144.
- [x] T146 Run gate 5, the browser smoke test at **375px and 1280px**, walking `quickstart.md` scenarios 1–8. Done when every scenario behaves as written, there is no horizontal scrolling and no truncated control at either width (SC-008), text contrast is at least 4.5:1 (FR-057 — this gate's, not `axe-core`'s), and every icon or single-character target measures at least 44 × 44px. Record the result and any screenshot per width. Depends on T145.
- [x] T147 Measure SC-013: add `public/surveys/product-pulse.json` plus its one manifest entry, confirm it appears in the catalog and opens, then remove both. Done when `git diff --stat -- src/app` reports **no change** across the whole add-and-remove cycle. This is the measurement of FR-004 and of Principle I's central claim. Depends on T042, T146.
- [ ] T148 Map every spec acceptance scenario to the named test that covers it, in a table in the implement task's comment: US1 scenarios 1–8, US2 scenarios 1–14, US3 scenarios 1–11, US4 scenarios 1–11, US5 scenarios 1–8, US6 scenarios 1–9, plus SC-001 to SC-014 and contract tests 1–13 from `contracts/response-submission.md` §7. Done when no scenario and no contract test is unmapped (SC-010). An unmapped scenario is a missing test, not an acceptable gap. Depends on T146.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependency — starts immediately.
- **Phase 2 (Foundational: models + validators)**: depends on Phase 1. **Blocks Phases 3–10.** Within it:
  2A (models) → 2B (model tests) and 2C (validators) → 2D (validator tests). 2B and 2C can overlap.
- **Phase 3 (Content)**: T040–T042 depend on Phase 2A only, so they run **in parallel with 2C/2D**.
  T043–T045 depend on T023/T024. Phase 3 blocks nothing except T088 and T147.
- **Phase 4 (Foundational: services)**: depends on Phase 2. **Blocks Phases 5–10.** Three parallel tracks;
  Track C's T067 is the join point and depends on Tracks A and B.
- **Phase 5 (US4)**: depends on Phase 4 Track A. First demoable increment.
- **Phase 6 (US5)**: depends on Phase 5 (T078, T079 and the shell), plus T049.
- **Phase 7 (US1)**: depends on Phase 6 (the survey-page shell) and Phase 4 Tracks B and C. **MVP.**
- **Phase 8 (US2)**: depends on Phase 7 (the question components carry the `aria-*` wiring).
- **Phase 9 (US3)**: depends on Phase 7 (T091 `question-host`) and T071.
- **Phase 10 (US6)**: depends on Phase 7 (T100) and T058; T127 also depends on Phase 8's T113.
- **Phase 11 (Polish)**: depends on all six stories. The five gate tasks T142–T146 run **in order**.

### User story dependencies

These are real edges, not couplings to be removed: each later story's screen is an extension of an earlier
story's screen, because all six stories share one route and one state machine.

- **US4 (P1)** — independent after Phase 4. The only story with no story dependency.
- **US5 (P1)** — needs US4's `configuration-error` and `not-found` screens and the shell. Independently testable.
- **US1 (P1)** — needs US5's `survey-page` shell (its `loading` and `configuration-error` branches). Independently testable.
- **US2 (P1)** — needs US1's six question components, which carry the FR-054 `aria-*` wiring. Independently testable.
- **US3 (P2)** — needs US1's `question-host`. Independently testable.
- **US6 (P2)** — needs US1's `submitted` path and the Phase 4 gateways. Independently testable; T127 also reads US2's summary.

### Within each phase

- Models before validators; validators before services; services before components (the issue's explicit
  ordering requirement, and plan §8's edge set).
- A spec task never precedes the file it tests, because the done-condition of each implementation task is
  checked by its spec task.
- Core implementation before the DOM assertions that read it.

### Parallel opportunities

- **Phase 2A**: T005, T007, T008, T010, T012, T013, T014 are all `[P]` once T004 lands. T006 blocks T009 and T011.
- **Phase 2B**: T016–T020 are fully parallel.
- **Phase 2C**: T024, T025, T026, T029 are `[P]` once T021/T022 land. T023 is the long pole (50 rules).
- **Phase 2D**: T031–T039 are fully parallel — nine spec files, nine subjects.
- **Phase 3**: T040, T041, T042 are fully parallel and overlap all of Phase 2C/2D. **Different owner, so this
  is real wall-clock parallelism, not just independence.**
- **Phase 4**: Tracks A, B and C run concurrently. Within Track B, T053, T054, T055, T059 are `[P]`, as are
  all six spec tasks T060–T064.
- **Phase 7**: the six question components T092–T096 are fully parallel, as are the eleven spec tasks T101–T111.
- **Phase 11**: T129–T138, T140 and T141 are parallel; the gates T142–T146 are strictly sequential.

---

## Parallel Example: Phase 2D (validator tests)

```bash
# Nine spec files, nine independent subjects — launch together:
Task: "Write src/app/core/validators/json-reader.spec.ts"                   # T031
Task: "Write src/app/core/validators/messages.spec.ts"                      # T032
Task: "Write src/app/core/validators/survey-config.validator.spec.ts"       # T033
Task: "Write src/app/core/validators/survey-manifest.validator.spec.ts"     # T034
Task: "Write src/app/core/validators/answer.validator.spec.ts"              # T035
Task: "Write src/app/core/validators/attachment.validator.spec.ts"          # T036
Task: "Write src/app/core/validators/page.validator.spec.ts"                # T037
Task: "Write src/app/core/validators/survey.validator.spec.ts"              # T038
Task: "Write src/app/core/validators/submission-receipt.validator.spec.ts"  # T039
```

## Parallel Example: Phase 3 against Phase 2C — two owners at once

```bash
# Survey Content Author, needing only the types from T015:
Task: "Create public/survey-manifest.json"                     # T040
Task: "Create public/surveys/customer-feedback.json"           # T041
Task: "Create public/surveys/product-pulse.json"               # T042

# Angular Engineer, at the same time:
Task: "Create src/app/core/validators/survey-config.validator.ts"    # T023
Task: "Create src/app/core/validators/survey-manifest.validator.ts"  # T024
```

## Parallel Example: Phase 7 (the six question components)

```bash
Task: "Create src/app/features/survey/questions/radio-question.ts"         # T092
Task: "Create src/app/features/survey/questions/checkbox-question.ts"      # T093
Task: "Create src/app/features/survey/questions/text-question.ts"          # T094
Task: "Create src/app/features/survey/questions/rating-question.ts"        # T095
Task: "Create src/app/features/survey/questions/satisfaction-question.ts"  # T096
```

---

## Implementation Strategy

### Contract first, then the first visible increment

1. Phase 1 — Setup (3 tasks).
2. Phase 2 — the whole contract as types and pure validators, tested (36 tasks). **This is the
   Principle II gate; nothing effectful starts before it closes.**
3. Phase 3 — hand the Survey Content Author the types and let Content run concurrently from here on.
4. Phase 4 — the service layer, three tracks in parallel (30 tasks).
5. Phase 5 — **US4**: `/` lists surveys from the manifest. **Stop and validate**: the catalog is demoable
   and Principle I is already observable — a survey is a file plus an entry.

### MVP

6. Phase 6 — **US5**: a broken config is a dead end that names itself and renders no part of the survey.
7. Phase 7 — **US1**: a respondent completes and submits the default fixture. **Stop and validate: this is
   the MVP.** Run gates 1–4 here, not only at the end.

### Incremental delivery after the MVP

8. Phase 8 — **US2**: blocked navigation, focus, assertive summary. Completes the four P1 stories.
9. Phase 9 — **US3**: attachments (P2).
10. Phase 10 — **US6**: submission failure and retry (P2).
11. Phase 11 — accessibility, responsiveness, and the five gates in order. Gate 5 and the
    scenario-to-test map are the QA Engineer's.

Each step adds value without breaking the previous one, and each checkpoint above is a safe place to stop.

### Parallel team strategy

- **Angular Engineer** drives Phases 1, 2, 4, 5–10 and the app half of Phase 11, taking the `[P]` groups
  concurrently where the edges allow.
- **Survey Content Author** starts Phase 3 the moment T015 lands and finishes it while Phase 2C/2D is still
  running. Their only inbound edge after that is T023/T024 for the contract test.
- **QA Engineer** writes the scenario-to-test map (T148) alongside Phases 5–10 rather than after them, and
  owns gate 5 (T146) and the gate runs T142–T145.
- **Code Reviewer** reviews after Phase 11 and writes no fix. Principle IV requires the agent who wrote the
  spec, the agent who wrote the code and the agent who reviewed it to be three different agents.

---

## Notes

- `[P]` means different files and no dependency on an incomplete task.
- `[US#]` maps a task to a user story for traceability; Setup, Foundational, Content and Polish tasks
  carry none by design.
- Commit after each task or logical group. Every commit message ends with
  `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- **`spec.md` is not editable from here.** If implementation finds the spec wrong or incomplete, record it
  and hand it back to the Product Owner (plan §9).
- **No gate may be relaxed** to make a run pass — not a coverage exclusion, not a `tsconfig` flag, not a
  Prettier ignore, not a skipped test. Principle IV names all four as violations, not workarounds.
- If a task fails twice, stop and re-plan rather than retrying a third time (Constitution, Development
  Workflow).
- **Next stage**: `/speckit-analyze` must report **no CRITICAL and no HIGH** finding before
  `/speckit-implement` starts, and the finding counts by severity must be reported as evidence.

---

## Summary

| Phase                                  | Tasks     | Count   | Owner                 |
| -------------------------------------- | --------- | ------- | --------------------- |
| 1 — Setup                              | T001–T003 | 3       | Angular Engineer, QA  |
| 2A — Models                            | T004–T015 | 12      | Angular Engineer      |
| 2B — Model tests                       | T016–T020 | 5       | Angular Engineer      |
| 2C — Validators                        | T021–T030 | 10      | Angular Engineer      |
| 2D — Validator tests                   | T031–T039 | 9       | Angular Engineer      |
| 3 — **Content**                        | T040–T045 | 6       | Survey Content Author |
| 4 — Services (3 parallel tracks)       | T046–T075 | 30      | Angular Engineer      |
| 5 — **US4** catalog (P1)               | T076–T085 | 10      | Angular Engineer      |
| 6 — **US5** fail closed (P1)           | T086–T089 | 4       | Angular Engineer      |
| 7 — **US1** end to end (P1) 🎯 MVP     | T090–T111 | 22      | Angular Engineer      |
| 8 — **US2** blocked navigation (P1)    | T112–T116 | 5       | Angular Engineer      |
| 9 — **US3** attachments (P2)           | T117–T122 | 6       | Angular Engineer      |
| 10 — **US6** submission failure (P2)   | T123–T128 | 6       | Angular Engineer      |
| 11 — Polish, accessibility, five gates | T129–T148 | 20      | Angular Engineer, QA  |
| **Total**                              |           | **148** |                       |

**Content tasks**: 6 (T040–T045), Survey Content Author.
**Application tasks**: 142, Angular Engineer, of which T003 and T142–T148 are the QA Engineer's gate runs.
