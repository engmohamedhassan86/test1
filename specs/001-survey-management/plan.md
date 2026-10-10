# Implementation Plan: Dynamic Survey Viewer

**Branch**: `001-survey-management` | **Date**: 2026-10-08 | **Spec**: [`spec.md`](./spec.md)
**Stage**: `/speckit-plan` | **Author**: Solution Architect
**Constitution**: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) v1.0.0

**Input**: Feature specification from [`specs/001-survey-management/spec.md`](./spec.md) — checklisted,
no open clarifications.

**Phase artifacts**

| Artifact                                                                 | Phase | Contents                                                             |
| ------------------------------------------------------------------------ | ----- | -------------------------------------------------------------------- |
| [`research.md`](./research.md)                                           | 0     | Twenty decisions (D1–D20) with rationale and rejected alternatives   |
| [`data-model.md`](./data-model.md)                                       | 1     | The whole TypeScript domain model, state machine, and validation map |
| [`contracts/survey-json.md`](./contracts/survey-json.md)                 | 1     | Part B added: typed model, 61-rule validator list, worked examples   |
| [`contracts/response-submission.md`](./contracts/response-submission.md) | 1     | Part B added: payload type, gateway, three adapters, HTTP mapping    |
| [`quickstart.md`](./quickstart.md)                                       | 1     | How to prove the feature works, gate by gate                         |
| `tasks.md`                                                               | 2     | **Not** produced here — `/speckit-tasks` owns it                     |

## Summary

Render a multi-page survey from a JSON config that is validated in full before anything of it is shown,
let a respondent answer it with validation enforced both before leaving a page and before submitting, and
hand the result across exactly one typed boundary.

The technical approach is contracts-first in the strict sense of Principle II: the whole feature is
settled as types and service interfaces in [`data-model.md`](./data-model.md) and the two contracts before
any component exists, and the types are shaped so that the spec's fail-closed rules are mostly
unrepresentable to break rather than merely forbidden. The three structural choices that carry the design:

1. **The authored JSON has no type.** It is `unknown` until a validator narrows it, so a `Survey` value
   cannot exist without having passed validation. FR-042 is a property of the type system.
2. **One signal-backed session service is the only mutable state**, and answers/attachments live outside
   the `ResponseState` variant, so "a failed submission preserves the answers" is structural rather than
   remembered.
3. **`ResponseState` variants carry only their own data**, and FR-046's legal edges are a frozen table in
   `models` that every state write passes through — so `submitted` has one incoming edge and no outgoing
   one, by construction.

## Technical Context

**Language/Version**: TypeScript 6.0 (`~6.0.2`), `strict: true`, `strictTemplates: true`,
`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
`noPropertyAccessFromIndexSignature`. **No `any` anywhere in `src/app/core/**`** — unvalidated input is
`unknown`.

**Framework**: Angular 22.2 — standalone components only, signals for all state, `ChangeDetectionStrategy.OnPush`
on every component, `@if`/`@for` control flow. No NgModules, no `*ngIf`, no `*ngFor`.

**Primary Dependencies**: PrimeNG 22.1 with `@primeuix/themes` 3 (maroon preset already in
`src/app/theme/survey-viewer-preset.ts`), PrimeFlex 4 for layout, `@angular/router`, `@angular/forms`.
**One devDependency to add**: `axe-core`, for SC-009 (D20).

**Storage**: None. Answers and attachment bytes live in memory for the visit only; nothing is written to
`localStorage` or `sessionStorage` (spec Edge Cases). Survey configs are static files under `public/`.

**Testing**: Vitest 5 in jsdom, via `vitest.config.ts` (the gate command is `pnpm vitest run --coverage`).
Coverage is measured over `src/app/**/*.ts` with 80% thresholds on statements, branches, functions and
lines, enforced by the runner. `axe-core` run in-process against rendered jsdom documents.

**Target Platform**: Evergreen browsers, SPA, no SSR. Build output `dist/survey-viewer/browser`, deployed
to Vercel and Cloudflare with an index fallback — which is why FR-076 exists and why the fetch layer
judges a response by its body and not its status.

**Project Type**: Single-project Angular SPA. No backend in this feature; the real endpoint
`POST /api/survey-responses` is contracted but not implemented, and the default adapter is simulated.

**Performance Goals**: SC-002 — the catalog list within 1s of the manifest response and the first question
within 1s of the config response, on a mid-range mobile device. Routes are lazy (`loadComponent`), so the
survey bundle is not downloaded to view the catalog.

**Constraints**: 10s deadline on a manifest or config fetch (FR-075); 15s deadline on a submission
(FR-038); at most one in-flight submission per session (FR-039); 3 files × 10 MB worst case held in
memory per attachment-enabled question; WCAG 2.1 AA; reflow to 320px with 375px and 1280px as the gate
widths.

**Scale/Scope**: Seven screens (catalog, survey viewer, validation-error, submission-error, confirmation,
configuration-error, not-found); six question types; one four-page default fixture; 19 configuration
failure classes; 10 validation message rows; 7 submission failure kinds.

**Unknowns**: none. The spec carries no `NEEDS CLARIFICATION` marker, nine clarifications were decided in
`/speckit-clarify`, and the fourteen defects `/speckit-checklist` found were fixed before this stage. The
three places the inputs did not reach are resolved in [`research.md`](./research.md) D16–D18 and listed in
§10 below for Product Owner confirmation; none blocks implementation.

## Constitution Check

_Gate: must pass before Phase 0. Re-checked after Phase 1 — result at the end of this section._

| Principle                                         | How this plan satisfies it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Verdict |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **I — JSON-driven, fails closed**                 | A survey is a file under `public/` plus one manifest entry; no path in §6 requires a change under `src/app/**` to add one, and SC-013 measures that with `git diff --stat -- src/app`. Validation is 61 rules (`contracts/survey-json.md` §9) in which unknown fields (R04/R12/R22/R46/R55), unknown types (R21) and broken ids (R15/R25/R33/R58) are failures. The authored JSON is `unknown` until a validator narrows it, so no partially rendered survey is constructible.                                                        | PASS    |
| **II — Feature isolation, contracts first**       | This stage produces the complete typed surface before any component: `data-model.md` plus Part B of both contracts. All business logic is placed in `src/app/core/{models,validators,services}` by §5; §6 states that components hold no validation, transformation or submission expression, and names the two control-level rules that are exposed as computed data instead. Submission crosses one boundary, `SurveyResponseGateway`.                                                                                              | PASS    |
| **III — Validation before navigation and submit** | Stated as a single table in `data-model.md` §10 and again in §4.3 below: Next validates the current page; Submit validates every page in order **and** re-checks every attachment; Previous validates nothing and is never blocked. Attachments are 0–3 per question, checked at selection time in the five-step FR-023 order and again before submit. `submitted` is reachable only from `submitting` and only on a body that passes `isSubmissionReceipt`.                                                                          | PASS    |
| **IV — Quality gates**                            | §7 gives a four-layer test strategy sized to clear 80% on all four coverage metrics with no exclusion added, no threshold moved, and no test skipped. The one `tsconfig.app.json` change (§5.4) excludes the test-only adapter from the **app** compilation while leaving it type-checked by `tsconfig.spec.json` and counted by coverage — it relaxes nothing. `/speckit-analyze` runs as a separate subtask after `/speckit-tasks` and must report no CRITICAL and no HIGH. Spec, code and review stay with three different agents. | PASS    |
| **V — Accessible, responsive, on-brand**          | §6.4 places the label, `aria-invalid`/`aria-describedby`, live-region and focus obligations per component; FR-077's titles are a pure function and the `lang="en"` declaration is already in `src/index.html`. Colour reaches the UI only through the existing token layer (`src/styles/tokens.css`, `src/app/theme/`); no component file declares a colour. Every component is standalone, signal-based and `OnPush`, and no NgModule is introduced.                                                                                 | PASS    |

**Documented limitation carried forward.** WCAG 2.1 AA criterion 1.3.5 (Identify Input Purpose) is not met
for the fixture's `q_name`, recorded under spec Assumptions with a justification and a removal plan. This
plan does not change it and does not need to: the fix is a new optional `inputPurpose` field on `textbox`,
which is a change to `contracts/survey-json.md` and therefore the Product Owner's. The removal plan stands
as written.

**Two limits of the automated accessibility check**, stated so nobody reads SC-009 passing as more than it
is: jsdom computes no layout, so FR-057 (contrast) and FR-058 (reflow and target size) are **not** covered
by `axe-core` and remain gate 5's — the manual browser smoke test at 375px and 1280px, owned by the QA
Engineer. This is a statement about what the automated check can see, not a relaxation of either
requirement.

**Post-Phase-1 re-check**: PASS, unchanged. Phase 1 added no dependency, no NgModule, no logic in a
component, and no `any`. The one new devDependency is `axe-core`, which exists to _serve_ Principle IV
rather than to work around it.

**Complexity tracking**: no entries. The Constitution Check has no violation to justify.

## 1. Project structure

### 1.1 Documentation (this feature)

```text
specs/001-survey-management/
├── spec.md                          # Product Owner — unchanged by this stage
├── plan.md                          # This file
├── research.md                      # Phase 0: D1–D20
├── data-model.md                    # Phase 1: the TypeScript domain model
├── quickstart.md                    # Phase 1: how to prove it works
├── checklists/                      # /speckit-checklist — unchanged by this stage
│   ├── accessibility.md
│   ├── completeness.md
│   ├── fail-closed.md
│   ├── responsive.md
│   └── validation.md
├── contracts/
│   ├── survey-json.md               # Part A: Product Owner. Part B: added here
│   └── response-submission.md       # Part A: Product Owner. Part B: added here
└── tasks.md                         # /speckit-tasks — not created here
```

### 1.2 Source code

```text
src/
├── index.html                       # already declares lang="en" (FR-077)
├── styles.css, styles/tokens.css    # the only place a colour value exists
└── app/
    ├── app.ts / app.html / app.css  # shell: skip link, live regions, <router-outlet />
    ├── app.config.ts                # + withComponentInputBinding(), gateway + timeout providers
    ├── app.routes.ts                # '', 'surveys/:surveyKey', '**'
    ├── theme/survey-viewer-preset.ts
    ├── core/
    │   ├── models/
    │   │   ├── branded.ts                     # SurveyKey, PageId, QuestionId, OptionValue, NonEmpty, AtLeastTwo
    │   │   ├── survey.model.ts                # Question union, Survey, SurveyPage, SurveyOption, AttachmentPolicy
    │   │   ├── survey-manifest.model.ts       # SurveyManifest(+Entry), CatalogState, SurveyKeyResolution
    │   │   ├── survey-config-error.model.ts   # ConfigFailureCode F01–F19, ConfigIssue, SurveyConfigError
    │   │   ├── answer.model.ts                # Answer, AnswerInput, AnswerMap, SessionAttachment, AttachmentMap
    │   │   ├── validation.model.ts            # ValidationRuleId, ValidationError, Page/SurveyValidationReport
    │   │   ├── response-state.model.ts        # ResponseState, RESPONSE_STATE_TRANSITIONS, canTransition, SurveyScreen
    │   │   ├── survey-response.model.ts       # SurveyResponse, AnswerEntry, AttachmentDescriptor, SubmissionResult
    │   │   ├── display-format.ts              # FR-071 file size, FR-072 accepted-type labels
    │   │   └── screen-title.ts                # FR-077 document titles
    │   ├── validators/
    │   │   ├── json-reader.ts                 # requireObject/String/Int/Boolean/Array, rejectUnknownKeys, code points
    │   │   ├── survey-config.validator.ts     # unknown -> SurveyValidation (R03–R52)
    │   │   ├── survey-manifest.validator.ts   # unknown -> ManifestValidation (R53–R61)
    │   │   ├── messages.ts                    # FR-069 catalogue, FR-023 reasons, submission failure messages
    │   │   ├── answer.validator.ts            # FR-012 to FR-018, FR-070 — one question
    │   │   ├── attachment.validator.ts        # FR-023's five checks, in order
    │   │   ├── page.validator.ts              # FR-029, FR-030 — one page
    │   │   ├── survey.validator.ts            # FR-034 — all pages, earliest invalid
    │   │   └── submission-receipt.validator.ts# isSubmissionReceipt
    │   └── services/
    │       ├── survey-timeouts.ts             # SURVEY_TIMEOUTS token: { fetchMs: 10_000, submitMs: 15_000 }
    │       ├── json-fetch.service.ts          # the only fetch(); body decides, 10s deadline
    │       ├── id-factory.service.ts          # clientSubmissionId, attachment ids
    │       ├── survey-catalog.service.ts      # manifest, memoised per visit; CatalogState
    │       ├── survey-loader.service.ts       # config fetch + validate
    │       ├── attachment-codec.service.ts    # File -> Uint8Array, Uint8Array -> base64
    │       ├── survey-response-payload.ts     # pure: session state -> SurveyResponse
    │       ├── survey-response.gateway.ts     # abstract SurveyResponseGateway
    │       ├── simulated-survey-response.gateway.ts
    │       ├── http-survey-response.gateway.ts
    │       ├── survey-session.service.ts      # THE source of truth
    │       ├── announcer.service.ts           # polite / assertive live-region signals
    │       ├── document-title.service.ts      # writes the title from screen-title.ts
    │       └── testing/
    │           └── failing-survey-response.gateway.ts   # excluded from tsconfig.app.json
    ├── features/
    │   ├── catalog/
    │   │   └── catalog-page.ts / .html / .css
    │   └── survey/
    │       ├── survey-page.ts / .html / .css            # switches on SurveyScreen / ResponseState
    │       ├── survey-page-body.ts                      # the current page's heading + questions
    │       ├── survey-navigation.ts                     # Previous / "Page N of M" / Next or Submit
    │       ├── validation-summary.ts                    # page-level summary, assertive
    │       ├── submission-confirmation.ts               # the `submitted` screen
    │       ├── submission-error-banner.ts               # the `submission-error` banner + Try again
    │       └── questions/
    │           ├── question-host.ts                     # @switch on question.type
    │           ├── radio-question.ts
    │           ├── checkbox-question.ts
    │           ├── text-question.ts                     # textbox and textarea
    │           ├── rating-question.ts                   # stars or numeric row (FR-009)
    │           ├── satisfaction-question.ts
    │           └── question-attachments.ts
    └── shared/
        ├── configuration-error.ts                       # the error screen (both scopes)
        ├── not-found-page.ts                            # route '**' and an unknown surveyKey
        └── live-region.ts                               # two aria-live regions, fed by AnnouncerService

public/
├── survey-manifest.json
└── surveys/
    ├── customer-feedback.json                           # the default fixture (FR-052)
    └── ...                                              # a second survey proves SC-013
```

**Structure decision.** Single project, no monorepo split: there is one deployable, the Angular SPA, and
the only "backend" is a contracted endpoint that does not exist yet. `core/` versus `features/` is not a
style preference here — it is the constitution's boundary, and the Code Reviewer's test for Principle II
is "does any file under `features/` or any `.html` contain a validation, transformation or submission
expression". `shared/` holds the three presentational pieces that belong to neither feature; it contains no
logic, so it does not weaken the `core/` rule.

Test files sit beside their subjects as `*.spec.ts`, which is what `vitest.config.ts` already includes.

## 2. Routing

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Surveys', // FR-077
    loadComponent: () => import('./features/catalog/catalog-page').then((m) => m.CatalogPage),
  },
  {
    // No static `title`: this screen's title depends on the survey and on the state
    // (FR-077 gives three different titles), so DocumentTitleService sets it.
    path: 'surveys/:surveyKey',
    loadComponent: () => import('./features/survey/survey-page').then((m) => m.SurveyPage),
  },
  {
    path: '**',
    title: 'Survey not found', // FR-051, FR-077
    loadComponent: () => import('./shared/not-found-page').then((m) => m.NotFoundPage),
  },
];
```

```ts
// src/app/app.config.ts — the three additions
(provideRouter(routes, withComponentInputBinding()),
  { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
  { provide: SurveyResponseGateway, useClass: SimulatedSurveyResponseGateway });
```

Four decisions this encodes:

- **No resolver and no guard.** `SurveyPage` takes `surveyKey` as a routed `input()`
  (`withComponentInputBinding`) and drives `SurveyCatalogService.resolve` then `SurveyLoaderService.load`
  itself. A resolver would have to own the `loading`, `not-found` and `configuration-error` outcomes that
  FR-045/FR-050/FR-066 place in the viewer, and it would duplicate the manifest cache FR-067 already
  requires `SurveyCatalogService` to hold.
- **Page position is not in the URL.** Spec Edge Cases: opening a survey always starts at page 1. There is
  no `/surveys/:key/:page` route and no query parameter.
- **Lazy routes.** SC-002's 1s budget for the catalog should not pay for the survey bundle.
- **`'**'` is the not-found screen**, which is the same component an unknown `surveyKey` renders
  (FR-050, FR-051). It is reached two ways and renders one way.

The shell (`app.html`) is reduced to the skip link, `<app-live-region />` and `<router-outlet />`. The
foundation's placeholder card content is removed — the foundation's own comment says survey rendering
"will live behind the router outlet" — and `app.spec.ts` is updated with it.

## 3. The `ResponseState` machine

The union, the data each variant carries, and the transition table are in
[`data-model.md`](./data-model.md) §8, which is the normative statement. Summarised here because the task
asks for it explicitly:

| State                 | Carries                                                                                                             | What the respondent sees (FR-045)                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loading`             | `surveyKey: string`                                                                                                 | Busy indication, announced politely. No question, no control, no error.                                                                                  |
| `ready`               | `survey: Survey`                                                                                                    | Title, page title, "Page N of M", the page's questions, Previous/Next. No error.                                                                         |
| `editing`             | `survey: Survey`                                                                                                    | As `ready`, with entered values retained — including on pages not shown.                                                                                 |
| `validation-error`    | `survey`, `scope: 'page' \| 'survey'`, `page: PageValidationReport`, `surveyReport: SurveyValidationReport \| null` | As `editing`, plus per-question errors, `aria-invalid`, an assertive summary, focus on the first invalid control. Forward navigation and Submit refused. |
| `submitting`          | `survey`                                                                                                            | As `editing`, everything non-editable, Submit busy, announced politely.                                                                                  |
| `submitted`           | `survey`, `receipt: SubmissionReceipt`                                                                              | The confirmation screen alone. No question control. Session answers discarded.                                                                           |
| `submission-error`    | `survey`, `failure: SubmissionFailure`                                                                              | The last page as left, answers and attachments intact, assertive error, "Try again".                                                                     |
| `configuration-error` | `error: SurveyConfigError`                                                                                          | The error screen alone, with a link to `/`.                                                                                                              |

`loading` and `configuration-error` carry **no** `Survey`, so a template branch for either cannot read
survey data — FR-040 and FR-042 enforced by the compiler rather than by review.

**Legal transitions** (FR-046), as the frozen table in `response-state.model.ts`:

```text
loading             -> ready | configuration-error
ready               -> editing | validation-error
editing             -> editing | validation-error | submitting
validation-error    -> validation-error | editing
submitting          -> submitted | submission-error
submitted           -> (terminal)
submission-error    -> submission-error | editing | submitting
configuration-error -> (terminal)
```

Every state write in `SurveySessionService` goes through one private `transitionTo()` that asserts
`canTransition(from, to)` and throws on a violation, so the table is the enforcement and not a comment.
Four consequences are the fail-closed core of the feature: `submitted` has no outgoing edge; `submitted`
has exactly one incoming edge, from `submitting`; `submitting` has no self-edge, so a second Submit is
refused by the table (FR-039); and `configuration-error` is terminal, so the only way out is a navigation
to `/` that destroys the component.

The three self-edges are the only departure from a literal reading of FR-046, which constrains transitions
between _distinct_ states. They are justified row by row in [`data-model.md`](./data-model.md) §8.1, and
each is behaviour the spec requires: re-pressing Next on a still-invalid page (US2 scenarios 1, 13),
editing another answer, and navigating while a submission error stands (FR-045's "Previous and Next still
work", US6 scenario 4).

`ready` versus `editing` is the `dirty` signal, nothing more: `dirty` flips on the first answer or
attachment change of the session (D9). Navigation alone never changes the kind.

The catalog has its own four-state machine (FR-074) as `CatalogState`, and the not-found screen belongs to
neither — which is what `SurveyScreen` in [`data-model.md`](./data-model.md) §8.2 says in types.

## 4. The services

Full type declarations are in [`data-model.md`](./data-model.md). This section is the behavioural
specification of each seam.

### 4.1 `SurveyCatalogService` — manifest-driven catalog

```ts
@Injectable({ providedIn: 'root' })
export class SurveyCatalogService {
  /** FR-074's four states, for the catalog screen. */
  readonly state: Signal<CatalogState>;

  /** Fetches at most once per visit; every later caller awaits the same promise. */
  load(): Promise<ManifestValidation>;

  /** FR-050 / FR-066: found | not-found | catalog-error — never not-found for an unreadable manifest. */
  resolve(surveyKey: string): Promise<SurveyKeyResolution>;
}
```

- The manifest **promise** is memoised in a private field, not the value (D11). Root-provided, so its
  lifetime is the visit and a reload refetches — FR-067, US4 scenario 8. Memoising the promise also
  collapses the race where `/` and a deep link both ask before either answers; memoising the value would
  allow two concurrent fetches.
- `state` is `loading` until the promise settles, then `ready` with a `NonEmpty` entry list, `empty`, or
  `configuration-error`. `ready` cannot be empty — that case _is_ `empty` (FR-048, FR-074), and the type
  says so.
- `resolve` returns `catalog-error` whenever `load` failed, for any reason and at any route. FR-066: an
  unresolvable key is never reported as unknown, because without the manifest the key cannot be resolved
  either way.
- Nothing is cached in browser storage.

### 4.2 `SurveyLoaderService` and `JsonFetchService`

```ts
export type JsonFetchResult =
  | { readonly outcome: 'json'; readonly value: unknown; readonly status: number }
  | { readonly outcome: 'unreadable'; readonly status: number | null }
  | { readonly outcome: 'timeout' };

@Injectable({ providedIn: 'root' })
export class JsonFetchService {
  fetchJson(url: string, deadlineMs: number): Promise<JsonFetchResult>;
}

@Injectable({ providedIn: 'root' })
export class SurveyLoaderService {
  load(entry: SurveyManifestEntry): Promise<SurveyValidation>;
}
```

`JsonFetchService` is the only `fetch` call in the feature, and it is the single place two non-obvious
rules live (D10):

- **The body decides, not the status** (FR-076). `outcome: 'json'` requires a body that `JSON.parse`
  accepted; a 200 carrying the deployment's HTML index is `unreadable`. The `status` is returned only so
  the caller can choose between failure code F18 and F01, which share their respondent-facing wording.
- **An unanswered request is a failure** (FR-075). The deadline is an `AbortController` plus a
  `setTimeout`, both driven by the injected `SURVEY_TIMEOUTS.fetchMs`. `AbortSignal.timeout()` was
  rejected because Vitest's fake timers do not patch it, and FR-075 has to be provable in milliseconds.

Angular's `HttpClient` is deliberately not used here: it rejects on a non-2xx status and resolves on a 200
HTML body, which is the exact inversion of FR-076, so every call site would have to undo its status logic.

`SurveyLoaderService.load` composes `fetchJson(entry.config, fetchMs)` with
`validateSurveyConfig(value, entry.key)` and maps the three non-`json` outcomes to F17/F18/F19.

### 4.3 `SurveySessionService` — the one source of truth

```ts
@Injectable({ providedIn: 'root' })
export class SurveySessionService {
  // ---- state (writable only from inside) ----
  readonly state: Signal<ResponseState>;
  readonly currentPageIndex: Signal<number>;
  readonly answers: Signal<AnswerMap>;
  readonly attachments: Signal<AttachmentMap>;
  readonly questionErrors: Signal<ReadonlyMap<QuestionId, ValidationError>>;
  readonly attachmentRejections: Signal<readonly AttachmentRejection[]>;
  readonly dirty: Signal<boolean>;

  // ---- derived ----
  readonly survey: Signal<Survey | null>;
  readonly currentPage: Signal<SurveyPage | null>;
  readonly pageCount: Signal<number>;
  readonly positionLabel: Signal<string>; // "Page N of M" — FR-032
  readonly isFirstPage: Signal<boolean>; // Previous disabled — FR-031
  readonly primaryAction: Signal<'next' | 'submit'>; // FR-033
  readonly inputsLocked: Signal<boolean>; // true only in `submitting` — FR-039
  readonly focusRequest: Signal<FocusRequest | null>; // FR-030
  maxLengthOf(question: TextQuestion): number; // FR-015, at the control
  isOptionSelectable(question: CheckboxQuestion, value: OptionValue): Signal<boolean>; // FR-017

  // ---- commands ----
  open(survey: Survey): void; // loading -> ready
  openFailed(error: SurveyConfigError): void; // loading -> configuration-error
  setAnswer(question: Question, input: AnswerInput): void;
  clearAnswer(questionId: QuestionId): void; // FR-060
  addFiles(question: Question, files: readonly File[]): Promise<void>;
  removeAttachment(questionId: QuestionId, attachmentId: AttachmentId): void;
  next(): void;
  previous(): void;
  submit(): Promise<void>;
  retry(): Promise<void>;
}
```

Why one service and not several: the constitution's own rationale for Principle II is that survey state
must not be "spread across components", and every rule in this feature that is easy to get wrong is a rule
about two pieces of state at once — answers and errors (FR-020), answers and state (FR-045), attachments
and validation (FR-027), the current page and the validation scope (FR-034). Splitting them into a page
service and an answer service would put those invariants between two services, which is where they break.

**Behaviour of each command, as the plan settles it:**

| Command            | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`             | Resets every signal, `loading -> ready`, page index 0. Mints no `clientSubmissionId`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `setAnswer`        | Normalises per [`data-model.md`](./data-model.md) §6.1 — trims text, deletes the entry when empty, orders checkbox values by the question's option order. Deletes that question's error (FR-020). Sets `dirty`; `ready -> editing`, and `submission-error -> editing` (contract §6).                                                                                                                                                                                                                                                                      |
| `clearAnswer`      | Deletes the entry. Same error-clearing and `dirty` effects. FR-060 — allowed on a required question.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `addFiles`         | Runs `validateAttachmentSelection` over the selection **in order**, accepting until `maxFiles` is reached; reads the bytes of each accepted file (D6); publishes one `AttachmentRejection` per rejected file; announces politely (FR-026, FR-055). Valid files in a mixed selection still attach (FR-024).                                                                                                                                                                                                                                                |
| `removeAttachment` | Frees the slot immediately and announces politely (FR-026).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `next`             | **Validates the current page only** (FR-029). Valid → page index + 1 and focus to the new page's heading. Invalid → `validation-error` with `scope: 'page'`, page unchanged, `focusRequest` set to `firstInvalidQuestionId`, assertive announcement (FR-030).                                                                                                                                                                                                                                                                                             |
| `previous`         | **Validates nothing** (FR-031). Page index − 1, clears `questionErrors` and the page summary so the page returns in `editing` (FR-064). Never available on page 1.                                                                                                                                                                                                                                                                                                                                                                                        |
| `submit`           | **Validates every page in order**, including the FR-027 attachment re-check (FR-034). Any page invalid → `validation-error` with `scope: 'survey'`, page index moved to `earliestInvalidPageIndex`, no `clientSubmissionId` minted (FR-061, contract test 13), no gateway call. All valid → mint the `clientSubmissionId` if this is the session's first submission, `-> submitting`, build the payload, race the gateway against `SURVEY_TIMEOUTS.submitMs`, then `-> submitted` or `-> submission-error`. On `submitted`, discard the answers (FR-045). |
| `retry`            | Identical to `submit` except that the existing `clientSubmissionId` is re-used with a fresh `submittedAt` (FR-061, contract test 10).                                                                                                                                                                                                                                                                                                                                                                                                                     |

`focusRequest` carries `{ questionId, token: number }` rather than a bare id, so that re-pressing Next on
the same still-invalid question produces a new value and the component's `effect` moves focus again.
`questionErrors` holds at most one error per question, which is sound because FR-014 makes the required
and `minLength` rules mutually exclusive and no two other rules on one question can break together.

### 4.4 The submission path

`survey-response-payload.ts` is a **pure** function — `buildSurveyResponse(survey, answers, attachments,
encoded, ids)` — and `AttachmentCodecService` is the effectful half that turns `Uint8Array` into base64
(D14). The order inside `submit` is therefore: validate → encode → build → call. Nothing is encoded for a
submission that validation blocked.

The gateway contract, the three adapters, and the complete HTTP status mapping are in
[`contracts/response-submission.md`](./contracts/response-submission.md) Part B §9–§12. The two load-bearing
rules: a gateway resolves and never rejects, and the **caller** owns the 15s clock so FR-038 applies
identically to all three adapters.

### 4.5 `AnnouncerService` and `DocumentTitleService`

`AnnouncerService` holds two signals, `polite` and `assertive`, rendered by the single
`<app-live-region />` in the shell. `SurveySessionService` and the catalog call it; components do not
compose announcement text, because FR-069 and `contracts/response-submission.md` §4 fix the wording and
both live in `core`.

`DocumentTitleService.apply(screen: ScreenId)` writes the title that the pure `documentTitleFor` returns
(`core/models/screen-title.ts`): `Surveys`, `<title> — Survey`, `<title> — Response received`,
`Survey not available`, `Survey not found` (FR-077). The `lang="en"` half of FR-077 is already satisfied
by `src/index.html`, so no code is needed for it — only a test asserting it stays.

## 5. Conventions this plan fixes

### 5.1 `models` versus `validators` versus `services`

The constitution names three directories under `core` and no others. The dividing line, so that the
Angular Engineer and the Code Reviewer read it the same way:

- **`models/`** — types, and pure functions that are _properties of the domain_: `ratingPresentation`,
  `effectiveMinSelections`, `canTransition`, the FR-071 size formatter, the FR-072 label formatter, the
  FR-077 title formatter. Nothing in here decides valid or invalid, and nothing has a dependency.
- **`validators/`** — pure functions that decide valid or invalid and produce the message for a failure.
  The FR-069 catalogue lives here because a message is the output of a rule, not a property of the domain.
- **`services/`** — anything that touches the network, the clock, randomness or the DOM, plus the one
  signal-backed session. A file in here need not be `@Injectable`: `survey-response-payload.ts` and
  `survey-timeouts.ts` are not, because they have no dependency to inject.

### 5.2 Immutability and signals

Every model type is `readonly` throughout, including arrays and maps (`ReadonlyMap`). A state change
replaces a value; it never mutates one. This is what makes a signal's default identity comparison
meaningful and what stops a component mutating session state it was given only to render.

### 5.3 Exhaustiveness

Every `switch` on a discriminant has no `default` branch and ends with an `assertNever(value: never)`
helper, so adding a question type, a state kind, a failure kind or an F-code is a build failure at every
place that must handle it. With `noFallthroughCasesInSwitch` already on, this is the mechanism that makes
FR-003 ("exactly six question types") enforceable from the inside.

### 5.4 The one configuration change

`tsconfig.app.json`'s `exclude` gains `"src/app/core/services/testing/**"`. That is the whole diff outside
`src/`, `public/` and `specs/`, apart from adding `axe-core` to `devDependencies`. It is not a gate
relaxation: the directory is still compiled by `tsconfig.spec.json` (so `pnpm tsc --noEmit` still covers
it, since `pnpm typecheck` runs both projects) and still counted by coverage, because the tests import it.
What the exclusion buys is that an import of the failing adapter from application code fails the build,
which is how FR-068's "never from a running build" becomes enforced rather than intended.

## 6. Where every piece of business logic lives

Principle II says components and templates "MUST NOT contain validation, transformation, or submission
logic". This section is the enumeration, so the Code Reviewer has a list to check rather than a principle
to interpret.

### 6.1 The complete map

| Rule                                                                                                        | FR                               | Lives in                                                                                                             |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Survey/manifest config validation, F01–F19                                                                  | FR-040 to FR-044, FR-075, FR-076 | `validators/survey-config.validator.ts`, `validators/survey-manifest.validator.ts`, `services/json-fetch.service.ts` |
| Default resolution (`minLength` 0, `maxLength` 255/2000, `scale` 1–5, `required` false, `attachments` null) | contract §2–§3                   | `validators/survey-config.validator.ts` only                                                                         |
| Required / min / max / range answer rules                                                                   | FR-012 to FR-018, FR-070         | `validators/answer.validator.ts`                                                                                     |
| Error message text, all ten rows                                                                            | FR-019, FR-069                   | `validators/messages.ts`                                                                                             |
| First invalid question in page order                                                                        | FR-030                           | `validators/page.validator.ts`                                                                                       |
| Earliest invalid page, "more than one page"                                                                 | FR-034                           | `validators/survey.validator.ts`                                                                                     |
| Attachment selection checks, in order                                                                       | FR-023, FR-024, FR-028           | `validators/attachment.validator.ts`                                                                                 |
| Attachment re-check before submit                                                                           | FR-027                           | `validators/survey.validator.ts`                                                                                     |
| Receipt recognition                                                                                         | FR-037                           | `validators/submission-receipt.validator.ts`                                                                         |
| Effective checkbox minimum                                                                                  | FR-016                           | `models/survey.model.ts` (`effectiveMinSelections`)                                                                  |
| Stars versus numeric row                                                                                    | FR-009                           | `models/survey.model.ts` (`ratingPresentation`)                                                                      |
| Satisfaction labels and points                                                                              | FR-010                           | `models/survey.model.ts` (`SATISFACTION_LABELS`)                                                                     |
| Legal state transitions                                                                                     | FR-046                           | `models/response-state.model.ts`                                                                                     |
| File size as text ("5 MB")                                                                                  | FR-071                           | `models/display-format.ts`                                                                                           |
| Accepted types as text ("PNG, JPEG, PDF")                                                                   | FR-072                           | `models/display-format.ts`                                                                                           |
| Document titles                                                                                             | FR-077                           | `models/screen-title.ts`                                                                                             |
| Answer normalisation (trim, delete-when-empty, option order)                                                | FR-012, FR-013                   | `services/survey-session.service.ts` (`setAnswer` only)                                                              |
| Page position, Previous/Next/Submit availability                                                            | FR-031 to FR-033                 | `services/survey-session.service.ts` (computed)                                                                      |
| What is validated at Next versus at Submit                                                                  | FR-011, FR-029, FR-034           | `services/survey-session.service.ts`                                                                                 |
| Error clearing on change                                                                                    | FR-020                           | `services/survey-session.service.ts`                                                                                 |
| Returning to a page clears its errors                                                                       | FR-064                           | `services/survey-session.service.ts` (`previous`)                                                                    |
| `clientSubmissionId` lifecycle                                                                              | FR-061                           | `services/survey-session.service.ts` + `services/id-factory.service.ts`                                              |
| Payload construction and answer order                                                                       | FR-035, FR-063                   | `services/survey-response-payload.ts`                                                                                |
| Base64 encoding                                                                                             | FR-063                           | `services/attachment-codec.service.ts`                                                                               |
| Transport, headers, status mapping                                                                          | FR-036, FR-062                   | `services/http-survey-response.gateway.ts`                                                                           |
| Submission deadline                                                                                         | FR-038                           | `services/survey-session.service.ts` + `SURVEY_TIMEOUTS`                                                             |
| Single in-flight submission                                                                                 | FR-039                           | `models/response-state.model.ts` (no `submitting` self-edge)                                                         |
| Announcement text and politeness                                                                            | FR-055                           | `services/announcer.service.ts`, called from `core` only                                                             |

### 6.2 What a component may contain

Exactly four things: an `input()`/`output()`, a `computed()` that reads a core signal or calls a pure core
function, a method that forwards an event to a core command, and an `effect()` that applies a core signal
to the DOM (focus, document title, scroll). Nothing else.

### 6.3 The two rules that look like component behaviour, and are not

- **FR-015, `maxLength` refused at the control.** The template binds
  `[maxlength]="session.maxLengthOf(question)"`. The number comes from core; the browser does the
  refusing. The same `maxLength` is checked again by `answer.validator.ts` at Next and at Submit, because
  FR-015 requires both and a control constraint alone would fail open.
- **FR-017, unselectable checkbox options at the limit.** The template binds
  `[disabled]="!session.isOptionSelectable(question, option.value)()"`. The predicate is a computed signal
  in the session service. FR-070 then re-checks `maxSelections` at Next and Submit anyway, for exactly the
  reason FR-015 is checked twice.

Neither is an exception to Principle II: in both cases the branch is in core and the template binds its
result.

### 6.4 Accessibility obligations, per component

| Component                                     | Obligation                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `radio/checkbox/rating/satisfaction-question` | A labelled group (`role="radiogroup"` / `fieldset` + `legend`) naming the question (FR-053). 44×44px targets at 375px for icon or single-character labels (FR-058). |
| every question component                      | `aria-invalid` and `aria-describedby` pointing at its error text when `questionErrors` holds its id (FR-054).                                                       |
| `question-attachments`                        | The list is rendered from `session.attachments()`, never from the input's `value` (FR-065). Add and remove announced politely (FR-026).                             |
| `validation-summary`                          | Assertive region, invalid questions in page order, each a link to its control (FR-030).                                                                             |
| `survey-page-body`                            | An `effect()` moves focus to the page heading after a successful Next (FR-029) and to `focusRequest` after a blocked one (FR-030).                                  |
| `survey-navigation`                           | "Page N of M" as text (FR-032); Previous disabled on page 1 (FR-031); Submit only on the last page (FR-033); busy state in `submitting` (FR-039).                   |
| `submission-error-banner`                     | Assertive, names the failure, offers "Try again" (FR-045).                                                                                                          |
| `live-region`                                 | One `aria-live="polite"` and one `aria-live="assertive"` region, present from first render so a later message is announced.                                         |
| `configuration-error`                         | Names the location and value per issue, links to `/` (FR-041, FR-043).                                                                                              |
| every screen                                  | `DocumentTitleService.apply` in an `effect()` (FR-077).                                                                                                             |

## 7. Test strategy

Coverage is measured over `src/app/**/*.ts` at 80% on statements, branches, functions and lines, so
components count. Four layers (D19), in cost order, with the threshold bought by the cheapest.

### Layer 1 — pure functions, no TestBed

This is where the branches are, so this is where the coverage comes from.

| Subject                           | Cases                                                                                                                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `survey-config.validator.ts`      | One per rule R03–R52 (50), plus the valid `mini-pulse` config from `contracts/survey-json.md` §10.1 asserting every normalised default                                                                                                           |
| `survey-manifest.validator.ts`    | One per rule R53–R61 (9), plus a valid manifest and a valid **empty** manifest                                                                                                                                                                   |
| `messages.ts`                     | All ten FR-069 rows, with singular/plural `option(s)` at N=1 and N=2, and the `FILENAME: REASON` row                                                                                                                                             |
| `answer.validator.ts`             | Per question type: required-unanswered, required-satisfied, optional-empty-passes, each numeric rule at boundary−1/boundary/boundary+1; FR-013's trimming and code-point counting (an emoji is one character); FR-014's required-beats-minLength |
| `attachment.validator.ts`         | The five checks in order; a mixed selection (US3 scenario 4); over-count taking files in selection order (US3 scenario 5); duplicate by name+size; 0 bytes                                                                                       |
| `page.validator.ts`               | `firstInvalidQuestionId` in page order with two invalid questions (US2 scenario 7); an empty page always valid                                                                                                                                   |
| `survey.validator.ts`             | `earliestInvalidPageIndex` with pages 1 and 3 invalid (US6 scenario 6); the FR-027 re-check failing                                                                                                                                              |
| `response-state.model.ts`         | The full 8 × 8 `canTransition` matrix (64 assertions), asserting `submitted` and `configuration-error` have no outgoing edge and `submitted` only the one incoming                                                                               |
| `display-format.ts`               | FR-071's four bands — 800, 240000, 1048576, 5242880 — and the dropped trailing `.0`; FR-072's MIME, extension, duplicate-collapse and order cases                                                                                                |
| `screen-title.ts`                 | All five FR-077 titles                                                                                                                                                                                                                           |
| `survey-response-payload.ts`      | Contract tests 1–3: answer order, each `value` shape, checkbox values in option order, omission of unanswered optionals, the D16 attachment-only entry, `attachments` key absent when there are none                                             |
| `submission-receipt.validator.ts` | Both fields present; each missing; each empty; a non-object                                                                                                                                                                                      |

### Layer 2 — services, TestBed with fake timers and a stubbed `fetch`

| Subject                       | Cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `json-fetch.service.ts`       | JSON body; HTML body under 200 → `unreadable` (FR-076, US4 scenario 11); network throw; 404; a request that never answers → `timeout` at exactly `fetchMs` (FR-075, SC-014)                                                                                                                                                                                                                                                                                            |
| `survey-catalog.service.ts`   | One fetch for two `resolve` calls (FR-067, US4 scenario 8); the four `CatalogState`s; `not-found` for an absent key; `catalog-error` for an unreadable manifest at a survey route (FR-066, US4 scenario 7)                                                                                                                                                                                                                                                             |
| `survey-loader.service.ts`    | Valid config; each of F17/F18/F19; F16 when the config key differs from the served key                                                                                                                                                                                                                                                                                                                                                                                 |
| `survey-session.service.ts`   | Every command in the §4.3 table; the blocked-Next and blocked-Submit paths; FR-064's error discard on Previous (US2 scenario 12); FR-020's immediate clear; an illegal `transitionTo` throwing; a second Submit during `submitting` making no second call (US6 scenario 5); the 15s deadline (contract test 7); `clientSubmissionId` identical across retries and absent for a blocked Submit (contract tests 10, 13); answers intact after each failure kind (SC-007) |
| the three gateways            | Simulated always acknowledges inside 1s and aborts cleanly; HTTP sends `Idempotency-Key` and **no** `Authorization` (contract test 11); all eight rows of the §11.3 status mapping (contract tests 6, 12); a 200 with a bad body → `malformed-response` (contract test 5)                                                                                                                                                                                              |
| `attachment-codec.service.ts` | Round-trip: `Uint8Array` → base64 → decoded length equals `sizeBytes` (contract test 3)                                                                                                                                                                                                                                                                                                                                                                                |

### Layer 3 — components, TestBed with DOM assertions

One spec per component. The assertions are roles, labels, text, `aria-*`, focus and announcements — never
coverage padding, because layer 1 already bought the threshold.

- The seven screens SC-009 names, each rendered and passed through `axe-core` at 375px and 1280px.
- `validation-error`: focus lands on the first invalid control; `aria-invalid` and `aria-describedby` are
  wired; the summary lists both questions in page order (US2 scenario 7).
- `question-attachments`: the list comes from session state and survives a Previous/Next round trip
  (FR-065, US3 scenario 11); the counter reads "2 of 3 files"; no control renders when
  `attachments` is `null` (US3 scenario 10).
- `rating-question`: stars when `scale.min >= 1`, a labelled numeric row when it is 0 (FR-009); Clear
  returns to unanswered (US1 scenario 6).
- `satisfaction-question`: exactly five choices with the five visible labels, storing 1–5 (US2 scenario 11).
- `survey-page`: each of the eight `ResponseState`s renders what FR-045 prescribes and nothing it forbids —
  in particular `loading` and `configuration-error` contain zero question controls (SC-005), and
  `submitted` contains none either.
- `catalog-page`: manifest order preserved; empty manifest renders the plain statement and no error
  (US4 scenario 3); `loading` shows none of the three other states' content (US4 scenario 10).
- `not-found-page`: names the key and links to `/`.

### Layer 4 — fixture contract tests (Survey Content Author)

The valid `customer-feedback` fixture asserted against `validateSurveyConfig`, plus one deliberately
invalid fixture per F-class asserted to produce that code and path. `contracts/survey-json.md` §4 is the
list; §10 gives five of them worked out, including the F12/F13 rule-ordering note the contract records.

### How 80% is actually reached

Layers 1 and 2 cover `src/app/core/**` close to exhaustively — it is pure functions and thin services
with no untestable branch, so the measured figure there should be well above 90%. Layer 3 gives every
component at least one rendering test, which covers its template and its computed members. The risk to the
threshold is **branch** coverage in components, and the mitigation is structural rather than extra tests:
components have almost no branches, because every branch worth testing was moved to core by §6.

`pnpm vitest run --coverage` fails the run if any of the four metrics is below 80%. No file is added to
`coverage.exclude`, no threshold is moved, and no test is skipped or marked expected-to-fail — Principle IV
forbids all four, and the `services/testing/**` exclusion in §5.4 is from the **app** compilation, not from
coverage.

## 8. Implementation order and dependency edges

Input to `/speckit-tasks`, not a substitute for it. Nine work packages; the edges are what matter, because
they are what allow three of them to run in parallel.

```text
WP1 models (no deps)
 ├─> WP2 validators: config + manifest         ──┐
 ├─> WP3 validators: answer/page/survey/attachment ─┤
 ├─> WP4 fixtures + manifest (Survey Content Author) ┤   (WP2–WP4 run in parallel after WP1)
 │                                                  │
 ├─> WP5 services: fetch, catalog, loader  <─────── WP2
 ├─> WP6 services: session + payload       <─────── WP3
 ├─> WP7 services: gateways + codec        <─────── WP1
 │
 ├─> WP8 features: catalog, not-found, configuration-error  <── WP5
 └─> WP9 features: survey viewer + six question components  <── WP6, WP7
```

| WP  | Deliverable                                                               | Owner                 | Blocked by       |
| --- | ------------------------------------------------------------------------- | --------------------- | ---------------- |
| WP1 | `core/models/**` — every type, the transition table, formatters           | Angular Engineer      | —                |
| WP2 | `core/validators/survey-config`, `survey-manifest`, `json-reader`         | Angular Engineer      | WP1              |
| WP3 | `core/validators/answer`, `page`, `survey`, `attachment`, `messages`      | Angular Engineer      | WP1              |
| WP4 | `public/survey-manifest.json`, the fixture, invalid fixtures              | Survey Content Author | WP1 (types only) |
| WP5 | `json-fetch`, `survey-catalog`, `survey-loader`, `SURVEY_TIMEOUTS`        | Angular Engineer      | WP2              |
| WP6 | `survey-session`, `survey-response-payload`, `id-factory`, `announcer`    | Angular Engineer      | WP3              |
| WP7 | gateway + three adapters, `attachment-codec`                              | Angular Engineer      | WP1              |
| WP8 | catalog, not-found, configuration-error, shell, routes                    | Angular Engineer      | WP5              |
| WP9 | survey viewer, six question components, navigation, summary, confirmation | Angular Engineer      | WP6, WP7         |

WP4 is the only package a different agent owns, and it depends on WP1 for the types only — so the Survey
Content Author can start as soon as `core/models/**` lands, in parallel with WP2 and WP3. Scenario-to-test
mapping and the five gate runs are the QA Engineer's, across all nine.

## 9. What this plan does not do

- **No `tasks.md`.** `/speckit-tasks` is a separate subtask with a different owner.
- **No application code.** This stage produces design documents and contract declarations only; the
  TypeScript in `data-model.md` and in the contracts is the agreed surface, not an implementation.
- **No change to `spec.md`.** The spec is the Product Owner's. Where this plan found the spec or a contract
  incomplete, it says so in §10 instead of editing it.
- **No second survey beyond the fixture**, except the one SC-013 needs to prove that adding a survey
  touches no file under `src/app/**`.
- **No authentication, no persistence, no i18n, no analytics** — all out of scope per the spec.

## 10. Handed back to the Product Owner

Three items. None blocks implementation: each is resolved in this plan in the fail-closed direction, and
each is recorded so that the Product Owner can confirm or overrule it in the next spec revision rather
than discover it in review.

| #   | Item                                                                                                                                                                                                                                                                                                                                                             | This plan's resolution                                                                                                                                                                                                                                                | Where                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | **A question with attachments but no value has no answer entry.** By the letter of `contracts/response-submission.md` §2, a respondent who attaches a file to the optional `q_evidence` and types nothing produces no entry — so an accepted attachment would never cross the boundary. Silent data loss on the path the spec calls the highest-risk input path. | A question is included in `answers` when it has a value **or** at least one accepted attachment; an attachment-only text question carries `""`, which FR-014 already makes a legal optional value.                                                                    | `research.md` D16, `contracts/response-submission.md` §8.1          |
| 2   | **A file that passes all five FR-023 checks and then cannot be read.** FR-023 lists five checks and FR-024 fixes the shape of a rejection, but neither covers a read that fails after those five pass.                                                                                                                                                           | A sixth and final step in the FR-023 chain, reported in FR-069's existing `FILENAME: REASON` form with the reason `this file could not be read`. **This is the one respondent-facing string in this plan that the spec does not supply**, which is why it is flagged. | `research.md` D17, `data-model.md` §6 (`AttachmentRejectionReason`) |
| 3   | **`surveyVersion` in the submission payload.** The `/speckit-plan` brief named it; `contracts/response-submission.md` §2 does not carry it, and `contracts/survey-json.md` defines no version field on a survey config, so the viewer would have to invent the value.                                                                                            | Not added. `surveyKey` identifies the survey and `clientSubmissionId` the attempt. Adding versioning is a change to `contracts/survey-json.md` first, and therefore the Product Owner's.                                                                              | `research.md` D18, `contracts/response-submission.md` §8            |

Item 2 is the only one that changes what a respondent can read, so it is the one most worth a decision
rather than an acceptance.

## 11. Readiness

Against the contracts-first rule, all four required artifacts now exist as written documents:

| Required artifact                                                                                           | Where                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The survey JSON contract — every field, its type, required or not, and what an invalid value means          | `contracts/survey-json.md` §1–§3 (fields), §4 (F01–F19), §7–§9 (types and the 61-rule list), §10 (worked examples)                                               |
| The TypeScript domain model that mirrors it                                                                 | `data-model.md` §2–§8; the six union members also reproduced in `contracts/survey-json.md` §7                                                                    |
| The service interfaces — loading, validation, navigation, submission — with inputs, outputs and error cases | `plan.md` §4; `contracts/response-submission.md` §9–§12; error cases as `SurveyConfigError`, `ValidationError`, `SubmissionFailure`                              |
| A statement of which validation runs before navigation and which before submit                              | `data-model.md` §10 and `plan.md` §4.3 — Next validates the current page; Submit validates every page in order plus every attachment; Previous validates nothing |

**Next stage**: `/speckit-tasks` turns §8 into `tasks.md`, then `/speckit-analyze` must report no CRITICAL
and no HIGH before `/speckit-implement` starts (Principle IV).
