/**
 * One question's answer rules — T025, implementing FR-012 to FR-018 and FR-070.
 *
 * Pure: no injection, no clock, no network. At most one error per question, which is
 * sound because FR-014 makes the required and `minLength` rules mutually exclusive and no
 * two other rules on one question can break together.
 *
 * Two rules are easy to get backwards and are therefore stated here:
 *
 * - **Required beats `minLength`** (FR-014). Unanswered is *absence* from the answers map,
 *   and `setAnswer` deletes an entry whose trimmed text is empty — so `"  "` on a required
 *   `minLength: 2` textbox arrives here as `undefined` and reports `Enter an answer`, not
 *   `Use at least 2 characters`. No rule-ordering code is needed for it (US2 scenario 2).
 * - **`minLength`, `minSelections` and the range rules apply only to a question that has a
 *   value.** An optional question left empty passes.
 */

import { assertNever } from '../models/assert-never';
import { effectiveMinSelections, scaleOf } from '../models/survey.model';
import type { Question } from '../models/survey.model';
import type { Answer } from '../models/answer.model';
import type { ValidationError, ValidationRuleId } from '../models/validation.model';
import { codePointLength } from './json-reader';
import {
  maxLengthMessage,
  maxSelectionsMessage,
  minLengthMessage,
  minSelectionsMessage,
  requiredRadioMessage,
  requiredTextMessage,
  scaleRangeMessage,
} from './messages';

function error(question: Question, rule: ValidationRuleId, message: string): ValidationError {
  return { questionId: question.id, rule, message };
}

/**
 * Validates one question against its answer, or against the absence of one.
 *
 * `answer` is `undefined` exactly when the question is unanswered (D4). The caller never
 * passes an empty string, an empty selection or a `null`: those are not representable.
 */
export function validateAnswer(
  question: Question,
  answer: Answer | undefined,
): ValidationError | null {
  switch (question.type) {
    case 'radio':
      // FR-012: answered only when a value is held.
      if (answer === undefined) {
        return question.required ? error(question, 'required-radio', requiredRadioMessage()) : null;
      }
      return null;

    case 'checkbox': {
      const held = answer === undefined ? 0 : answer.type === 'checkbox' ? answer.value.length : 0;
      const minimum = effectiveMinSelections(question);
      // FR-016: `required` raises a minimum of 0 to 1, so the required and minSelections
      // rules are the same rule with the same wording.
      if (held < minimum) {
        return error(question, 'min-selections', minSelectionsMessage(question));
      }
      // FR-070: exceeding `maxSelections` is a validation error here, not only a control
      // constraint, so a selection arriving by any other route fails closed.
      if (held > question.maxSelections) {
        return error(question, 'max-selections', maxSelectionsMessage(question));
      }
      return null;
    }

    case 'textbox':
    case 'textarea': {
      if (answer === undefined) {
        return question.required ? error(question, 'required-text', requiredTextMessage()) : null;
      }
      const value = answer.type === question.type ? answer.value : '';
      // FR-013: trimmed, counted in Unicode code points, so an emoji is one character.
      const length = codePointLength(value);
      if (length === 0) {
        return question.required ? error(question, 'required-text', requiredTextMessage()) : null;
      }
      // FR-014: `minLength` applies only to a non-empty answer.
      if (length < question.minLength) {
        return error(question, 'min-length', minLengthMessage(question));
      }
      // FR-015: checked here as well as refused at the control, because a control
      // constraint alone would fail open.
      if (length > question.maxLength) {
        return error(question, 'max-length', maxLengthMessage(question));
      }
      return null;
    }

    case 'rating':
    case 'satisfaction': {
      if (answer === undefined) {
        return question.required
          ? error(question, 'required-scale', scaleRangeMessage(question))
          : null;
      }
      const { min, max } = scaleOf(question);
      const value = answer.type === question.type ? answer.value : Number.NaN;
      // FR-018: a value outside the inclusive configured range is a validation error.
      if (!Number.isInteger(value) || value < min || value > max) {
        return error(question, 'scale-range', scaleRangeMessage(question));
      }
      return null;
    }
  }
  // No `default` branch: a seventh question type is a build failure here (plan §5.3).
  return assertNever(question);
}
