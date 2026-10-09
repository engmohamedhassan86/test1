/**
 * The real adapter — T057, `contracts/response-submission.md` §11.
 *
 * `POST /api/survey-responses`, body exactly the §8 `SurveyResponse` with no envelope,
 * `Idempotency-Key` equal to `response.clientSubmissionId` (contract test 11, FR-061).
 *
 * Three rules are load-bearing here and nowhere else:
 *
 * - **The request carries no credential.** No `Authorization` header, and
 *   `credentials: 'omit'` so no cookie is attached either — the endpoint is anonymous
 *   (FR-062, contract §4). `unauthorized` therefore describes a deployment closed to
 *   responses, not a respondent who needs to sign in, so a 401 fails closed to a
 *   `submission-error` and never to a credential prompt (contract test 12).
 * - **The body decides, not the status** (§11.2). A 200 or 201 is an acknowledgement only
 *   when its body satisfies `isSubmissionReceipt`; an empty body, an HTML index fallback
 *   or a body missing `submissionId` is `malformed-response` (contract test 5). This is the
 *   same rule `JsonFetchService` applies to a config.
 * - **It resolves; it never rejects** (§9 obligation 1). Every throw `fetch` can produce is
 *   caught and mapped, so the caller is never left in `submitting`.
 *
 * It is **not wired by default**: `SimulatedSurveyResponseGateway` is the `providedIn: 'root'`
 * adapter, so gate 3 stays deterministic (FR-068, contract §5). This class carries a bare
 * `@Injectable()` and is deliberately absent from the `core/services` barrel, so it reaches
 * a bundle only when a deployment names it in a `providers` array.
 *
 * `JsonFetchService` is not reused: that service owns its own `AbortController` deadline and
 * answers `json | unreadable | timeout`, which loses the status this mapping needs and takes
 * the 15s clock away from the caller (§9 obligation 2).
 */

import { Injectable } from '@angular/core';

import { brand } from '../models/branded';
import type { QuestionId } from '../models/branded';
import type {
  SubmissionFailureDetail,
  SubmissionFailureKind,
  SubmissionResult,
  SurveyResponse,
} from '../models/survey-response.model';
import { hasContent, requireArray, requireObject, requireString } from '../validators/json-reader';
import { submissionFailureMessage } from '../validators/messages';
import { isSubmissionReceipt } from '../validators/submission-receipt.validator';
import { SurveyResponseGateway } from './survey-response.gateway';

/** Contract §11.1. Relative, so the viewer posts to whatever origin serves it. */
export const SURVEY_RESPONSE_ENDPOINT = '/api/survey-responses';

@Injectable()
export class HttpSurveyResponseGateway extends SurveyResponseGateway {
  override async submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult> {
    let httpResponse: Response;
    try {
      httpResponse = await fetch(SURVEY_RESPONSE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': response.clientSubmissionId,
        },
        body: JSON.stringify(response),
        // FR-062. Not a default to rely on: `same-origin` would attach a session cookie to
        // a request that must carry no identity at all.
        credentials: 'omit',
        signal,
      });
    } catch {
      // An abort is the caller's 15s deadline (§9 obligation 2), so the adapter reports
      // `timeout` rather than inventing a transport failure it did not observe. Anything
      // else — offline, DNS, a reset connection — is `transport-error`.
      return failedWith(signal.aborted ? 'timeout' : 'transport-error');
    }

    const body = await readJsonBody(httpResponse);

    if (httpResponse.status === 200 || httpResponse.status === 201) {
      if (!isSubmissionReceipt(body)) {
        return failedWith('malformed-response');
      }
      // Rebuilt field by field rather than passed through, so a receiver's extra keys
      // never reach the confirmation screen.
      return {
        outcome: 'acknowledged',
        receipt: { submissionId: body.submissionId, receivedAt: body.receivedAt },
      };
    }

    const kind = failureKindForStatus(httpResponse.status);
    return {
      outcome: 'failed',
      failure: {
        kind,
        message: submissionFailureMessage(kind),
        // Contract §4: empty unless the kind is `rejected`.
        details: kind === 'rejected' ? readDetails(body) : [],
      },
    };
  }
}

/**
 * Contract §11.3, complete. The final branch is the fail-closed default: an unmapped status
 * — 301, 418, 429 — is a failure, never an acknowledgement. 429 lands here deliberately,
 * because this feature has no retry-after behaviour; "Try again" is the retry.
 */
function failureKindForStatus(status: number): SubmissionFailureKind {
  if (status === 400 || status === 422) {
    return 'rejected';
  }
  if (status === 401 || status === 403) {
    return 'unauthorized';
  }
  if (status === 404) {
    return 'not-found';
  }
  return 'server-error';
}

/**
 * Reads the body once, as text, then parses. `Response.json()` throws on an empty body and
 * on an HTML index fallback, and both of those are ordinary answers from a misconfigured
 * deployment rather than exceptions — `undefined` lets the caller's mapping decide.
 */
async function readJsonBody(httpResponse: Response): Promise<unknown> {
  try {
    const text = await httpResponse.text();
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Contract §11.3: `details` is read when present and well-formed and is `[]` otherwise. A
 * malformed `details` downgrades to an empty list rather than turning the whole response
 * into `malformed-response` — the failure is already classified correctly and the detail is
 * decoration. Entries are filtered individually for the same reason.
 *
 * The further §11.3 rule — drop an entry naming a question the open survey does not have —
 * is not applied here: this adapter is handed the payload, not the survey, and the payload
 * omits unanswered optional questions, so filtering against it would discard exactly the
 * details a respondent most needs. That drop belongs to the layer that holds the survey.
 */
function readDetails(body: unknown): readonly SubmissionFailureDetail[] {
  const object = requireObject(body);
  if (!object.ok) {
    return [];
  }
  const entries = requireArray(object.value['details']);
  if (!entries.ok) {
    return [];
  }

  const details: SubmissionFailureDetail[] = [];
  for (const entry of entries.value) {
    const fields = requireObject(entry);
    if (!fields.ok) {
      continue;
    }
    const questionId = requireString(fields.value['questionId']);
    const reason = requireString(fields.value['reason']);
    if (
      !questionId.ok ||
      !reason.ok ||
      !hasContent(questionId.value) ||
      !hasContent(reason.value)
    ) {
      continue;
    }
    details.push({ questionId: brand<QuestionId>(questionId.value), reason: reason.value });
  }
  return details;
}

function failedWith(kind: SubmissionFailureKind): SubmissionResult {
  return {
    outcome: 'failed',
    failure: { kind, message: submissionFailureMessage(kind), details: [] },
  };
}
