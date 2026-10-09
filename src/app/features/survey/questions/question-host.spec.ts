/**
 * T111 — the dispatch, and the three things the host renders for all six types.
 *
 * The **required/optional pair** is the load-bearing assertion here. `T091` is the single
 * place the required indication is rendered, so a regression there regresses FR-005 for
 * every type at once; a test that only checked the required side would pass against a host
 * that marked everything required.
 */

import { describe, expect, it } from 'vitest';

import {
  checkboxQuestion,
  radioQuestion,
  ratingQuestion,
  satisfactionQuestion,
  textareaQuestion,
  textboxQuestion,
} from '../../../core/models/__fixtures__/survey-builders';
import { optionValue } from '../../../core/models/__fixtures__/survey-builders';
import { mountQuestion } from './__fixtures__/question-harness';

describe('QuestionHostComponent', () => {
  describe('dispatch', () => {
    it('routes a radio question to the radio component', async () => {
      const { host } = await mountQuestion(radioQuestion());
      expect(host.querySelector('app-radio-question')).not.toBeNull();
    });

    it('routes a checkbox question to the checkbox component', async () => {
      const { host } = await mountQuestion(checkboxQuestion());
      expect(host.querySelector('app-checkbox-question')).not.toBeNull();
    });

    it('routes a textbox question to the text component', async () => {
      const { host } = await mountQuestion(textboxQuestion());
      expect(host.querySelector('app-text-question')).not.toBeNull();
      expect(host.querySelector('input[type="text"]')).not.toBeNull();
    });

    it('routes a textarea question to the same text component', async () => {
      const { host } = await mountQuestion(textareaQuestion());
      // FR-008's difference is one line versus many, not two sets of rules.
      expect(host.querySelector('app-text-question')).not.toBeNull();
      expect(host.querySelector('textarea')).not.toBeNull();
    });

    it('routes a rating question to the rating component', async () => {
      const { host } = await mountQuestion(ratingQuestion());
      expect(host.querySelector('app-rating-question')).not.toBeNull();
    });

    it('routes a satisfaction question to the satisfaction component', async () => {
      const { host } = await mountQuestion(satisfactionQuestion());
      expect(host.querySelector('app-satisfaction-question')).not.toBeNull();
    });

    it('renders exactly one control component per question', async () => {
      const { host } = await mountQuestion(radioQuestion());

      const controls = host.querySelectorAll(
        'app-radio-question, app-checkbox-question, app-text-question, app-rating-question, app-satisfaction-question',
      );
      expect(controls).toHaveLength(1);
    });
  });

  describe('title, description and required indication', () => {
    it('renders the question title once', async () => {
      const { host } = await mountQuestion(radioQuestion({ title: 'Which describes you?' }));

      const titles = host.querySelectorAll('.sv-question__title');
      expect(titles).toHaveLength(1);
      expect(titles[0].textContent).toContain('Which describes you?');
    });

    it('renders the description when the config supplies one', async () => {
      const { host } = await mountQuestion(
        radioQuestion({ description: 'Pick the closest match.' }),
      );

      expect(host.querySelector('.sv-question__description')?.textContent).toBe(
        'Pick the closest match.',
      );
    });

    it('leaves no empty element behind when there is no description (FR-073)', async () => {
      const { host } = await mountQuestion(radioQuestion({ description: null }));

      // Not an empty paragraph, not a reserved line: nothing at all.
      expect(host.querySelector('.sv-question__description')).toBeNull();
    });

    it('shows a visible required indication on a required question (FR-005)', async () => {
      const { host } = await mountQuestion(radioQuestion({ required: true }));

      expect(host.querySelector('.sv-question__required')).not.toBeNull();
      expect(host.querySelector('.sv-question__optional')).toBeNull();
    });

    it('shows no required indication on an optional question (FR-005, the negative half)', async () => {
      const { host } = await mountQuestion(radioQuestion({ required: false }));

      // Without this, a host that marked everything required would still pass.
      expect(host.querySelector('.sv-question__required')).toBeNull();
      expect(host.querySelector('.sv-question__optional')).not.toBeNull();
    });

    it('carries required-ness programmatically as well as visibly', async () => {
      const { host } = await mountQuestion(radioQuestion({ required: true }));

      // The visible marker is `aria-hidden`, so `aria-required` is what a screen reader
      // reads — and keeping it off the title is what keeps the accessible name exact.
      expect(host.querySelector('[role="radiogroup"]')?.getAttribute('aria-required')).toBe('true');
      expect(host.querySelector('.sv-question__required')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    });
  });

  describe('error association', () => {
    it('renders no error text and no describedby until an error stands', async () => {
      const { host } = await mountQuestion(radioQuestion({ required: true }));

      expect(host.querySelector('.sv-question__error')).toBeNull();
      expect(
        host.querySelector('[role="radiogroup"]')?.getAttribute('aria-describedby'),
      ).toBeNull();
    });

    it('renders the error text and points aria-describedby at it (FR-054)', async () => {
      const harness = await mountQuestion(radioQuestion({ id: 'q_pick', required: true }));

      harness.session.next();
      await harness.settle();

      const error = harness.host.querySelector('.sv-question__error');
      expect(error?.textContent).toBe('Choose one option');

      const group = harness.host.querySelector('[role="radiogroup"]');
      expect(group?.getAttribute('aria-invalid')).toBe('true');
      expect(group?.getAttribute('aria-describedby')).toBe(error?.id);
    });

    it('names both the error and the description when both are present', async () => {
      const harness = await mountQuestion(
        radioQuestion({ id: 'q_pick', required: true, description: 'Pick one.' }),
      );

      harness.session.next();
      await harness.settle();

      const describedBy =
        harness.host.querySelector('[role="radiogroup"]')?.getAttribute('aria-describedby') ?? '';
      // The error comes first: it is the more urgent of the two.
      expect(describedBy.split(' ')).toEqual(['sv-q-q_pick-error', 'sv-q-q_pick-description']);
    });

    it('drops the error the moment the answer changes (FR-020)', async () => {
      const question = radioQuestion({ id: 'q_pick', required: true });
      const harness = await mountQuestion(question);

      harness.session.next();
      await harness.settle();
      expect(harness.host.querySelector('.sv-question__error')).not.toBeNull();

      harness.session.setAnswer(question, { kind: 'option', value: optionValue('a') });
      await harness.settle();

      expect(harness.host.querySelector('.sv-question__error')).toBeNull();
    });
  });
});
