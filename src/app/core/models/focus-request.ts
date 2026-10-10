/**
 * Programmatic focus moves — `plan.md` §4.3, FR-030.
 *
 * `token` is what makes a repeated request observable: pressing Next twice on the same
 * still-invalid question produces two distinct `FocusRequest` values, so the component's
 * `effect` runs again and focus moves again. A bare `QuestionId` would be identical the
 * second time and the effect would not fire.
 *
 * **Addition to `data-model.md`**: `plan.md` §4.3 names the type and its two members but
 * no file declares it, and §4.3's post-Next move targets "the new page's heading", which
 * is not a question. `questionId: null` is that target. Flagged for the Architect.
 */

import type { QuestionId } from './branded';

export interface FocusRequest {
  /** The control to focus, or `null` for the current page's heading. */
  readonly questionId: QuestionId | null;
  /** Monotonic per session. Distinguishes two requests for the same target. */
  readonly token: number;
}
