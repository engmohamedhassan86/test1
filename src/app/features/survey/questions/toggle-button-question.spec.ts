/**
 * Feature 002 — the `toggle_button` control.
 *
 * The three things this type can get wrong and nothing else would catch:
 *
 * 1. **The stored value is a native boolean**, not a string and not 0/1. The payload spec
 *    asserts the wire shape; this asserts what the control puts into the session, because
 *    a `"true"` stored here would reach the wire through a boolean-typed field unnoticed.
 * 2. **`false` is stored rather than deleted.** Every other type treats its empty value as
 *    "unanswered" and `setAnswer` deletes it; a toggle must not, or a deliberate opt-out
 *    becomes indistinguishable from never touching the switch.
 * 3. **`required` means the value must be `true`.** A switch always has a position, so the
 *    required rule cannot be about presence.
 *
 * The role assertion is `switch`, not `checkbox`: it is the role whose two states a screen
 * reader reads as on/off, which is what the configured labels say visually.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FailingSurveyResponseGateway } from '../../../core/services/testing/failing-survey-response.gateway';
import {
  questionId,
  toggleButtonQuestion,
} from '../../../core/models/__fixtures__/survey-builders';
import { mountQuestion } from './__fixtures__/question-harness';

function toggle(host: HTMLElement): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>('.sv-toggle');
  if (found === null) {
    throw new Error('expected a toggle control');
  }
  return found;
}

describe('ToggleButtonQuestionComponent', () => {
  it('renders one switch, not a checkbox and not a pair of radios', async () => {
    const harness = await mountQuestion(toggleButtonQuestion());

    const control = toggle(harness.host);
    expect(control.getAttribute('role')).toBe('switch');
    expect(harness.host.querySelectorAll('.sv-toggle')).toHaveLength(1);
    expect(harness.host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('starts off and reads aria-checked false when defaultValue is false', async () => {
    const harness = await mountQuestion(toggleButtonQuestion({ defaultValue: false }));

    expect(toggle(harness.host).getAttribute('aria-checked')).toBe('false');
  });

  it('starts on when defaultValue is true, before anything is touched', async () => {
    const harness = await mountQuestion(toggleButtonQuestion({ defaultValue: true }));

    expect(toggle(harness.host).getAttribute('aria-checked')).toBe('true');
  });

  it('shows the configured onLabel and offLabel, and changes between them', async () => {
    const harness = await mountQuestion(
      toggleButtonQuestion({ options: { onLabel: 'Send me news', offLabel: 'No news' } }),
    );

    expect(toggle(harness.host).textContent?.trim()).toBe('No news');

    toggle(harness.host).click();
    await harness.settle();

    // The label is the second, non-colour channel for the state (WCAG 1.4.1).
    expect(toggle(harness.host).textContent?.trim()).toBe('Send me news');
  });

  it('falls back to On/Off when the config names no labels', async () => {
    const harness = await mountQuestion(toggleButtonQuestion());

    expect(toggle(harness.host).textContent?.trim()).toBe('Off');
    toggle(harness.host).click();
    await harness.settle();
    expect(toggle(harness.host).textContent?.trim()).toBe('On');
  });

  it('stores a native boolean true, not the string "true" and not 1', async () => {
    const harness = await mountQuestion(toggleButtonQuestion({ id: 'q_notify' }));

    toggle(harness.host).click();
    await harness.settle();

    const stored = harness.session.answers().get(questionId('q_notify'));
    expect(stored).toEqual({ type: 'toggle_button', value: true });
    expect(typeof (stored as { value: unknown }).value).toBe('boolean');
  });

  it('stores false rather than deleting the answer when the switch goes back off', async () => {
    const harness = await mountQuestion(toggleButtonQuestion({ id: 'q_notify' }));

    toggle(harness.host).click();
    await harness.settle();
    toggle(harness.host).click();
    await harness.settle();

    // The delete-when-empty rule does not apply here: "switched it off" must stay
    // distinguishable from "never touched it".
    expect(harness.session.answers().has(questionId('q_notify'))).toBe(true);
    expect(harness.session.answers().get(questionId('q_notify'))).toEqual({
      type: 'toggle_button',
      value: false,
    });
  });

  it("has an accessible name that is the question's title (FR-053)", async () => {
    const harness = await mountQuestion(
      toggleButtonQuestion({ title: 'Would you like news about new toys?' }),
    );

    // The visible On/Off label is a state word, not the question — so the name comes from
    // `aria-labelledby`, and this asserts the text it resolves to rather than its presence.
    expect(harness.accessibleName(toggle(harness.host))).toBe(
      'Would you like news about new toys?',
    );
  });

  it('marks the switch required when the question is required (FR-005)', async () => {
    const required = await mountQuestion(toggleButtonQuestion({ required: true }));
    expect(toggle(required.host).getAttribute('aria-required')).toBe('true');

    const optional = await mountQuestion(toggleButtonQuestion({ required: false }));
    expect(toggle(optional.host).getAttribute('aria-required')).toBe('false');
  });

  it('blocks Next on a required switch left off, and names the onLabel in the error', async () => {
    const harness = await mountQuestion(
      toggleButtonQuestion({
        id: 'q_consent',
        required: true,
        options: { onLabel: 'I agree', offLabel: 'I do not agree' },
      }),
    );

    harness.session.next();
    await harness.settle();

    expect(harness.session.errorFor(questionId('q_consent'))?.message).toBe(
      'Turn on I agree to continue',
    );
    expect(toggle(harness.host).getAttribute('aria-invalid')).toBe('true');
    expect(toggle(harness.host).getAttribute('aria-describedby')).toBe('sv-q-q_consent-error');
  });

  it('passes a required switch that is on', async () => {
    const harness = await mountQuestion(toggleButtonQuestion({ id: 'q_consent', required: true }));

    toggle(harness.host).click();
    await harness.settle();

    harness.session.next();
    await harness.settle();

    expect(harness.session.errorFor(questionId('q_consent'))).toBeUndefined();
  });

  it('passes a required switch that defaults on and was never touched', async () => {
    const harness = await mountQuestion(
      toggleButtonQuestion({ id: 'q_consent', required: true, defaultValue: true }),
    );

    harness.session.next();
    await harness.settle();

    // The respondent saw it on, so it is on. Demanding a touch would be a rule they have
    // no way to see.
    expect(harness.session.errorFor(questionId('q_consent'))).toBeUndefined();
  });

  it('carries no error wiring while the question is valid', async () => {
    const harness = await mountQuestion(toggleButtonQuestion({ id: 'q_notify', required: true }));

    // Absent, not `"false"` — FR-064 and US2 scenario 12.
    expect(toggle(harness.host).hasAttribute('aria-invalid')).toBe(false);
    expect(toggle(harness.host).getAttribute('aria-describedby')).toBeNull();
  });

  it('gives the switch a 44px minimum target (FR-058)', async () => {
    const harness = await mountQuestion(toggleButtonQuestion());

    // Two halves, because jsdom computes no layout and does not inject `styleUrl` CSS: the
    // rendered control carries `sv-toggle`, and the stylesheet the component declares
    // sizes that class. The rendered box is the 375px smoke gate's job.
    expect(toggle(harness.host).classList.contains('sv-toggle')).toBe(true);

    const styles = readFileSync(
      resolve(process.cwd(), 'src/app/features/survey/questions/toggle-button-question.css'),
      'utf8',
    );
    expect(styles).toMatch(/\.sv-toggle\s*\{[^}]*min-height:\s*44px/s);
  });

  it('disables the switch while the submission is in flight (FR-039)', async () => {
    const harness = await mountQuestion(toggleButtonQuestion({ id: 'q_notify' }), {
      // An adapter that answers immediately would be in `submitted` before the assertion.
      gateway: new FailingSurveyResponseGateway('never-answers'),
    });

    void harness.session.submit();
    await harness.settle();

    expect(toggle(harness.host).disabled).toBe(true);
  });
});
