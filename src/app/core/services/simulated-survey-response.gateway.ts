/**
 * The default adapter — T056, `contracts/response-submission.md` §5.
 *
 * It makes no network call and **always** acknowledges, after an artificial delay of at
 * most 1s, with a generated `submissionId`. It has no failure-injection switch: gate 3 has
 * to be deterministic, and a switch is how a flaky suite starts (FR-068). Every failure
 * path is tested against the `testing/` adapter instead, which `tsconfig.app.json`
 * excludes from the build.
 *
 * It honours `signal` (contract §9 obligation 3): if the caller's 15s deadline fires
 * first, the delay resolves to `timeout` rather than leaving a late acknowledgement to
 * race a retry.
 */

import { Injectable } from '@angular/core';

import type { SubmissionResult, SurveyResponse } from '../models/survey-response.model';
import { submissionFailureMessage } from '../validators/messages';
import { SurveyResponseGateway } from './survey-response.gateway';

/** Contract §5: "at most 1s". Short enough that SC-002's 2s budget still holds. */
export const SIMULATED_ACKNOWLEDGEMENT_DELAY_MS = 400;

@Injectable({ providedIn: 'root' })
export class SimulatedSurveyResponseGateway extends SurveyResponseGateway {
  override submit(_response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult> {
    if (signal.aborted) {
      return Promise.resolve(abortedResult());
    }

    return new Promise<SubmissionResult>((resolve) => {
      const onAbort = (): void => {
        clearTimeout(timer);
        resolve(abortedResult());
      };

      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve({
          outcome: 'acknowledged',
          // Stands in for a value the server would mint, so it is not an id from
          // `IdFactoryService` — that factory mints the *client's* ids.
          receipt: {
            submissionId: `sim-${crypto.randomUUID()}`,
            receivedAt: new Date().toISOString(),
          },
        });
      }, SIMULATED_ACKNOWLEDGEMENT_DELAY_MS);

      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
}

/**
 * An abort is the caller's deadline, so the adapter reports `timeout` rather than
 * inventing a transport failure it did not observe. The caller normally overwrites this
 * with its own `timeout` result; returning it keeps obligation 1 — resolve, never reject —
 * true even for a caller that awaits the adapter without racing it.
 */
function abortedResult(): SubmissionResult {
  return {
    outcome: 'failed',
    failure: { kind: 'timeout', message: submissionFailureMessage('timeout'), details: [] },
  };
}
