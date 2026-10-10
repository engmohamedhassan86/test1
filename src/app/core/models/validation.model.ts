/**
 * Answer-validation model — `data-model.md` §7.
 *
 * `firstInvalidQuestionId` is computed by the validator, not by the component, because
 * "first in page order" is the thing FR-030 and US2 scenario 7 assert.
 */

import type { QuestionId } from './branded';

/** One row of the FR-069 catalogue. The config cannot add to this list. */
export type ValidationRuleId =
  | 'required-radio'
  | 'required-checkbox'
  | 'required-text'
  | 'required-scale'
  | 'min-length'
  | 'max-length'
  | 'min-selections'
  | 'max-selections'
  | 'scale-range'
  | 'attachment-invalid';

export interface ValidationError {
  readonly questionId: QuestionId;
  readonly rule: ValidationRuleId;
  /** FR-069 only. Derived from the question's type and configured numbers; never authored. */
  readonly message: string;
}

/** FR-030: errors in page order, with the control that must receive focus named. */
export interface PageValidationReport {
  readonly pageIndex: number;
  readonly errors: readonly ValidationError[];
  readonly firstInvalidQuestionId: QuestionId | null;
}

/** FR-034: all pages in order, with the earliest invalid page named. */
export interface SurveyValidationReport {
  readonly pages: readonly PageValidationReport[];
  readonly invalidPageIndexes: readonly number[];
  readonly earliestInvalidPageIndex: number | null;
}

/** What `validation-error` is showing, and therefore what the summary says. */
export type ValidationScope = 'page' | 'survey';

/** FR-034's "answers to fix on more than one page", as a property of the report. */
export function hasMoreThanOneInvalidPage(report: SurveyValidationReport): boolean {
  return report.invalidPageIndexes.length > 1;
}

/** True when the page carries no error at all. */
export function isPageValid(report: PageValidationReport): boolean {
  return report.errors.length === 0;
}
