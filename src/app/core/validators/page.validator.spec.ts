import { describe, expect, it } from 'vitest';

import {
  attachmentId,
  attachmentPolicy,
  page,
  radioQuestion,
  textboxQuestion,
} from '../models/__fixtures__/survey-builders';
import type { Answer, AnswerMap, AttachmentMap, Question, SessionAttachment } from '../models';
import { validatePage } from './page.validator';

/**
 * `validatePage` — T037, implementing FR-011 and FR-030.
 *
 * The one fact this layer owns and no component may recompute is `firstInvalidQuestionId`:
 * the first invalid question **in page order**, not in answer-map order and not in the
 * order the respondent happened to touch the controls. US2 scenario 7 asserts it, so it
 * gets the first and longest case below.
 *
 * The attachment half is here rather than in `attachment.validator.spec.ts` because the
 * composition is what matters: a question that already has an answer error does not also
 * report an attachment error (plan §4.3's one-error-per-question rule).
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

describe('validatePage — first invalid question in page order (FR-030, US2 scenario 7)', () => {
  const first = textboxQuestion({ id: 'q_name', required: true });
  const middle = radioQuestion({ id: 'q_segment' });
  const last = textboxQuestion({ id: 'q_role', required: true });
  const subject = page('p_about', 'About you', [first, middle, last]);

  it('names the earlier of two invalid questions, whatever order the answers arrived in', () => {
    const report = validatePage(subject, 0, noAnswers, noAttachments);

    expect(report.errors.map((error) => error.questionId)).toEqual([first.id, last.id]);
    expect(report.firstInvalidQuestionId).toBe(first.id);
  });

  it('names the later question once the earlier one is answered', () => {
    // The guard against "first" meaning "first the respondent saw fail": fixing the top
    // question must move focus down, not leave it where it was.
    const report = validatePage(
      subject,
      0,
      answers([[first, { type: 'textbox', value: 'Ada' }]]),
      noAttachments,
    );

    expect(report.firstInvalidQuestionId).toBe(last.id);
    expect(report.errors).toHaveLength(1);
  });

  it('reports the pageIndex it was given, unchanged', () => {
    expect(validatePage(subject, 3, noAnswers, noAttachments).pageIndex).toBe(3);
  });

  it('reports no first invalid question when every answer is valid', () => {
    const report = validatePage(
      subject,
      0,
      answers([
        [first, { type: 'textbox', value: 'Ada' }],
        [last, { type: 'textbox', value: 'Engineer' }],
      ]),
      noAttachments,
    );

    expect(report.errors).toEqual([]);
    expect(report.firstInvalidQuestionId).toBeNull();
  });
});

describe('validatePage — a page with zero questions', () => {
  it('always validates (spec Edge Cases)', () => {
    const report = validatePage(page('p_intro', 'Welcome', []), 0, noAnswers, noAttachments);

    expect(report).toEqual({ pageIndex: 0, errors: [], firstInvalidQuestionId: null });
  });

  it('still validates when the maps hold entries for questions it does not own', () => {
    const elsewhere = textboxQuestion({ id: 'q_other', required: true });

    const report = validatePage(
      page('p_intro', 'Welcome', []),
      1,
      answers([[elsewhere, { type: 'textbox', value: 'x' }]]),
      attachments([[elsewhere, [file('huge.png', 99_000_000)]]]),
    );

    expect(report.errors).toEqual([]);
  });
});

describe('validatePage — the FR-027 attachment re-check', () => {
  const question = textboxQuestion({
    id: 'q_evidence',
    attachments: attachmentPolicy({ maxFiles: 1, maxSizeBytes: 1_024 }),
  });
  const subject = page('p_files', 'Supporting files', [question]);
  const answered = answers([[question, { type: 'textbox', value: 'See attached' }]]);

  it('reports a held file that no longer satisfies its policy', () => {
    const report = validatePage(
      subject,
      0,
      answered,
      attachments([[question, [file('receipt.png', 4_096)]]]),
    );

    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]?.rule).toBe('attachment-invalid');
    expect(report.firstInvalidQuestionId).toBe(question.id);
  });

  it('passes when the held file still satisfies the policy', () => {
    const report = validatePage(
      subject,
      0,
      answered,
      attachments([[question, [file('receipt.png', 512)]]]),
    );

    expect(report.errors).toEqual([]);
  });

  it('treats a missing attachment entry as holding no files', () => {
    expect(validatePage(subject, 0, answered, noAttachments).errors).toEqual([]);
  });

  it('reports one error, not two, for a question whose answer is also invalid', () => {
    // plan §4.3: at most one error per question. An unanswered required question skips
    // its attachment re-check, so the respondent is not told two things about one control.
    const required = textboxQuestion({
      id: 'q_evidence',
      required: true,
      attachments: attachmentPolicy({ maxFiles: 1, maxSizeBytes: 1_024 }),
    });

    const report = validatePage(
      page('p_files', 'Supporting files', [required]),
      0,
      noAnswers,
      attachments([[required, [file('receipt.png', 4_096)]]]),
    );

    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toEqual({
      questionId: required.id,
      rule: 'required-text',
      message: 'Enter an answer',
    });
  });
});
