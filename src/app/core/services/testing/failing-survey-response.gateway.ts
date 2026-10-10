/**
 * The test-only adapter — T058, `contracts/response-submission.md` §5.
 *
 * It returns a chosen `SubmissionFailureKind`, or never answers, so each of the seven
 * submission-error paths and the 15s deadline can be asserted.
 *
 * **It is reachable only from a test.** `tsconfig.app.json` excludes
 * `src/app/core/services/testing/**`, so an import of this file from anything under
 * `src/app/features/**` or `src/app/core/**` is a `pnpm ng build` failure — which is how
 * FR-068's "never from a running build" is enforced rather than intended. It is not a gate
 * relaxation: `tsconfig.spec.json` still compiles this directory and coverage still counts
 * it, because the tests import it (`plan.md` §5.4).
 */

import type {
  SubmissionFailureDetail,
  SubmissionFailureKind,
  SubmissionResult,
  SurveyResponse,
} from '../../models/survey-response.model';
import { submissionFailureMessage } from '../../validators/messages';
import { SurveyResponseGateway } from '../survey-response.gateway';

export class FailingSurveyResponseGateway extends SurveyResponseGateway {
  /** Every payload this adapter was handed, in call order, for contract tests 8 and 10. */
  readonly calls: SurveyResponse[] = [];

  /**
   * `kind: 'never-answers'` leaves the promise pending until the caller's deadline aborts
   * it, which is how contract test 7 asserts `timeout` at exactly `submitMs` without a
   * real clock.
   */
  constructor(
    private readonly kind: SubmissionFailureKind | 'never-answers',
    private readonly details: readonly SubmissionFailureDetail[] = [],
  ) {
    super();
  }

  override submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult> {
    this.calls.push(response);

    if (this.kind === 'never-answers') {
      return new Promise<SubmissionResult>((resolve) => {
        signal.addEventListener(
          'abort',
          () =>
            resolve({
              outcome: 'failed',
              failure: {
                kind: 'timeout',
                message: submissionFailureMessage('timeout'),
                details: [],
              },
            }),
          { once: true },
        );
      });
    }

    return Promise.resolve({
      outcome: 'failed',
      failure: {
        kind: this.kind,
        message: submissionFailureMessage(this.kind),
        // Contract §4: `details` is empty unless the kind is `rejected`.
        details: this.kind === 'rejected' ? this.details : [],
      },
    });
  }
}

/** An adapter that always acknowledges with a receipt a test chose. */
export class AcknowledgingSurveyResponseGateway extends SurveyResponseGateway {
  readonly calls: SurveyResponse[] = [];

  constructor(
    private readonly submissionId = 'test-submission',
    private readonly receivedAt = '2026-10-08T00:00:00.000Z',
  ) {
    super();
  }

  override submit(response: SurveyResponse): Promise<SubmissionResult> {
    this.calls.push(response);
    return Promise.resolve({
      outcome: 'acknowledged',
      receipt: { submissionId: this.submissionId, receivedAt: this.receivedAt },
    });
  }
}
