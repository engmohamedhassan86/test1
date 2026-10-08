/**
 * Every page, in survey order — T028, implementing FR-034.
 *
 * This is what runs before a submission starts: all pages in order, plus the FR-027
 * attachment re-check, which `validatePage` already performs per question. It reports
 * `earliestInvalidPageIndex` so the viewer can move the respondent to the first page that
 * needs attention rather than to the last one they were on (US6 scenario 6).
 */

import type { AnswerMap, AttachmentMap } from '../models/answer.model';
import type { Survey } from '../models/survey.model';
import type { PageValidationReport, SurveyValidationReport } from '../models/validation.model';
import { validatePage } from './page.validator';

export function validateSurvey(
  survey: Survey,
  answers: AnswerMap,
  attachments: AttachmentMap,
): SurveyValidationReport {
  const pages: PageValidationReport[] = survey.pages.map((page, index) =>
    validatePage(page, index, answers, attachments),
  );
  const invalidPageIndexes = pages
    .filter((report) => report.errors.length > 0)
    .map((report) => report.pageIndex);

  return {
    pages,
    invalidPageIndexes,
    earliestInvalidPageIndex: invalidPageIndexes[0] ?? null,
  };
}
