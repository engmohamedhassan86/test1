/**
 * The two derived properties of a validation report. FR-034's "more than one page" is
 * asserted here as a property of the report rather than inside the summary component,
 * which is what keeps the branch out of a template.
 */

import { hasMoreThanOneInvalidPage, isPageValid } from './validation.model';
import type { PageValidationReport, SurveyValidationReport } from './validation.model';
import { questionId } from './__fixtures__/survey-builders';

function pageReport(pageIndex: number, invalid: boolean): PageValidationReport {
  return invalid
    ? {
        pageIndex,
        errors: [
          { questionId: questionId('q_name'), rule: 'required-text', message: 'Enter an answer' },
        ],
        firstInvalidQuestionId: questionId('q_name'),
      }
    : { pageIndex, errors: [], firstInvalidQuestionId: null };
}

function surveyReport(invalidPageIndexes: readonly number[]): SurveyValidationReport {
  return {
    pages: [0, 1, 2, 3].map((index) => pageReport(index, invalidPageIndexes.includes(index))),
    invalidPageIndexes,
    earliestInvalidPageIndex: invalidPageIndexes[0] ?? null,
  };
}

describe('hasMoreThanOneInvalidPage (FR-034)', () => {
  it('is false when nothing is invalid', () => {
    expect(hasMoreThanOneInvalidPage(surveyReport([]))).toBe(false);
  });

  it('is false for a single invalid page', () => {
    expect(hasMoreThanOneInvalidPage(surveyReport([2]))).toBe(false);
  });

  it('is true for two invalid pages', () => {
    expect(hasMoreThanOneInvalidPage(surveyReport([0, 2]))).toBe(true);
  });
});

describe('isPageValid', () => {
  it('is true for a page with no error', () => {
    expect(isPageValid(pageReport(0, false))).toBe(true);
  });

  it('is false for a page with one error', () => {
    expect(isPageValid(pageReport(0, true))).toBe(false);
  });
});
