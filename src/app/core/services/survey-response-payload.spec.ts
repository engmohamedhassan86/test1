/**
 * T061 — contract tests 1 to 3 against the payload builder.
 *
 * The four rules asserted here are the ones a receiver depends on and cannot recover from
 * if the client gets them wrong: answer order, the omission of unanswered optional
 * questions, the checkbox value's option order, and the absence of the `attachments` key.
 * Plus §8.1's attachment-only entry, which exists because dropping it would lose a file
 * the respondent was told had been accepted.
 */

import { describe, expect, it } from 'vitest';

import { brand } from '../models/branded';
import type { AttachmentId, ClientSubmissionId, OptionValue, QuestionId } from '../models/branded';
import type { Answer, AnswerMap, AttachmentMap, SessionAttachment } from '../models/answer.model';
import {
  checkboxQuestion,
  customerFeedbackSurvey,
  option,
  optionValue,
  page,
  questionId,
  radioQuestion,
  ratingQuestion,
  satisfactionQuestion,
  survey,
  textareaQuestion,
  textboxQuestion,
} from '../models/__fixtures__/survey-builders';
import { buildSurveyResponse } from './survey-response-payload';

const IDS = {
  clientSubmissionId: brand<ClientSubmissionId>('11111111-2222-3333-4444-555555555555'),
  submittedAt: '2026-10-08T10:30:00.000Z',
};

function answers(entries: readonly [string, Answer][]): AnswerMap {
  return new Map(entries.map(([id, answer]) => [questionId(id), answer]));
}

function attachment(overrides: Partial<SessionAttachment> = {}): SessionAttachment {
  return {
    id: brand<AttachmentId>(overrides.id ?? 'att-1'),
    name: overrides.name ?? 'receipt.pdf',
    mimeType: overrides.mimeType ?? 'application/pdf',
    sizeBytes: overrides.sizeBytes ?? 1_048_576,
    bytes: overrides.bytes ?? new Uint8Array([1, 2, 3]),
  };
}

function attachmentsFor(id: string, held: readonly SessionAttachment[]): AttachmentMap {
  return new Map<QuestionId, readonly SessionAttachment[]>([[questionId(id), held]]);
}

const NO_ATTACHMENTS: AttachmentMap = new Map();
const NO_ENCODED = new Map<AttachmentId, string>();

describe('buildSurveyResponse', () => {
  it('carries the survey key and the identity it was handed', () => {
    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      new Map(),
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    expect(response.surveyKey).toBe('customer-feedback');
    expect(response.clientSubmissionId).toBe(IDS.clientSubmissionId);
    expect(response.submittedAt).toBe('2026-10-08T10:30:00.000Z');
  });

  it('orders answers by survey page order then question order, not answer order', () => {
    // Answered deliberately back to front, so an implementation that preserved insertion
    // order would fail here.
    const given = answers([
      ['q_recommend', { type: 'radio', value: optionValue('yes') }],
      ['q_satisfaction', { type: 'satisfaction', value: 4 }],
      ['q_name', { type: 'textbox', value: 'Dana' }],
      ['q_segment', { type: 'radio', value: optionValue('returning') }],
    ]);

    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      given,
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    expect(response.answers.map((entry) => entry.questionId)).toEqual([
      'q_name',
      'q_segment',
      'q_satisfaction',
      'q_recommend',
    ]);
  });

  it('omits an unanswered optional question rather than sending null', () => {
    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      answers([['q_name', { type: 'textbox', value: 'Dana' }]]),
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    expect(response.answers).toHaveLength(1);
    expect(response.answers[0]).toEqual({ questionId: 'q_name', type: 'textbox', value: 'Dana' });
  });

  it('carries each type with the value shape contract §2 fixes for it', () => {
    const configured = survey([
      page('p1', 'All types', [
        radioQuestion({ id: 'q_radio' }),
        checkboxQuestion({
          id: 'q_checkbox',
          options: [option('a', 'A'), option('b', 'B'), option('c', 'C')],
        }),
        textboxQuestion({ id: 'q_textbox' }),
        textareaQuestion({ id: 'q_textarea' }),
        ratingQuestion({ id: 'q_rating' }),
        satisfactionQuestion({ id: 'q_satisfaction' }),
      ]),
    ]);

    const response = buildSurveyResponse(
      configured,
      answers([
        ['q_radio', { type: 'radio', value: optionValue('a') }],
        ['q_checkbox', { type: 'checkbox', value: [optionValue('a'), optionValue('c')] as const }],
        ['q_textbox', { type: 'textbox', value: 'Dana' }],
        ['q_textarea', { type: 'textarea', value: 'The parcel arrived opened.' }],
        ['q_rating', { type: 'rating', value: 4 }],
        ['q_satisfaction', { type: 'satisfaction', value: 5 }],
      ]),
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    expect(response.answers).toEqual([
      { questionId: 'q_radio', type: 'radio', value: 'a' },
      { questionId: 'q_checkbox', type: 'checkbox', value: ['a', 'c'] },
      { questionId: 'q_textbox', type: 'textbox', value: 'Dana' },
      { questionId: 'q_textarea', type: 'textarea', value: 'The parcel arrived opened.' },
      { questionId: 'q_rating', type: 'rating', value: 4 },
      { questionId: 'q_satisfaction', type: 'satisfaction', value: 5 },
    ]);
  });

  it('omits the attachments key entirely when the question accepted no file', () => {
    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      answers([['q_name', { type: 'textbox', value: 'Dana' }]]),
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    // Not `null` and not `[]` — contract §2 is explicit, and a receiver branching on
    // presence would mis-read either.
    expect('attachments' in response.answers[0]).toBe(false);
  });

  it('carries the base64 content it was handed for each held attachment', () => {
    const held = attachment();

    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      answers([['q_evidence', { type: 'textarea', value: 'The parcel arrived opened.' }]]),
      attachmentsFor('q_evidence', [held]),
      new Map([[held.id, 'JVBERi0xLjQK']]),
      IDS,
    );

    expect(response.answers[0].attachments).toEqual([
      {
        name: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1_048_576,
        content: 'JVBERi0xLjQK',
      },
    ]);
  });

  it('includes a question with an attachment but no value, carrying "" (§8.1, research D16)', () => {
    const held = attachment();

    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      new Map(),
      attachmentsFor('q_evidence', [held]),
      new Map([[held.id, 'JVBERi0xLjQK']]),
      IDS,
    );

    // By the letter of §2 this question is unanswered and would be dropped, taking the
    // respondent's receipt with it. §8.1 resolves that: it is included with "".
    expect(response.answers).toHaveLength(1);
    expect(response.answers[0].questionId).toBe('q_evidence');
    expect(response.answers[0].value).toBe('');
    expect(response.answers[0].attachments).toHaveLength(1);
  });

  it('keeps the checkbox value in option order whatever order it was stored in', () => {
    const configured = survey([
      page('p1', 'Only page', [
        checkboxQuestion({
          id: 'q_liked',
          options: [option('a', 'A'), option('b', 'B'), option('c', 'C')],
        }),
      ]),
    ]);

    const response = buildSurveyResponse(
      configured,
      answers([
        ['q_liked', { type: 'checkbox', value: [optionValue('c'), optionValue('a')] as const }],
      ]),
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    // The builder re-states rather than re-sorts: `setAnswer` normalised the order on the
    // way in, which this asserts has not been undone.
    expect(response.answers[0].value).toEqual(['c', 'a']);
  });

  it('builds an empty answers array for a survey nothing was answered on', () => {
    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      new Map(),
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    expect(response.answers).toEqual([]);
  });

  it('refuses to build a payload for an attachment the caller did not encode', () => {
    const held = attachment();

    // A caller bug rather than a reachable state — `submit` encodes every held attachment
    // first — but the two ways of handling it are not equally safe, so the builder fails
    // closed instead of staying total.
    //
    // The alternative, `content: ''`, produces a descriptor whose content decodes to 0
    // bytes while `sizeBytes` claims otherwise, which contract §2 forbids. That payload
    // would be *acknowledged*, so the respondent would be shown the confirmation screen
    // for a file the receiver never got — Principle III failing open on the one path where
    // the loss is silent and unrecoverable. Throwing turns the same bug into a submission
    // error that keeps every answer and attachment.
    expect(() =>
      buildSurveyResponse(
        customerFeedbackSurvey(),
        new Map(),
        attachmentsFor('q_evidence', [held]),
        NO_ENCODED,
        IDS,
      ),
    ).toThrow(/was not encoded/);
  });

  it('carries a nominal OptionValue through unchanged', () => {
    const value: OptionValue = optionValue('returning');

    const response = buildSurveyResponse(
      customerFeedbackSurvey(),
      answers([['q_segment', { type: 'radio', value }]]),
      NO_ATTACHMENTS,
      NO_ENCODED,
      IDS,
    );

    expect(response.answers[0].value).toBe('returning');
  });
});
