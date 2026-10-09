/**
 * T105 — FR-008, FR-015 and FR-053's **single-control** form.
 *
 * Two assertions here exist because the old task text would have led to the wrong markup:
 * the control's accessible name must be the question title, **and** it must not be wrapped
 * in a `radiogroup` or a `fieldset`. A single input is not a group, and claiming it is
 * would be invalid ARIA rather than harmless extra markup (`spec.md` §735,
 * `plan.md` §588).
 */

import { describe, expect, it } from 'vitest';

import {
  questionId,
  textareaQuestion,
  textboxQuestion,
} from '../../../core/models/__fixtures__/survey-builders';
import { accessibleNameOf, mountQuestion } from './__fixtures__/question-harness';

function type(control: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  control.value = value;
  control.dispatchEvent(new Event('input'));
}

describe('TextQuestionComponent', () => {
  describe('textbox', () => {
    it('renders a single-line input', async () => {
      const harness = await mountQuestion(textboxQuestion());

      expect(harness.host.querySelector('input[type="text"]')).not.toBeNull();
      expect(harness.host.querySelector('textarea')).toBeNull();
    });

    it("has an accessible name equal to the question's title (FR-053)", async () => {
      const harness = await mountQuestion(textboxQuestion({ title: 'What should we call you?' }));

      const input = harness.host.querySelector('input[type="text"]');
      if (input === null) {
        throw new Error('expected an input');
      }
      expect(accessibleNameOf(harness.host, input)).toBe('What should we call you?');
    });

    it('is not wrapped in a radiogroup or a fieldset', async () => {
      const harness = await mountQuestion(textboxQuestion());

      expect(harness.host.querySelector('[role="radiogroup"]')).toBeNull();
      expect(harness.host.querySelector('fieldset')).toBeNull();
      expect(harness.host.querySelector('[role="group"]')).toBeNull();
    });

    it('binds maxlength from session.maxLengthOf (FR-015)', async () => {
      const harness = await mountQuestion(textboxQuestion({ maxLength: 80 }));

      expect(harness.host.querySelector('input[type="text"]')?.getAttribute('maxlength')).toBe(
        '80',
      );
    });

    it('stores the trimmed value through setAnswer', async () => {
      const harness = await mountQuestion(textboxQuestion({ id: 'q_name' }));
      const input = harness.host.querySelector<HTMLInputElement>('input[type="text"]');
      if (input === null) {
        throw new Error('expected an input');
      }

      type(input, '  Dana  ');
      await harness.settle();

      expect(harness.session.answers().get(questionId('q_name'))).toEqual({
        type: 'textbox',
        value: 'Dana',
      });
    });
  });

  describe('textarea', () => {
    it('renders a multi-line control through the same component', async () => {
      const harness = await mountQuestion(textareaQuestion());

      expect(harness.host.querySelector('app-text-question')).not.toBeNull();
      expect(harness.host.querySelector('textarea')).not.toBeNull();
      expect(harness.host.querySelector('input[type="text"]')).toBeNull();
    });

    it("has an accessible name equal to the question's title (FR-053)", async () => {
      const harness = await mountQuestion(textareaQuestion({ title: 'Anything we should see?' }));

      const control = harness.host.querySelector('textarea');
      if (control === null) {
        throw new Error('expected a textarea');
      }
      expect(accessibleNameOf(harness.host, control)).toBe('Anything we should see?');
    });

    it('is not wrapped in a radiogroup or a fieldset', async () => {
      const harness = await mountQuestion(textareaQuestion());

      expect(harness.host.querySelector('[role="radiogroup"]')).toBeNull();
      expect(harness.host.querySelector('fieldset')).toBeNull();
    });

    it('binds its own maxLength', async () => {
      const harness = await mountQuestion(textareaQuestion({ maxLength: 1000 }));

      expect(harness.host.querySelector('textarea')?.getAttribute('maxlength')).toBe('1000');
    });

    it('stores the value it is given', async () => {
      const harness = await mountQuestion(textareaQuestion({ id: 'q_comments' }));
      const control = harness.host.querySelector<HTMLTextAreaElement>('textarea');
      if (control === null) {
        throw new Error('expected a textarea');
      }

      type(control, 'The parcel arrived opened.');
      await harness.settle();

      expect(harness.session.answers().get(questionId('q_comments'))).toEqual({
        type: 'textarea',
        value: 'The parcel arrived opened.',
      });
    });
  });

  describe('error wiring and locking', () => {
    it('wires aria-invalid and aria-describedby when an error stands', async () => {
      const harness = await mountQuestion(textboxQuestion({ id: 'q_name', required: true }));

      harness.session.next();
      await harness.settle();

      const input = harness.host.querySelector('input[type="text"]');
      expect(input?.getAttribute('aria-invalid')).toBe('true');
      expect(input?.getAttribute('aria-describedby')).toBe('sv-q-q_name-error');
      expect(harness.host.querySelector('.sv-question__error')?.textContent).toBe(
        'Enter an answer',
      );
    });

    it('reports the minLength rule for a value that is short but not empty', async () => {
      const harness = await mountQuestion(
        textboxQuestion({ id: 'q_name', required: true, minLength: 2 }),
      );
      const input = harness.host.querySelector<HTMLInputElement>('input[type="text"]');
      if (input === null) {
        throw new Error('expected an input');
      }

      type(input, 'D');
      await harness.settle();
      harness.session.next();
      await harness.settle();

      // FR-014 keeps this distinct from the required rule, which the whitespace case hits.
      expect(harness.host.querySelector('.sv-question__error')?.textContent).toBe(
        'Use at least 2 characters',
      );
    });
  });
});
