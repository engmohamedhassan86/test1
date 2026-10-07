# Dynamic Survey Viewer Constitution

## Core Principles

### I. JSON-Driven Domain Contract (NON-NEGOTIABLE)

A survey is data, not code. Adding, changing, or removing a survey MUST require only a JSON
config file plus one manifest entry — never a change to `src/app/**`. Every config MUST be
validated against the typed survey contract before any page renders. If validation fails the
app MUST show a clear, actionable error and render nothing of the survey; a partially rendered
or silently repaired survey is a defect. Unknown fields, unknown question types, and broken
references (page, question, or option ids) are validation failures, not warnings. The viewer
fails closed: when in doubt it renders an error, never a guess. The contract and its validators
live in `src/app/core/{models,validators}`.

**Rationale**: Surveys change far more often than the application does. If a new survey needs a
code change, every survey becomes a release; if an invalid survey renders partially, a
respondent submits answers to a form we cannot interpret. Failing closed keeps bad data out.

### II. Feature Isolation and Contracts First

Each feature is specified, planned, and built in isolation on its own branch `NNN-feature-name`
with artifacts in `specs/NNN-feature-name/`. Contracts — TypeScript types, JSON Schema, and
service interfaces — MUST be written and reviewed before implementation code. Features
communicate through those typed boundaries only. Business logic lives exclusively in
`src/app/core/{models,validators,services}`; components and templates orchestrate and present,
and MUST NOT contain validation, transformation, or submission logic. Submission crosses one
typed boundary, so the transport can change without touching survey logic.

**Rationale**: A contract written after the code is a description, not a constraint. Settling
types, schema, and service interfaces first lets spec, implementation, fixtures, and tests be
built by different agents in parallel against the same agreed surface, and keeps a change in
one feature from silently breaking another through a back-door dependency.

### III. Validation Before Navigation and Before Submit (NON-NEGOTIABLE)

Answers MUST be validated before the user leaves a page and again before submit. Navigating
forward with invalid or missing required answers MUST be blocked, with the first offending
field focused and its error announced to assistive technology. Attachments are limited to 0–3
files per question; file type and file size MUST be enforced at selection time and re-checked
before submit. No success state may be shown until every attachment has been fully handled and
the submission has been acknowledged. A failed or partial submission MUST surface as an error
with the user's answers preserved.

**Rationale**: A respondent who reaches the last page before learning page one was incomplete
has lost their work, and a success screen shown before the attachments landed is a claim we
cannot take back. Validating at both boundaries is what makes the acknowledgement trustworthy.

### IV. Quality Gates (NON-NEGOTIABLE)

Every change MUST pass, in order: `prettier --check`, `tsc --noEmit`, `vitest run --coverage`
with at least 80% coverage, `ng build`, and a browser smoke test at 375px and 1280px. Coverage
below 80% fails the gate; thresholds are enforced by the test runner, not by eye. Spec-Kit
`/speckit-analyze` MUST report no CRITICAL or HIGH findings before implementation starts. The
agent that writes the spec, the agent that writes the code, and the agent that reviews the code
MUST be three different agents. A feature is done only when it is merged with green gates.

No gate may be relaxed, skipped, lowered, or marked expected-to-fail in order to make a run
pass. Excluding a file from coverage, loosening a `tsconfig` flag, adding a Prettier ignore, or
skipping a test to turn a run green is a violation of this principle, not a workaround.

**Rationale**: A gate only has value while it is unconditional. The moment a threshold can be
lowered to clear a red run, every later green run becomes unverifiable, and the gate costs us
time without buying confidence.

### V. Accessible, Responsive, On-Brand UX

The app MUST meet WCAG 2.1 AA: 4.5:1 text contrast, full keyboard operation with a visible
focus ring, correct labels and `aria-describedby` for errors, and live-region announcements for
validation and submission results. Every flow MUST work at 375px and 1280px with no horizontal
scrolling and no truncated controls. The maroon brand is expressed only through design tokens
in `src/app/theme` and `src/styles.css`; components MUST NOT hard-code colours. Angular
standalone components with signals, `OnPush`, and `@if`/`@for` are required; NgModules are
forbidden.

**Rationale**: A survey that a keyboard or screen-reader user cannot complete has not collected
their answer — accessibility here is data coverage, not decoration. Phones are the common case
for this product, so 375px is a supported target rather than a degraded one, and routing brand
colour through tokens means a rebrand is one file, not a search across components.

## Technology Constraints

- Angular 22 standalone components, signals, `OnPush` change detection, `@if`/`@for` control
  flow. No NgModules.
- TypeScript strict mode and `strictTemplates`. No `any` in `src/app/core/**`.
- PrimeNG with `@primeuix/themes` and PrimeFlex for layout. Vitest for unit tests. pnpm for
  package management.
- Build output is `dist/survey-viewer/browser`, deployed as a SPA to Vercel and Cloudflare with
  an index fallback.
- No secrets in the repository. `.env*`, `.vercel`, `dist`, and `coverage` stay untracked.

## Development Workflow

Mandatory Spec Kit pipeline, one subtask per stage, each blocked by the previous:
`/speckit-specify` → `/speckit-clarify` → `/speckit-checklist` → `/speckit-plan` (contracts
first) → `/speckit-tasks` → `/speckit-analyze` (no CRITICAL/HIGH) → `/speckit-implement` →
verification → independent code review → PR merge and preview deploy.

Roles: Product Owner writes specs. Solution Architect writes plans and contracts. Angular
Engineer writes application code. Survey Content Author writes survey JSON, the manifest, and
fixture contract tests. QA & Test Engineer maps spec scenarios to tests and runs the gates.
Code Reviewer reviews and never writes fixes. DevOps/Release Engineer owns the repo, CI, and
deploys. If a subtask fails twice it is re-planned rather than retried a third time.

## Governance

This constitution supersedes all other practices and binds every role on the project without
exception — Product Owner, Solution Architect, Angular Engineer, Survey Content Author, QA &
Test Engineer, Code Reviewer, and DevOps/Release Engineer alike. No role may waive a principle
for its own stage, and "the other agent asked me to" is not a justification.

Every pull request and review MUST verify compliance with Principles I–V, and the reviewer MUST
state which principles were checked. Any deviation MUST be recorded in the feature's
`specs/NNN-feature-name/` artifacts with a justification and a migration or removal plan;
undocumented deviations block the merge.

Amendments require a written rationale, the version bump below, and propagation to the Spec Kit
templates that reference it. Versioning is semantic: MAJOR for removing or redefining a
principle, MINOR for adding a principle or a materially expanded rule, PATCH for wording and
clarification.

**Version**: 1.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
