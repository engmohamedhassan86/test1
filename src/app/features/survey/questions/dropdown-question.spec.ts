import { describe, expect, it } from 'vitest';

import { dropdownQuestion, option } from '../../../core/models/__fixtures__/survey-builders';
import { mountQuestion } from './__fixtures__/question-harness';

function threeOptions() {
  return [
    option('col-red', 'Red', 'red'),
    option('col-blue', 'Blue', 'blue'),
    option('col-green', 'Green', 'green'),
  ] as const;
}

describe('DropdownQuestionComponent', () => {
  it('renders a select control with an aria-labelledby that points to the title', async () => {
    const harness = await mountQuestion(
      dropdownQuestion({ title: 'What is your favorite color?', options: threeOptions() }),
    );

    const select = harness.host.querySelector('p-select');
    expect(select).not.toBeNull();
    expect(select?.getAttribute('aria-labelledby')).toBe('sv-q-q_dropdown-title');
  });

  it('renders all options in config order with the label as visible text', async () => {
    const harness = await mountQuestion(dropdownQuestion({ options: threeOptions() }));

    const select = harness.host.querySelector('p-select');
    expect(select?.getAttribute('ng-reflect-options')).toBeDefined();
  });

  it('wires aria-invalid and aria-describedby when an error stands', async () => {
    const harness = await mountQuestion(dropdownQuestion({ id: 'q_pick', required: true }));

    harness.session.next();
    await harness.settle();

    const select = harness.host.querySelector('p-select');
    expect(select?.getAttribute('aria-invalid')).toBe('true');
    expect(select?.getAttribute('aria-describedby')).toBe('sv-q-q_pick-error');
  });

  it('carries no aria-invalid at all while no error stands', async () => {
    const harness = await mountQuestion(dropdownQuestion({ required: true }));

    expect(harness.host.querySelector('p-select')?.hasAttribute('aria-invalid')).toBe(false);
  });
});
