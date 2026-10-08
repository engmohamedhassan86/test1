/**
 * The survey viewer's state machine — `data-model.md` §8, `plan.md` §3.
 *
 * `loading` and `configuration-error` carry no `Survey` at all, so a template branch for
 * either cannot read survey data — FR-040 and FR-042 enforced by the compiler (D7).
 *
 * Answers, attachments, the current page index and the per-question errors are NOT here;
 * they are separate signals on `SurveySessionService`, so a state change can never drop
 * them. That is what makes "a failed submission preserves the answers" structural.
 */

import type { SubmissionFailure, SubmissionReceipt } from './survey-response.model';
import type { SurveyConfigError } from './survey-config-error.model';
import type { Survey } from './survey.model';
import type {
  PageValidationReport,
  SurveyValidationReport,
  ValidationScope,
} from './validation.model';

export type ResponseStateKind =
  | 'loading'
  | 'ready'
  | 'editing'
  | 'validation-error'
  | 'submitting'
  | 'submitted'
  | 'submission-error'
  | 'configuration-error';

export const RESPONSE_STATE_KINDS = [
  'loading',
  'ready',
  'editing',
  'validation-error',
  'submitting',
  'submitted',
  'submission-error',
  'configuration-error',
] as const satisfies readonly ResponseStateKind[];

/** FR-045. Each variant carries only what that state can show. */
export type ResponseState =
  | { readonly kind: 'loading'; readonly surveyKey: string }
  | { readonly kind: 'ready'; readonly survey: Survey }
  | { readonly kind: 'editing'; readonly survey: Survey }
  | {
      readonly kind: 'validation-error';
      readonly survey: Survey;
      readonly scope: ValidationScope;
      readonly page: PageValidationReport;
      /** Present only when `scope` is `survey`; drives "more than one page". */
      readonly surveyReport: SurveyValidationReport | null;
    }
  | { readonly kind: 'submitting'; readonly survey: Survey }
  | { readonly kind: 'submitted'; readonly survey: Survey; readonly receipt: SubmissionReceipt }
  | {
      readonly kind: 'submission-error';
      readonly survey: Survey;
      readonly failure: SubmissionFailure;
    }
  | { readonly kind: 'configuration-error'; readonly error: SurveyConfigError };

/**
 * FR-046, transcribed from `plan.md` §3. Eleven edges between distinct states and two
 * terminal states — `data-model.md` §8.1's prose says twelve, but the table it ships (and
 * which this is a copy of) holds eleven; the table is authoritative.
 *
 * The three self-edges are justified row by row in `data-model.md` §8.1:
 * FR-046 constrains transitions between *distinct* states, and a self-edge is not a state
 * change.
 */
export const RESPONSE_STATE_TRANSITIONS: Readonly<
  Record<ResponseStateKind, readonly ResponseStateKind[]>
> = Object.freeze({
  loading: Object.freeze<readonly ResponseStateKind[]>(['ready', 'configuration-error']),
  ready: Object.freeze<readonly ResponseStateKind[]>(['editing', 'validation-error']),
  editing: Object.freeze<readonly ResponseStateKind[]>([
    'editing',
    'validation-error',
    'submitting',
  ]),
  'validation-error': Object.freeze<readonly ResponseStateKind[]>(['validation-error', 'editing']),
  submitting: Object.freeze<readonly ResponseStateKind[]>(['submitted', 'submission-error']),
  submitted: Object.freeze<readonly ResponseStateKind[]>([]),
  'submission-error': Object.freeze<readonly ResponseStateKind[]>([
    'submission-error',
    'editing',
    'submitting',
  ]),
  'configuration-error': Object.freeze<readonly ResponseStateKind[]>([]),
});

export function canTransition(from: ResponseStateKind, to: ResponseStateKind): boolean {
  return RESPONSE_STATE_TRANSITIONS[from].includes(to);
}

/**
 * FR-045 is explicit that the not-found screen "belongs to neither machine". This union
 * is that statement: the route renders either the viewer in one of its eight states, or
 * the not-found screen, and the two are not states of each other.
 */
export type SurveyScreen =
  | { readonly kind: 'viewer'; readonly state: ResponseState }
  | { readonly kind: 'not-found'; readonly surveyKey: string };
