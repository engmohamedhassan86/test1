/**
 * The FR-027 re-check, as one question's worth of rule.
 *
 * Every attached file is re-tested against its question's **current** policy immediately
 * before a submission starts, and a file that no longer satisfies it is reported as the
 * FR-069 `FILENAME: REASON` error on that question. The count is re-checked too, because
 * a config whose `maxFiles` was lowered is exactly the case FR-027 exists for.
 *
 * Split out of `page.validator.ts` so that both `validatePage` and `validateSurvey` call
 * one implementation rather than two copies.
 */

import type { SessionAttachment } from '../models/answer.model';
import type { Question } from '../models/survey.model';
import type { ValidationError } from '../models/validation.model';
import { recheckAttachment } from './attachment.validator';
import { attachmentRejectionMessage } from './messages';

function attachmentError(question: Question, message: string): ValidationError {
  return { questionId: question.id, rule: 'attachment-invalid', message };
}

/**
 * The first attachment on `question` that no longer satisfies its policy, as a
 * `ValidationError`, or `null` when every file still does.
 */
export function attachmentErrorsFor(
  question: Question,
  held: readonly SessionAttachment[],
): ValidationError | null {
  const [first, ...others] = held;
  if (first === undefined) {
    // FR-022: attachments are never required, so zero files always passes.
    return null;
  }

  const policy = question.attachments;
  if (policy === null) {
    // A question with no policy can hold no file — `addFiles` refuses — so a file found
    // here arrived by another route and is itself the violation (FR-027 fails closed).
    return attachmentError(question, `${first.name}: this file type is not accepted`);
  }

  for (const attachment of [first, ...others]) {
    const reason = recheckAttachment(attachment, policy);
    if (reason !== null) {
      return attachmentError(question, attachmentRejectionMessage(reason, attachment.name, policy));
    }
  }

  // The count half of FR-027: a lowered `maxFiles` leaves the surplus files to report.
  const overflow = held.slice(policy.maxFiles)[0];
  if (overflow !== undefined) {
    return attachmentError(
      question,
      attachmentRejectionMessage('no-free-slot', overflow.name, policy),
    );
  }

  return null;
}
