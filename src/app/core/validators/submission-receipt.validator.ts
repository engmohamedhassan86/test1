/**
 * Recognising an acknowledgement — T029, `contracts/response-submission.md` §3 and §9.1.
 *
 * This is the **only** predicate that may produce the `submitted` state. Both fields must
 * be present, both strings and both non-empty, or it is not an acknowledgement (FR-037).
 * An adapter that receives a 200 whose body fails this guard returns `malformed-response`,
 * never `acknowledged` — which is the only reason the `submitted` state can be trusted.
 */

import type { SubmissionReceipt } from '../models/survey-response.model';
import { requireObject, requireString } from './json-reader';

export function isSubmissionReceipt(raw: unknown): raw is SubmissionReceipt {
  const object = requireObject(raw);
  if (!object.ok) {
    return false;
  }
  const submissionId = requireString(object.value['submissionId']);
  const receivedAt = requireString(object.value['receivedAt']);
  return (
    submissionId.ok && submissionId.value.length > 0 && receivedAt.ok && receivedAt.value.length > 0
  );
}
