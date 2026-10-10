/**
 * Turning a failed fetch into a configuration failure — `contracts/survey-json.md` §9.0
 * rules R00–R02.
 *
 * Both the manifest path (T048) and the config path (T049) map the same three non-`json`
 * outcomes to the same three codes, so the mapping lives once:
 *
 * - **F17** — the request was answered with a non-success status, or never reached the
 *   server at all;
 * - **F18** — a success status whose body `JSON.parse` rejected (FR-076: the body decides);
 * - **F19** — the request was still unanswered at the deadline (FR-075).
 *
 * This belongs in `validators` rather than `models` because it produces a
 * `ConfigFailureCode` and the author-facing message for it, which `plan.md` §5.1 puts in
 * this layer. **Addition to `plan.md` §1.2**: §9.0 requires the mapping and names no file.
 */

import type { ConfigIssue, SurveyConfigError } from '../models/survey-config-error.model';

/** The two `JsonFetchResult` members that are not `json`. */
export type FailedFetch =
  | { readonly outcome: 'unreadable'; readonly status: number | null }
  | { readonly outcome: 'timeout' };

/**
 * The single issue a failed fetch produces. `subject` is the survey key, or
 * `survey-manifest.json` for the manifest, and is named in the message so the
 * configuration-error screen can satisfy FR-041 without the component composing text.
 */
export function fetchFailureIssue(fetched: FailedFetch, subject: string): ConfigIssue {
  if (fetched.outcome === 'timeout') {
    return {
      code: 'F19',
      path: '',
      message: `${subject} did not answer before the request deadline`,
    };
  }

  if (fetched.status === null) {
    return { code: 'F17', path: '', message: `${subject} could not be requested` };
  }

  return fetched.status >= 200 && fetched.status < 300
    ? {
        code: 'F18',
        path: '',
        message: `${subject} returned a body that is not JSON (HTTP ${fetched.status})`,
      }
    : {
        code: 'F17',
        path: '',
        message: `${subject} could not be read (HTTP ${fetched.status})`,
      };
}

/** The whole error, for a scope that carries exactly one fetch issue. */
export function fetchFailureError(
  fetched: FailedFetch,
  scope: SurveyConfigError['scope'],
  subject: string,
): SurveyConfigError {
  return { scope, subject, issues: [fetchFailureIssue(fetched, subject)] };
}
