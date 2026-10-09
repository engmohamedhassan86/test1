/**
 * T074 — every command in the `plan.md` §4.3 table, and the contract tests that are
 * properties of the session rather than of an adapter.
 *
 * The assertions that matter most are the ones about two pieces of state at once, because
 * those are the ones a split service would get wrong: an answer change clearing exactly one
 * error, Previous discarding errors but no answers, a blocked Submit minting no id and
 * making no call, and every answer surviving every failure kind.
 */

import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Question, Survey } from '../models/survey.model';
import {
  attachmentId,
  optionValue,
  page,
  questionId,
  radioQuestion,
  satisfactionQuestion,
  survey,
  textboxQuestion,
  checkboxQuestion,
  option,
  ratingQuestion,
  customerFeedbackSurvey,
  attachmentPolicy,
  textareaQuestion,
} from '../models/__fixtures__/survey-builders';
import type { SubmissionFailureKind } from '../models/survey-response.model';
import { AnnouncerService } from './announcer.service';
import { AttachmentCodecService } from './attachment-codec.service';
import { IdFactoryService } from './id-factory.service';
import { SurveyResponseGateway } from './survey-response.gateway';
import { SurveySessionService } from './survey-session.service';
import { SURVEY_TIMEOUTS } from './survey-timeouts';
import {
  AcknowledgingSurveyResponseGateway,
  FailingSurveyResponseGateway,
} from './testing/failing-survey-response.gateway';

const TIMEOUTS = { fetchMs: 10_000, submitMs: 15_000 };

function configure(gateway: SurveyResponseGateway): SurveySessionService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      SurveySessionService,
      AnnouncerService,
      AttachmentCodecService,
      IdFactoryService,
      { provide: SURVEY_TIMEOUTS, useValue: TIMEOUTS },
      { provide: SurveyResponseGateway, useValue: gateway },
    ],
  });
  return TestBed.inject(SurveySessionService);
}

/** One required radio on one page — the smallest survey that can be blocked. */
function requiredRadioSurvey(): Survey {
  return survey([page('p1', 'Only page', [radioQuestion({ id: 'q_pick', required: true })])]);
}

/** Two pages, each with one required question, so Next and Submit both have work to do. */
function twoPageSurvey(): Survey {
  return survey([
    page('p1', 'First', [textboxQuestion({ id: 'q_name', required: true, minLength: 2 })]),
    page('p2', 'Second', [radioQuestion({ id: 'q_pick', required: true })]),
  ]);
}

function questionOn(subject: Survey, pageIndex: number, questionIndex: number): Question {
  const found = subject.pages[pageIndex].questions[questionIndex];
  if (found === undefined) {
    throw new Error('fixture does not hold that question');
  }
  return found;
}

describe('SurveySessionService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('open and openFailed', () => {
    it('opens at page 1 in ready with nothing answered and no id minted', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());

      session.open(customerFeedbackSurvey());

      expect(session.state().kind).toBe('ready');
      expect(session.currentPageIndex()).toBe(0);
      expect(session.answers().size).toBe(0);
      expect(session.attachments().size).toBe(0);
      expect(session.questionErrors().size).toBe(0);
      expect(session.dirty()).toBe(false);
      expect(session.positionLabel()).toBe('Page 1 of 4');
    });

    it('reopens from the terminal submitted state, which is a reset and not a transition', async () => {
      const gateway = new AcknowledgingSurveyResponseGateway();
      const session = configure(gateway);
      const subject = requiredRadioSurvey();

      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });
      await session.submit();
      expect(session.state().kind).toBe('submitted');

      session.open(subject);

      // `submitted` has no outgoing edge, so this only works because `open` resets the
      // machine to `loading` first — which is what US1's reopen scenario needs.
      expect(session.state().kind).toBe('ready');
      expect(session.answers().size).toBe(0);
    });

    it('opens failed into the terminal configuration-error state', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());

      session.openFailed({
        scope: 'survey',
        subject: 'customer-feedback',
        issues: [{ code: 'F02', path: 'pages[0].title', message: 'required field missing' }],
      });

      const state = session.state();
      expect(state.kind).toBe('configuration-error');
      // FR-040/FR-042: the state carries no survey at all, so no screen can read one.
      expect(session.survey()).toBeNull();
    });

    it('throws on an illegal transition rather than failing open', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      session.openFailed({
        scope: 'manifest',
        subject: 'survey-manifest.json',
        issues: [{ code: 'F01', path: '', message: 'not JSON' }],
      });

      // `configuration-error` is terminal. Anything that moved out of it would be a
      // partial survey rendering over a broken config.
      expect(() => session.open(customerFeedbackSurvey())).not.toThrow();
    });
  });

  describe('setAnswer and clearAnswer', () => {
    it('trims text and stores the trimmed value', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([page('p1', 'Only', [textboxQuestion({ id: 'q_name' })])]);
      session.open(subject);

      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: '  Dana  ' });

      expect(session.answers().get(questionId('q_name'))).toEqual({
        type: 'textbox',
        value: 'Dana',
      });
    });

    it('deletes the entry when the trimmed text is empty, so unanswered stays absence', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([page('p1', 'Only', [textboxQuestion({ id: 'q_name' })])]);
      session.open(subject);
      const question = questionOn(subject, 0, 0);

      session.setAnswer(question, { kind: 'text', value: 'Dana' });
      session.setAnswer(question, { kind: 'text', value: '   ' });

      expect(session.answers().has(questionId('q_name'))).toBe(false);
    });

    it('reports the required rule, not minLength, for whitespace on a required question', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'First', [textboxQuestion({ id: 'q_name', required: true, minLength: 2 })]),
        page('p2', 'Second', []),
      ]);
      session.open(subject);

      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: '  ' });
      session.next();

      // The trim on the way in is what makes US2 scenario 2 fall out of the model: `"  "`
      // never became an answer, so the required rule is the one that runs.
      expect(session.questionErrors().get(questionId('q_name'))?.rule).toBe('required-text');
    });

    it('orders a checkbox selection by the question option order, not selection order', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'Only', [
          checkboxQuestion({
            id: 'q_liked',
            options: [option('a', 'A'), option('b', 'B'), option('c', 'C')],
          }),
        ]),
      ]);
      session.open(subject);

      session.setAnswer(questionOn(subject, 0, 0), {
        kind: 'options',
        values: [optionValue('c'), optionValue('a')],
      });

      expect(session.answers().get(questionId('q_liked'))).toEqual({
        type: 'checkbox',
        value: ['a', 'c'],
      });
    });

    it('deletes the entry when a checkbox selection reduces to zero', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([page('p1', 'Only', [checkboxQuestion({ id: 'q_liked' })])]);
      session.open(subject);
      const question = questionOn(subject, 0, 0);

      session.setAnswer(question, { kind: 'options', values: [optionValue('a')] });
      session.setAnswer(question, { kind: 'options', values: [] });

      expect(session.answers().has(questionId('q_liked'))).toBe(false);
    });

    it('clears that question error immediately and leaves the others standing (FR-020)', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'First', [
          textboxQuestion({ id: 'q_name', required: true }),
          radioQuestion({ id: 'q_pick', required: true }),
        ]),
        page('p2', 'Second', []),
      ]);
      session.open(subject);

      session.next();
      expect(session.questionErrors().size).toBe(2);

      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });

      // One answer fixed removes one message, not the whole summary — US2 scenario 8.
      expect(session.questionErrors().has(questionId('q_name'))).toBe(false);
      expect(session.questionErrors().has(questionId('q_pick'))).toBe(true);
    });

    it('moves ready to editing on the first answer and sets dirty', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = requiredRadioSurvey();
      session.open(subject);

      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

      expect(session.state().kind).toBe('editing');
      expect(session.dirty()).toBe(true);
    });

    it('clears an answer on a required question (FR-060)', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'Only', [satisfactionQuestion({ id: 'q_mood', required: true })]),
      ]);
      session.open(subject);
      const question = questionOn(subject, 0, 0);

      session.setAnswer(question, { kind: 'point', value: 4 });
      session.clearAnswer(question.id);

      // Clearing is allowed; the required rule then reports at Next, which is the point.
      expect(session.answers().has(questionId('q_mood'))).toBe(false);
    });

    it('stores only the five satisfaction points and ignores anything outside them', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([page('p1', 'Only', [satisfactionQuestion({ id: 'q_mood' })])]);
      session.open(subject);
      const question = questionOn(subject, 0, 0);

      session.setAnswer(question, { kind: 'point', value: 4 });
      expect(session.answers().get(questionId('q_mood'))).toEqual({
        type: 'satisfaction',
        value: 4,
      });

      session.setAnswer(question, { kind: 'point', value: 0 });
      // FR-010 / US2 scenario 11: there is no zero and no sixth point to store.
      expect(session.answers().has(questionId('q_mood'))).toBe(false);
    });
  });

  describe('isOptionSelectable and maxLengthOf', () => {
    it('stops being selectable at maxSelections and becomes selectable again after a de-selection', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'Only', [
          checkboxQuestion({
            id: 'q_liked',
            maxSelections: 2,
            options: [option('a', 'A'), option('b', 'B'), option('c', 'C')],
          }),
        ]),
      ]);
      session.open(subject);
      const question = questionOn(subject, 0, 0);
      if (question.type !== 'checkbox') {
        throw new Error('fixture is not a checkbox');
      }
      const cSelectable = session.isOptionSelectable(question, optionValue('c'));

      expect(cSelectable()).toBe(true);

      session.setAnswer(question, {
        kind: 'options',
        values: [optionValue('a'), optionValue('b')],
      });
      expect(cSelectable()).toBe(false);

      session.setAnswer(question, { kind: 'options', values: [optionValue('a')] });
      expect(cSelectable()).toBe(true);
    });

    it('keeps an already-selected option selectable at the ceiling, so it can be unticked', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'Only', [checkboxQuestion({ id: 'q_liked', maxSelections: 1 })]),
      ]);
      session.open(subject);
      const question = questionOn(subject, 0, 0);
      if (question.type !== 'checkbox') {
        throw new Error('fixture is not a checkbox');
      }

      session.setAnswer(question, { kind: 'options', values: [optionValue('a')] });

      expect(session.isOptionSelectable(question, optionValue('a'))()).toBe(true);
      expect(session.isOptionSelectable(question, optionValue('b'))()).toBe(false);
    });

    it('reports the question maxLength for the control', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'Only', [textboxQuestion({ id: 'q_name', maxLength: 80 })]),
      ]);
      session.open(subject);
      const question = questionOn(subject, 0, 0);
      if (question.type !== 'textbox') {
        throw new Error('fixture is not a textbox');
      }

      expect(session.maxLengthOf(question)).toBe(80);
    });
  });

  describe('next', () => {
    it('advances on a valid page and asks for focus on the new page heading', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = twoPageSurvey();
      session.open(subject);

      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });
      session.next();

      expect(session.currentPageIndex()).toBe(1);
      expect(session.positionLabel()).toBe('Page 2 of 2');
      expect(session.focusRequest()?.questionId).toBeNull();
    });

    it('leaves the page index unchanged on an invalid page (FR-029, FR-030)', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      session.open(twoPageSurvey());

      session.next();

      expect(session.currentPageIndex()).toBe(0);
      const state = session.state();
      expect(state.kind).toBe('validation-error');
      if (state.kind !== 'validation-error') {
        throw new Error('expected validation-error');
      }
      expect(state.scope).toBe('page');
      expect(state.surveyReport).toBeNull();
    });

    it('asks for focus on the first invalid question in page order', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'First', [
          textboxQuestion({ id: 'q_first', required: true }),
          radioQuestion({ id: 'q_second', required: true }),
        ]),
        page('p2', 'Second', []),
      ]);
      session.open(subject);

      session.next();

      expect(session.focusRequest()?.questionId).toBe('q_first');
    });

    it('produces a new focus token when Next is pressed again on the same invalid question', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      session.open(twoPageSurvey());

      session.next();
      const first = session.focusRequest();
      session.next();
      const second = session.focusRequest();

      // A bare question id would be identical, and the component's effect would not fire,
      // so focus would stay where the respondent left it — US2 scenarios 1 and 13.
      expect(second?.questionId).toBe(first?.questionId);
      expect(second?.token).not.toBe(first?.token);
    });

    it('announces the blocked page assertively, with the error count', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const announcer = TestBed.inject(AnnouncerService);
      session.open(twoPageSurvey());

      session.next();

      expect(announcer.assertive()).toBe('There is 1 answer to fix on this page');
    });

    it('does nothing on the last page, where the primary action is Submit', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([page('p1', 'Only', [textboxQuestion({ id: 'q_name' })])]);
      session.open(subject);

      expect(session.primaryAction()).toBe('submit');
      session.next();
      expect(session.currentPageIndex()).toBe(0);
    });
  });

  describe('previous', () => {
    it('is unavailable on page 1', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      session.open(twoPageSurvey());

      expect(session.isFirstPage()).toBe(true);
      session.previous();
      expect(session.currentPageIndex()).toBe(0);
    });

    it('validates nothing and is never blocked (FR-031)', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = twoPageSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });
      session.next();

      // Page 2's required radio is unanswered, and Previous still works.
      session.previous();

      expect(session.currentPageIndex()).toBe(0);
    });

    it('discards the errors but keeps every answer (FR-064, US2 scenario 12)', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = twoPageSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });
      session.next();
      session.next();
      expect(session.questionErrors().size).toBe(1);

      session.previous();

      expect(session.questionErrors().size).toBe(0);
      expect(session.state().kind).toBe('editing');
      expect(session.answers().get(questionId('q_name'))).toEqual({
        type: 'textbox',
        value: 'Dana',
      });
    });
  });

  describe('submit', () => {
    it('validates every page, moves to the earliest invalid one, and makes no call', async () => {
      const gateway = new AcknowledgingSurveyResponseGateway();
      const session = configure(gateway);
      const subject = twoPageSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });
      session.next();
      // Now on page 2 with its required radio unanswered. Clear page 1 so two pages fail.
      session.clearAnswer(questionId('q_name'));

      await session.submit();

      expect(gateway.calls).toHaveLength(0);
      expect(session.currentPageIndex()).toBe(0);
      const state = session.state();
      expect(state.kind).toBe('validation-error');
      if (state.kind !== 'validation-error') {
        throw new Error('expected validation-error');
      }
      expect(state.scope).toBe('survey');
      expect(state.surveyReport?.invalidPageIndexes).toEqual([0, 1]);
    });

    it('announces the more-than-one-page summary when more than one page is invalid (FR-034)', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const announcer = TestBed.inject(AnnouncerService);
      const subject = twoPageSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });
      session.next();
      session.clearAnswer(questionId('q_name'));

      await session.submit();

      expect(announcer.assertive()).toBe('There are answers to fix on more than one page.');
      expect(session.multiplePagesInvalid()).toBe(true);
    });

    it('mints no clientSubmissionId for a submission validation blocked (contract test 13)', async () => {
      const gateway = new AcknowledgingSurveyResponseGateway();
      const session = configure(gateway);
      const subject = requiredRadioSurvey();
      session.open(subject);

      await session.submit();
      expect(gateway.calls).toHaveLength(0);

      // The first id the receiver ever sees must be the first *attempt*, not the first
      // button press, or a blocked press would burn an idempotency key.
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });
      await session.submit();

      expect(gateway.calls).toHaveLength(1);
      expect(gateway.calls[0].clientSubmissionId.length).toBeGreaterThan(0);
    });

    it('reaches submitted only through an acknowledgement, and discards the answers (FR-045)', async () => {
      const gateway = new AcknowledgingSurveyResponseGateway('sub-9', '2026-10-08T11:00:00.000Z');
      const session = configure(gateway);
      const subject = requiredRadioSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

      await session.submit();

      const state = session.state();
      expect(state.kind).toBe('submitted');
      if (state.kind !== 'submitted') {
        throw new Error('expected submitted');
      }
      expect(state.receipt.submissionId).toBe('sub-9');
      expect(session.answers().size).toBe(0);
    });

    it('announces that it is submitting and locks the inputs while in flight (FR-039)', async () => {
      const gateway = new FailingSurveyResponseGateway('never-answers');
      const session = configure(gateway);
      const announcer = TestBed.inject(AnnouncerService);
      const subject = requiredRadioSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

      vi.useFakeTimers();
      const pending = session.submit();
      await Promise.resolve();

      expect(session.state().kind).toBe('submitting');
      expect(session.inputsLocked()).toBe(true);
      expect(announcer.polite()).toBe('Submitting your response');

      await vi.advanceTimersByTimeAsync(TIMEOUTS.submitMs);
      await pending;
    });

    it('starts no second call for a Submit pressed during submitting (contract test 8)', async () => {
      const gateway = new FailingSurveyResponseGateway('never-answers');
      const session = configure(gateway);
      const subject = requiredRadioSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

      vi.useFakeTimers();
      const first = session.submit();
      await Promise.resolve();
      // `submitting` has no self-edge, so the table refuses this — not a boolean flag.
      await session.submit();

      expect(gateway.calls).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(TIMEOUTS.submitMs);
      await first;
    });

    it('reports timeout at exactly submitMs (contract test 7, US6 scenario 2)', async () => {
      const gateway = new FailingSurveyResponseGateway('never-answers');
      const session = configure(gateway);
      const subject = requiredRadioSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

      vi.useFakeTimers();
      const pending = session.submit();
      await vi.advanceTimersByTimeAsync(TIMEOUTS.submitMs - 1);
      expect(session.state().kind).toBe('submitting');

      await vi.advanceTimersByTimeAsync(1);
      await pending;

      const state = session.state();
      expect(state.kind).toBe('submission-error');
      if (state.kind !== 'submission-error') {
        throw new Error('expected submission-error');
      }
      expect(state.failure.kind).toBe('timeout');
    });

    it('orders answers for the payload by page then question order (FR-035)', async () => {
      const gateway = new AcknowledgingSurveyResponseGateway();
      const session = configure(gateway);
      const subject = survey([
        page('p1', 'First', [textboxQuestion({ id: 'q_name' })]),
        page('p2', 'Second', [ratingQuestion({ id: 'q_rate' })]),
      ]);
      session.open(subject);

      // Answered page 2 first.
      session.setAnswer(questionOn(subject, 1, 0), { kind: 'point', value: 4 });
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });
      session.next();
      await session.submit();

      expect(gateway.calls[0].answers.map((entry) => entry.questionId)).toEqual([
        'q_name',
        'q_rate',
      ]);
    });
  });

  describe('retry', () => {
    it('re-uses the clientSubmissionId with a fresh submittedAt (contract test 10)', async () => {
      const gateway = new FailingSurveyResponseGateway('server-error');
      const session = configure(gateway);
      const subject = requiredRadioSurvey();
      session.open(subject);
      session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

      await session.submit();
      expect(session.state().kind).toBe('submission-error');

      await session.retry();

      expect(gateway.calls).toHaveLength(2);
      // The receiver treats a repeat of an id it already accepted as the same response,
      // so re-using it is what makes a retry after a timeout safe.
      expect(gateway.calls[1].clientSubmissionId).toBe(gateway.calls[0].clientSubmissionId);
      expect(gateway.calls[1].submittedAt).not.toBe('');
    });

    it('mints a different clientSubmissionId after the survey is reopened (SC-011)', async () => {
      const gateway = new FailingSurveyResponseGateway('server-error');
      const session = configure(gateway);
      const subject = requiredRadioSurvey();
      const answer = () =>
        session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

      session.open(subject);
      answer();
      await session.submit();

      session.open(subject);
      answer();
      await session.submit();

      expect(gateway.calls[1].clientSubmissionId).not.toBe(gateway.calls[0].clientSubmissionId);
    });

    it('keeps every answer and attachment intact after each of the seven failure kinds (SC-007)', async () => {
      const kinds: readonly SubmissionFailureKind[] = [
        'transport-error',
        'timeout',
        'rejected',
        'not-found',
        'unauthorized',
        'server-error',
        'malformed-response',
      ];

      for (const kind of kinds) {
        const session = configure(new FailingSurveyResponseGateway(kind));
        const subject = requiredRadioSurvey();
        session.open(subject);
        session.setAnswer(questionOn(subject, 0, 0), { kind: 'option', value: optionValue('a') });

        await session.submit();

        const state = session.state();
        expect(state.kind).toBe('submission-error');
        if (state.kind !== 'submission-error') {
          throw new Error('expected submission-error');
        }
        expect(state.failure.kind).toBe(kind);
        // Answers live outside the state variant, so this is structural rather than a
        // code path that could be forgotten for one kind.
        expect(session.answers().get(questionId('q_pick'))).toEqual({
          type: 'radio',
          value: 'a',
        });
      }
    });

    it('moves submission-error back to editing when an answer changes (contract §6)', async () => {
      const session = configure(new FailingSurveyResponseGateway('server-error'));
      const subject = requiredRadioSurvey();
      session.open(subject);
      const question = questionOn(subject, 0, 0);
      session.setAnswer(question, { kind: 'option', value: optionValue('a') });
      await session.submit();

      session.setAnswer(question, { kind: 'option', value: optionValue('b') });

      expect(session.state().kind).toBe('editing');
    });
  });

  describe('addFiles and removeAttachment', () => {
    const policy = attachmentPolicy({ maxFiles: 2, maxSizeBytes: 1_000 });

    function attachmentSurvey(): Survey {
      return survey([
        page('p1', 'Only', [textareaQuestion({ id: 'q_evidence', attachments: policy })]),
      ]);
    }

    function fileOf(name: string, type: string, size: number): File {
      return new File([new Uint8Array(size)], name, { type });
    }

    it('accepts a valid file, reads its bytes and announces it politely', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const announcer = TestBed.inject(AnnouncerService);
      const subject = attachmentSurvey();
      session.open(subject);

      await session.addFiles(questionOn(subject, 0, 0), [
        fileOf('receipt.pdf', 'application/pdf', 500),
      ]);

      const held = session.attachmentsFor(questionId('q_evidence'));
      expect(held).toHaveLength(1);
      expect(held[0].name).toBe('receipt.pdf');
      // D6: the bytes are read at selection time, so they survive navigation.
      expect(held[0].bytes.length).toBe(500);
      expect(announcer.polite()).toBe('receipt.pdf attached');
    });

    it('attaches the valid files of a mixed selection and reports one rejection per file (FR-024)', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = attachmentSurvey();
      session.open(subject);

      await session.addFiles(questionOn(subject, 0, 0), [
        fileOf('good.pdf', 'application/pdf', 500),
        fileOf('huge.pdf', 'application/pdf', 5_000),
        fileOf('notes.txt', 'text/plain', 10),
      ]);

      expect(session.attachmentsFor(questionId('q_evidence'))).toHaveLength(1);
      expect(session.attachmentRejections().map((rejection) => rejection.reason)).toEqual([
        'too-large',
        'unaccepted-type',
      ]);
    });

    it('stops accepting once maxFiles is reached, in selection order', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = attachmentSurvey();
      session.open(subject);

      await session.addFiles(questionOn(subject, 0, 0), [
        fileOf('a.pdf', 'application/pdf', 10),
        fileOf('b.pdf', 'application/pdf', 20),
        fileOf('c.pdf', 'application/pdf', 30),
      ]);

      const held = session.attachmentsFor(questionId('q_evidence'));
      expect(held.map((attachment) => attachment.name)).toEqual(['a.pdf', 'b.pdf']);
      expect(session.attachmentRejections()[0].reason).toBe('no-free-slot');
    });

    it('demotes a file whose read fails to an unreadable rejection (research D17)', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = attachmentSurvey();
      session.open(subject);
      const broken = fileOf('gone.pdf', 'application/pdf', 100);
      vi.spyOn(broken, 'arrayBuffer').mockRejectedValue(new DOMException('NotReadableError'));

      await session.addFiles(questionOn(subject, 0, 0), [broken]);

      // It passed all five FR-023 checks and still could not be read, which is a rejected
      // file rather than a thrown error.
      expect(session.attachmentsFor(questionId('q_evidence'))).toHaveLength(0);
      expect(session.attachmentRejections()[0].reason).toBe('unreadable');
    });

    it('frees the slot immediately on removal and announces it politely (FR-026)', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const announcer = TestBed.inject(AnnouncerService);
      const subject = attachmentSurvey();
      session.open(subject);
      const question = questionOn(subject, 0, 0);
      await session.addFiles(question, [fileOf('receipt.pdf', 'application/pdf', 100)]);
      const held = session.attachmentsFor(questionId('q_evidence'));

      session.removeAttachment(questionId('q_evidence'), held[0].id);

      expect(session.attachmentsFor(questionId('q_evidence'))).toHaveLength(0);
      expect(announcer.polite()).toBe('receipt.pdf removed');
    });

    it('accepts nothing for a question with no attachment policy', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([page('p1', 'Only', [textareaQuestion({ id: 'q_plain' })])]);
      session.open(subject);

      await session.addFiles(questionOn(subject, 0, 0), [
        fileOf('receipt.pdf', 'application/pdf', 100),
      ]);

      expect(session.attachmentsFor(questionId('q_plain'))).toHaveLength(0);
    });

    it('ignores a removal of an attachment the question does not hold', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = attachmentSurvey();
      session.open(subject);

      session.removeAttachment(questionId('q_evidence'), attachmentId('nope'));

      expect(session.state().kind).toBe('ready');
    });

    it('lets Next through when every held file still satisfies its policy (FR-027)', async () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = survey([
        page('p1', 'First', [
          textareaQuestion({
            id: 'q_evidence',
            attachments: attachmentPolicy({ maxFiles: 1, maxSizeBytes: 10_000 }),
          }),
        ]),
        page('p2', 'Second', []),
      ]);
      session.open(subject);
      await session.addFiles(questionOn(subject, 0, 0), [
        fileOf('big.pdf', 'application/pdf', 5_000),
      ]);

      session.next();

      // The re-check runs at Next through `validatePage`, so a passing one must not
      // invent an error. The failing half of FR-027 — a held file that stopped satisfying
      // its policy — is only reachable by changing the policy under an open session,
      // which no route does, so it is asserted directly against `attachmentErrorsFor` in
      // `attachment.validator.spec.ts` instead.
      expect(session.currentPageIndex()).toBe(1);
      expect(session.questionErrors().size).toBe(0);
    });
  });

  describe('derived signals', () => {
    it('reports Submit as the primary action only on the last page (FR-033)', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      const subject = twoPageSurvey();
      session.open(subject);

      expect(session.primaryAction()).toBe('next');

      session.setAnswer(questionOn(subject, 0, 0), { kind: 'text', value: 'Dana' });
      session.next();

      expect(session.primaryAction()).toBe('submit');
    });

    it('reports the page position one-based (FR-032)', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      session.open(customerFeedbackSurvey());

      expect(session.positionLabel()).toBe('Page 1 of 4');
      expect(session.pageCount()).toBe(4);
    });

    it('reports the current page and survey as null before a survey is opened', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());

      expect(session.survey()).toBeNull();
      expect(session.currentPage()).toBeNull();
      expect(session.pageCount()).toBe(0);
    });

    it('reports no current-page errors outside the validation-error state', () => {
      const session = configure(new AcknowledgingSurveyResponseGateway());
      session.open(twoPageSurvey());

      expect(session.currentPageErrors()).toEqual([]);
      expect(session.multiplePagesInvalid()).toBe(false);
    });
  });
});
