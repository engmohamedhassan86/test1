/**
 * T103 — FR-006 and FR-053's grouped form for `radio`.
 */

import { describe, expect, it } from 'vitest';

import { option, radioQuestion } from '../../../core/models/__fixtures__/survey-builders';
import { questionId } from '../../../core/models/__fixtures__/survey-builders';
import { FailingSurveyResponseGateway } from '../../../core/services/testing/failing-survey-response.gateway';
import { mountQuestion } from './__fixtures__/question-harness';

function threeOptions() {
  return [
    option('seg-new', 'A new customer', 'new'),
    option('seg-returning', 'A returning customer', 'returning'),
    option('seg-business', 'A business customer', 'business'),
  ] as const;
}

describe('RadioQuestionComponent', () => {
  it('renders a radiogroup whose accessible name is the question title (FR-053)', async () => {
    const harness = await mountQuestion(
      radioQuestion({ title: 'Which of these describes you?', options: threeOptions() }),
    );

    const group = harness.host.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();
    if (group === null) {
      throw new Error('expected a radiogroup');
    }
    // Not merely "a name is present": the name's text is the assertion, because a group
    // labelled "Question" passes an axe name-presence check and violates FR-053.
    expect(harness.accessibleName(group)).toBe('Which of these describes you?');
  });

  it('renders one radio per option in config order with the label as visible text', async () => {
    const harness = await mountQuestion(radioQuestion({ options: threeOptions() }));

    const labels = [...harness.host.querySelectorAll('.sv-choice__label')].map((element) =>
      element.textContent?.trim(),
    );
    expect(labels).toEqual(['A new customer', 'A returning customer', 'A business customer']);
  });

  it('stores the option value, not its id or its label', async () => {
    const harness = await mountQuestion(
      radioQuestion({ id: 'q_segment', options: threeOptions() }),
    );

    harness.host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    await harness.settle();

    expect(harness.session.answers().get(questionId('q_segment'))).toEqual({
      type: 'radio',
      value: 'returning',
    });
  });

  it('holds at most one value, so a second choice replaces the first (FR-006)', async () => {
    const harness = await mountQuestion(
      radioQuestion({ id: 'q_segment', options: threeOptions() }),
    );
    const radios = harness.host.querySelectorAll<HTMLInputElement>('input[type="radio"]');

    radios[0].click();
    await harness.settle();
    radios[2].click();
    await harness.settle();

    expect(harness.session.answers().get(questionId('q_segment'))).toEqual({
      type: 'radio',
      value: 'business',
    });
    expect(harness.session.answers().size).toBe(1);
  });

  it('reflects the held value as the checked radio', async () => {
    const question = radioQuestion({ id: 'q_segment', options: threeOptions() });
    const harness = await mountQuestion(question);

    harness.host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    await harness.settle();

    const checked = harness.host.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked');
    expect(checked).toHaveLength(1);
    expect(checked[0].value).toBe('returning');
  });

  it('groups the radios under one name, so arrow keys move within the group', async () => {
    const harness = await mountQuestion(
      radioQuestion({ id: 'q_segment', options: threeOptions() }),
    );

    const names = new Set(
      [...harness.host.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map(
        (input) => input.name,
      ),
    );
    expect(names).toEqual(new Set(['q_segment']));
  });

  it('wires aria-invalid and aria-describedby when an error stands', async () => {
    const harness = await mountQuestion(radioQuestion({ id: 'q_pick', required: true }));

    harness.session.next();
    await harness.settle();

    const group = harness.host.querySelector('[role="radiogroup"]');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
    expect(group?.getAttribute('aria-describedby')).toBe('sv-q-q_pick-error');
  });

  it('carries no aria-invalid at all while no error stands (FR-064)', async () => {
    const harness = await mountQuestion(radioQuestion({ required: true }));

    // Absent, not `"false"`: FR-064 and US2 scenario 12 both require a page the
    // respondent returns to to carry no `aria-invalid` on any control.
    expect(harness.host.querySelector('[role="radiogroup"]')?.hasAttribute('aria-invalid')).toBe(
      false,
    );
  });

  it('disables every radio while a submission is in flight (FR-039)', async () => {
    const harness = await mountQuestion(radioQuestion({ id: 'q_pick', required: true }), {
      // An adapter that answers immediately would be in `submitted` before the assertion.
      gateway: new FailingSurveyResponseGateway('never-answers'),
    });
    harness.host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click();
    await harness.settle();

    void harness.session.submit();
    await harness.settle();

    const disabled = [
      ...harness.host.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ].every((input) => input.disabled);
    expect(disabled).toBe(true);
  });
});
