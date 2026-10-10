/**
 * T104 — FR-007, FR-017 and FR-053's grouped form for `checkbox`.
 *
 * The selectability pair is the important one: "non-selectable at the ceiling" and
 * "selectable again after a de-selection" are different assertions, and an implementation
 * that disabled an option permanently once the ceiling was reached would pass the first.
 */

import { describe, expect, it } from 'vitest';

import {
  checkboxQuestion,
  option,
  questionId,
} from '../../../core/models/__fixtures__/survey-builders';
import { mountQuestion } from './__fixtures__/question-harness';

function fiveOptions() {
  return [
    option('liked-delivery', 'Delivery speed', 'delivery'),
    option('liked-packaging', 'Packaging', 'packaging'),
    option('liked-support', 'Support', 'support'),
    option('liked-price', 'Price', 'price'),
    option('liked-quality', 'Quality', 'quality'),
  ] as const;
}

function boxes(host: HTMLElement): HTMLInputElement[] {
  return [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
}

describe('CheckboxQuestionComponent', () => {
  it('renders a group whose accessible name is the question title (FR-053)', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ title: 'What did you like?', options: fiveOptions() }),
    );

    const group = harness.host.querySelector('fieldset');
    expect(group).not.toBeNull();
    if (group === null) {
      throw new Error('expected a fieldset');
    }
    expect(harness.accessibleName(group)).toBe('What did you like?');
  });

  it('renders one checkbox per option in config order', async () => {
    const harness = await mountQuestion(checkboxQuestion({ options: fiveOptions() }));

    const labels = [...harness.host.querySelectorAll('.sv-choice__label')].map((element) =>
      element.textContent?.trim(),
    );
    expect(labels).toEqual(['Delivery speed', 'Packaging', 'Support', 'Price', 'Quality']);
  });

  it('renders the selection hint from core (US2 scenario 5)', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ maxSelections: 3, options: fiveOptions() }),
    );

    expect(harness.host.querySelector('.sv-choices__hint')?.textContent?.trim()).toBe(
      'Select up to 3 options',
    );
  });

  it('holds a set of selected values in option order', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ id: 'q_liked', maxSelections: 3, options: fiveOptions() }),
    );

    // Ticked out of order: the third option, then the first.
    boxes(harness.host)[2].click();
    await harness.settle();
    boxes(harness.host)[0].click();
    await harness.settle();

    expect(harness.session.answers().get(questionId('q_liked'))).toEqual({
      type: 'checkbox',
      value: ['delivery', 'support'],
    });
  });

  it('makes unselected options non-selectable at maxSelections (FR-017)', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ id: 'q_liked', maxSelections: 3, options: fiveOptions() }),
    );

    for (const index of [0, 1, 2]) {
      boxes(harness.host)[index].click();
      await harness.settle();
    }

    const disabled = boxes(harness.host).map((box) => box.disabled);
    expect(disabled).toEqual([false, false, false, true, true]);
  });

  it('makes them selectable again after a de-selection (FR-017, the other half)', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ id: 'q_liked', maxSelections: 3, options: fiveOptions() }),
    );
    for (const index of [0, 1, 2]) {
      boxes(harness.host)[index].click();
      await harness.settle();
    }
    expect(boxes(harness.host)[4].disabled).toBe(true);

    boxes(harness.host)[0].click();
    await harness.settle();

    expect(boxes(harness.host)[4].disabled).toBe(false);
  });

  it('deletes the answer when the last selection is removed', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ id: 'q_liked', options: fiveOptions() }),
    );

    boxes(harness.host)[0].click();
    await harness.settle();
    boxes(harness.host)[0].click();
    await harness.settle();

    // Unanswered is absence, so an empty selection is not stored as `[]`.
    expect(harness.session.answers().has(questionId('q_liked'))).toBe(false);
  });

  it('reflects the held selection as checked boxes', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ id: 'q_liked', maxSelections: 3, options: fiveOptions() }),
    );

    boxes(harness.host)[1].click();
    await harness.settle();

    expect(boxes(harness.host).map((box) => box.checked)).toEqual([
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it('wires aria-invalid and aria-describedby when an error stands', async () => {
    const harness = await mountQuestion(
      checkboxQuestion({ id: 'q_liked', required: true, minSelections: 1, options: fiveOptions() }),
    );

    harness.session.next();
    await harness.settle();

    const group = harness.host.querySelector('fieldset');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
    // The error leads, per FR-054's ordering. The required indication trails it because a
    // `fieldset` is role `group`, which cannot take `aria-required`, so this group is the
    // one type that carries required-ness as a description.
    expect(group?.getAttribute('aria-describedby')).toBe(
      'sv-q-q_liked-error sv-q-q_liked-required',
    );
    expect(harness.host.querySelector('.sv-question__error')?.textContent).toBe(
      'Select at least 1 option',
    );
  });
});
