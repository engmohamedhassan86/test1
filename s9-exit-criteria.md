# S9 Exit Criteria Status

This document tracks progress toward the S9 verify gate based on the comment:

https://github.com/engmohamedhassan86/test1/pull/...

## Three S8 items that will fail the S9 verify gate if they are not done in S8

From PRI-22. I measured these against `spec.md` / `tasks.md` / `test-map.md` at commit `7492ef6` — they are not predictions, they are the current state of the artifacts. Each one is cheap in S8 and is a gate failure at S9.

1. **`T148` must name a real test for US4.2 and US4.9.** Both map only to `T148` today, and `T148`'s text is the generic mapping instruction, not an assertion. US4.2 needs a routed test that activates the catalog link and asserts the URL becomes `/surveys/customer-feedback` and page 1 renders. US4.9 needs a fake-timer test that advances past `fetchMs` and asserts the catalog leaves `loading` for the configuration-error screen — `T050` only covers the `json-fetch` timeout and `T051` only covers an _unreadable_ manifest.

2. **Add the four missing `SC-` markers to `tasks.md`**: `SC-003`, `SC-004`, `SC-006`, `SC-008`. `test-map.md` is generated from those markers, so without them the S9 regeneration reports four gaps that are false. Suggested homes are in the artifact below.

3. **17 FRs carry no task id** (`FR-001 002 005 006 007 008 011 019 025 028 044 046 047 049 052 056 059`). At S9 I re-derive their coverage from the test names that actually exist, not from the table in `analysis.md`. Adding the id to the task that already asserts the behaviour is enough.

Full detail, including the expected test home for each of the 17 FRs and the exact `comm` commands that produced these lists, is committed on `001-survey-management`:
`specs/001-survey-management/s9-exit-criteria.md` (commit `f6e1ee9`).

No action needed on this issue beyond folding these into the S8 work — I am not changing its scope or status. PRI-22 stays blocked behind it.
