# Project notes — Dynamic Survey Viewer

Read this file first. Do not re-discover the codebase by listing or reading many files.
Keep this file short and current. If you learn something durable, edit it here.

## Stack

Angular 20 standalone components, signals, PrimeNG + PrimeFlex, Vitest, pnpm, TypeScript strict.
No NgModules. No RxJS in components — use signals.

## Layout

- `src/app/core/models` — domain types. `survey.model.ts`, `answer.model.ts`,
  `validation.model.ts`, `branded.ts` (branded ids), `index.ts` re-exports.
- `src/app/core/validators` — pure functions only, no I/O. One file per concern
  (`answer`, `page`, `survey`, `survey-config`, `survey-manifest`, `attachment`).
  `messages.ts` holds user-facing strings.
- `src/app/core/services` — owns all I/O and state. `survey-session.service.ts` is the single
  signal-backed source of truth for survey state. `survey-loader`, `survey-catalog`,
  `json-fetch`, `survey-response.gateway` (+ `simulated-` variant), `announcer` (a11y live region).
- `src/app/features/survey` — `survey-page` (container), `survey-page-body`, `survey-navigation`,
  `validation-summary`, `submission-confirmation`.
- `src/app/features/survey/questions` — one component per question type: `text`, `radio`,
  `checkbox`, `rating`, `satisfaction`, plus `question-host` which dispatches on type.
- `__fixtures__/` folders hold test builders. Use them; do not hand-roll survey objects.

## Conventions

- Components: `name.ts` + `name.html` + `name.css`, separate files, never inline templates.
- Templates stay dumb. Any branch worth testing lives in `core/`, not a template.
- Validators are pure; services own effects.
- Invalid survey config fails closed — an error screen, never a half-rendered survey.
- Tests live beside the source as `name.spec.ts`.

## Verify your change — use the narrowest command that proves it

Run the scoped command first. Only run a full pass before you hand work off or mark an issue done.

| Goal                      | Command                                                  |
| ------------------------- | -------------------------------------------------------- |
| One spec file             | `pnpm vitest run <path-to-spec> --reporter=dot`          |
| One folder                | `pnpm vitest run src/app/core/validators --reporter=dot` |
| Types, app only           | `pnpm typecheck:app`                                     |
| Types, specs only         | `pnpm typecheck:spec`                                    |
| Format one path           | `pnpm prettier --write <path>`                           |
| Full suite (handoff only) | `pnpm test`                                              |

Vitest prints failure detail on stderr, so always redirect with `2>&1` before you filter.
These three recipes are measured against this repo — they keep every failure and drop the noise:

```
pnpm vitest run <path> --reporter=dot 2>&1 | tail -20
pnpm test 2>&1 | grep -E 'FAIL|Test Files|Tests ' | head -30
pnpm typecheck:app 2>&1 | grep -E 'error TS' | head -20
```

A full verbose suite run is ~9.6 KB of output. The filtered form is ~1.4 KB and names all the same
failing tests. A scoped folder run is ~0.8 KB. Reach for the smallest one that answers your question.

Do not paste a whole build log, a whole test report, or a whole file into a comment or a handoff.

## Reading code — search before you open

Find the symbol first, then read only around it. Use `grep -n` or Glob to get a line number, then
read a range. Never re-read a file you have already read in this run unless you changed it.

The five largest files in the repo are worth knowing, because opening one whole costs more than the
rest of a normal task:

- `core/validators/survey-config.validator.spec.ts` 1246 lines
- `core/validators/survey-config.validator.ts` 986 lines
- `core/services/survey-session.service.spec.ts` 970 lines
- `core/services/survey-session.service.ts` 704 lines
- `core/validators/survey-fixtures.contract.spec.ts` 643 lines

Reading all five is ~4,500 lines — about 92% of all non-spec source in the repo (7,008 lines).
Read the function you are changing, not the file that holds it.

## Handoffs — four lines, not a transcript

When you hand an issue to another agent or back to the board, post exactly this shape:

```
Goal: <one line>
Decisions: <what you chose and why, one line each>
Changed: <file paths, and the commit sha if you committed>
Open: <what is still unresolved, and who owns it>
```

No transcript, no command log, no file contents. The next agent reads this file plus your four
lines and starts working. If something is not in those four lines, it was not important enough to
carry.

## Stop condition

If the same check fails twice and your second fix did not change the failure, stop. Do not try a
third variation. Write down the failing command, its last 20 lines, and what you ruled out, then
hand the issue back with a named owner.
