/**
 * The submission-failure banner — T123, FR-045.
 *
 * One assertive region naming the failure, plus a "Try again" that forwards to
 * `session.retry()`. That is the whole component: it composes no text and decides nothing
 * about whether a retry is sensible.
 *
 * ## Why none of the seven messages is written here
 *
 * `contracts/response-submission.md` §4 fixes one message per `SubmissionFailureKind`,
 * verbatim, and `submissionFailureMessage` in `core/validators/messages` is the one copy of
 * them. This component renders `failure.message`, which the gateway boundary already
 * composed. A `@switch` over `kind` in this template would be a second copy of seven
 * respondent-facing sentences, and T126 asserts all seven against the catalogue — so a
 * divergence would show up as a passing test against the wrong text.
 *
 * ## Why "Try again" is always offered
 *
 * Four of the seven kinds say "try again" in their own text and three do not — `rejected`,
 * `not-found` and the FR-062 `unauthorized` case. The action is still offered for all
 * seven, because the alternative is a dead end: the respondent has answers in hand and no
 * way to act, and `retry()` is refused by the transition table rather than by this button
 * when it is not a legal move. Hiding the control would put a second, divergent copy of
 * that rule in a template (Principle II).
 *
 * FR-062 specifically: `unauthorized` renders its sentence and nothing else. No credential
 * prompt, no login screen, no redirect — there is no authentication in this application and
 * a 401 from the boundary is a server-side condition the respondent cannot fix by signing
 * in. T125 asserts the absence.
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import type { SubmissionFailure } from '../../core/models/survey-response.model';
import { SurveySessionService } from '../../core/services/survey-session.service';

@Component({
  selector: 'app-submission-error-banner',
  templateUrl: './submission-error-banner.html',
  styleUrl: './submission-error-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionErrorBannerComponent {
  private readonly session = inject(SurveySessionService);

  readonly failure = input.required<SubmissionFailure>();

  /**
   * FR-039: the action is unavailable only while a submission is in flight.
   *
   * Read from the session rather than tracked locally, so the banner and every question
   * control agree about whether the response is editable right now.
   */
  protected readonly locked = this.session.inputsLocked;

  protected tryAgain(): void {
    void this.session.retry();
  }
}
