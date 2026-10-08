/**
 * One page's rules — T027. This is the one function FR-011 names: every answer on the
 * current page is validated before the respondent may leave it.
 *
 * `firstInvalidQuestionId` is the first invalid question **in page order** (FR-030), which
 * is computed here rather than in the component because that is what US2 scenario 7
 * asserts and it is worth a test of its own.
 *
 * A page with zero questions always validates (spec Edge Cases).
 */

import type { AttachmentMap, AnswerMap } from '../models/answer.model';
import type { SurveyPage } from '../models/survey.model';
import type { PageValidationReport, ValidationError } from '../models/validation.model';
import { validateAnswer } from './answer.validator';
import { attachmentErrorsFor } from './attachment-recheck';

/**
 * Validates every question on one page, in page order.
 *
 * `attachments` is read so that the FR-027 re-check can run at submit time through
 * `validateSurvey`; at Next the same re-check runs for the current page, because a file
 * that stopped satisfying its policy should block forward navigation for the same reason
 * it blocks a submission.
 */
export function validatePage(
  page: SurveyPage,
  pageIndex: number,
  answers: AnswerMap,
  attachments: AttachmentMap,
): PageValidationReport {
  const errors: ValidationError[] = [];

  for (const question of page.questions) {
    const answerError = validateAnswer(question, answers.get(question.id));
    if (answerError !== null) {
      errors.push(answerError);
      // At most one error per question (plan §4.3), so the attachment re-check below is
      // skipped for a question that already has one.
      continue;
    }
    const attachmentError = attachmentErrorsFor(question, attachments.get(question.id) ?? []);
    if (attachmentError !== null) {
      errors.push(attachmentError);
    }
  }

  const first = errors[0];
  return {
    pageIndex,
    errors,
    firstInvalidQuestionId: first === undefined ? null : first.questionId,
  };
}
