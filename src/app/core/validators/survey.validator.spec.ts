import { describe, expect, it } from 'vitest';

import {
  attachmentId,
  attachmentPolicy,
  page,
  radioQuestion,
  survey,
  textareaQuestion,
  textboxQuestion,
} from '../models/__fixtures__/survey-builders';
import type { Answer, AnswerMap, AttachmentMap, Question, SessionAttachment } from '../models';
import { hasMoreThanOneInvalidPage } from '../models';
import { validateSurvey } from './survey.validator';

/**
 * `validateSurvey` — T038, implementing FR-034 and the FR-027 re-check it carries.
 *
 * This is what runs *before* a submission starts, so the two facts it owns both decide
 * where the respondent lands rather than merely whether they may proceed:
 *
 * - `earliestInvalidPageIndex` sends them to the first page needing attention, not back to
 *   the page they were on (US6 scenario 6);
 * - `invalidPageIndexes` is what `hasMoreThanOneInvalidPage` reads for FR-034's summary
 *   line, so the report has to carry every invalid page and not just the first.
 *
 * The attachment re-check is asserted here as well as in `page.validator.spec.ts` because
 * plan §6.1 names *this* file as FR-027's home: a file that passed at selection and no
 * longer satisfies its policy must stop a submission, which is US6 scenario 7.
 */

function answers(entries: readonly (readonly [Question, Answer])[]): AnswerMap {
  return new Map(entries.map(([question, answer]) => [question.id, answer]));
}

function attachments(
  entries: readonly (readonly [Question, readonly SessionAttachment[]])[],
): AttachmentMap {
  return new Map(entries.map(([question, files]) => [question.id, files]));
}

const noAnswers: AnswerMap = new Map();
const noAttachments: AttachmentMap = new Map();

function file(name: string, sizeBytes: number, mimeType = 'image/png'): SessionAttachment {
  return {
    id: attachmentId(`att_${name}`),
    name,
    mimeType,
    sizeBytes,
    bytes: new Uint8Array(sizeBytes === 0 ? 0 : 1),
  };
}

function text(value: string): Answer {
  return { type: 'textbox', value };
}

describe('validateSurvey — earliest invalid page (FR-034, US6 scenario 6)', () => {
  // Four pages, matching the scenario: the respondent is on page 4, pages 1 and 3 are bad.
  const onPageOne = textboxQuestion({ id: 'q_name', required: true });
  const onPageTwo = textboxQuestion({ id: 'q_role', required: true });
  const onPageThree = textboxQuestion({ id: 'q_detail', required: true });
  const onPageFour = radioQuestion({ id: 'q_recommend' });

  const subject = survey([
    page('p1', 'One', [onPageOne]),
    page('p2', 'Two', [onPageTwo]),
    page('p3', 'Three', [onPageThree]),
    page('p4', 'Four', [onPageFour]),
  ]);

  // Pages 1 and 3 in the scenario's 1-based numbering are indexes 0 and 2.
  const pagesOneAndThreeInvalid = answers([[onPageTwo, text('Engineer')]]);

  it('names page index 0 when pages 1 and 3 are invalid', () => {
    const report = validateSurvey(subject, pagesOneAndThreeInvalid, noAttachments);

    expect(report.earliestInvalidPageIndex).toBe(0);
    expect(report.invalidPageIndexes).toEqual([0, 2]);
  });

  it('reports "more than one page" for that same report (FR-034)', () => {
    expect(
      hasMoreThanOneInvalidPage(validateSurvey(subject, pagesOneAndThreeInvalid, noAttachments)),
    ).toBe(true);
  });

  it('does not report "more than one page" when only one page is invalid', () => {
    const onlyPageThreeInvalid = answers([
      [onPageOne, text('Ada')],
      [onPageTwo, text('Engineer')],
    ]);
    const report = validateSurvey(subject, onlyPageThreeInvalid, noAttachments);

    expect(report.invalidPageIndexes).toEqual([2]);
    expect(report.earliestInvalidPageIndex).toBe(2);
    expect(hasMoreThanOneInvalidPage(report)).toBe(false);
  });

  it('returns one report per page, in survey order, each carrying its own index', () => {
    const report = validateSurvey(subject, noAnswers, noAttachments);

    expect(report.pages.map((p) => p.pageIndex)).toEqual([0, 1, 2, 3]);
    expect(report.pages[0]?.firstInvalidQuestionId).toBe(onPageOne.id);
  });

  it('names no invalid page when every page validates', () => {
    const everythingAnswered = answers([
      [onPageOne, text('Ada')],
      [onPageTwo, text('Engineer')],
      [onPageThree, text('It went well')],
    ]);
    const report = validateSurvey(subject, everythingAnswered, noAttachments);

    expect(report.invalidPageIndexes).toEqual([]);
    expect(report.earliestInvalidPageIndex).toBeNull();
    expect(hasMoreThanOneInvalidPage(report)).toBe(false);
  });

  it('validates a survey whose pages hold no questions at all', () => {
    const empty = survey([page('p1', 'One', []), page('p2', 'Two', [])]);
    const report = validateSurvey(empty, noAnswers, noAttachments);

    expect(report.invalidPageIndexes).toEqual([]);
    expect(report.earliestInvalidPageIndex).toBeNull();
  });
});

describe('validateSurvey — the FR-027 re-check at submit time (US6 scenario 7)', () => {
  const evidence = textareaQuestion({
    id: 'q_evidence',
    attachments: attachmentPolicy({ maxFiles: 2, maxSizeBytes: 5_242_880 }),
  });
  const comments = textareaQuestion({ id: 'q_comments' });

  const subject = survey([
    page('p1', 'Supporting files', [evidence]),
    page('p2', 'Final thoughts', [comments]),
  ]);

  const accepted = file('receipt.png', 1_024);

  it('passes a file that still satisfies the policy it was accepted under', () => {
    const report = validateSurvey(subject, noAnswers, attachments([[evidence, [accepted]]]));

    expect(report.invalidPageIndexes).toEqual([]);
    expect(report.earliestInvalidPageIndex).toBeNull();
  });

  it('blocks the submission when the policy tightened under an accepted file', () => {
    // The file was accepted against a 5 MB limit; the survey it is being submitted against
    // now allows 512 bytes. Nothing at selection time can catch this, which is why FR-027
    // re-checks here rather than trusting the earlier pass.
    const tightened = survey([
      page('p1', 'Supporting files', [
        textareaQuestion({
          id: 'q_evidence',
          attachments: attachmentPolicy({ maxFiles: 2, maxSizeBytes: 512 }),
        }),
      ]),
      page('p2', 'Final thoughts', [comments]),
    ]);

    const report = validateSurvey(tightened, noAnswers, attachments([[evidence, [accepted]]]));

    expect(report.earliestInvalidPageIndex).toBe(0);
    expect(report.pages[0]?.errors[0]?.rule).toBe('attachment-invalid');
    // FR-069's `FILENAME: REASON` row — the rejected file is named on the screen.
    expect(report.pages[0]?.errors[0]?.message).toContain('receipt.png');
  });

  it('blocks the submission when the question stopped accepting files altogether', () => {
    const noLongerAccepts = survey([
      page('p1', 'Supporting files', [textareaQuestion({ id: 'q_evidence', attachments: null })]),
      page('p2', 'Final thoughts', [comments]),
    ]);

    const report = validateSurvey(
      noLongerAccepts,
      noAnswers,
      attachments([[evidence, [accepted]]]),
    );

    expect(report.earliestInvalidPageIndex).toBe(0);
    expect(report.pages[0]?.errors[0]).toEqual({
      questionId: evidence.id,
      rule: 'attachment-invalid',
      message: 'You can attach up to 0 files to this question',
    });
  });

  it('reports the attachment page even when a later page also has an answer error', () => {
    const required = textareaQuestion({ id: 'q_comments', required: true });
    const twoFailures = survey([
      page('p1', 'Supporting files', [textareaQuestion({ id: 'q_evidence', attachments: null })]),
      page('p2', 'Final thoughts', [required]),
    ]);

    const report = validateSurvey(twoFailures, noAnswers, attachments([[evidence, [accepted]]]));

    expect(report.invalidPageIndexes).toEqual([0, 1]);
    expect(report.earliestInvalidPageIndex).toBe(0);
    expect(hasMoreThanOneInvalidPage(report)).toBe(true);
  });
});
