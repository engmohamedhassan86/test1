/**
 * The one typed boundary a submission crosses — T055,
 * `contracts/response-submission.md` §9.
 *
 * An abstract class rather than an interface, so one symbol is both the type and the
 * Angular injection token. Everything above this line — the survey model, validation,
 * navigation, the eight response states — is unaware of transport (Principle II).
 *
 * Three obligations on every implementation:
 *
 * 1. **It resolves; it never rejects.** A rejected promise is a path the type does not
 *    show, and the state it would leave behind is `submitting` — failing open at the worst
 *    moment. An adapter catches its own throw and maps it, normally to `transport-error`.
 * 2. **The caller owns the 15s clock.** The deadline is a rule about submission, not about
 *    HTTP, so `SurveySessionService` races `submit` against `SURVEY_TIMEOUTS.submitMs` and
 *    reports `timeout` itself. That makes contract test 7 one test, not one per adapter.
 * 3. **It honours `signal`.** An adapter that ignores the abort leaves a request in flight
 *    after the viewer has moved on, so a late acknowledgement could race a retry.
 *
 * `SubmissionResult`, `SubmissionFailure` and `SubmissionReceipt` are declared in
 * `core/models/survey-response.model.ts` and re-exported here only as types, so that a
 * gateway implementation needs one import.
 */

import type { SubmissionResult, SurveyResponse } from '../models/survey-response.model';

export type {
  SubmissionFailure,
  SubmissionFailureDetail,
  SubmissionFailureKind,
  SubmissionReceipt,
  SubmissionResult,
} from '../models/survey-response.model';

export abstract class SurveyResponseGateway {
  abstract submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>;
}
