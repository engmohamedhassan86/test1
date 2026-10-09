/**
 * T107 — FR-010's fixed five-point scale, FR-053's grouped form, FR-060's Clear, and
 * FR-058's target size.
 *
 * The assertion that earns its place here is the **group's** accessible name. PRI-19's
 * obligation 5 recorded that this type's five visible labels are *option* labels, not the
 * group name, so a spec that only checked those would leave FR-053 unasserted for
 * `satisfaction` — and axe cannot cover the gap, because axe detects a missing accessible
 * name and never a wrong one.
 *
 * The scale is read from `SATISFACTION_POINTS` / `SATISFACTION_LABELS` rather than written
 * out, so this spec cannot drift from the model the way a hand-copied list would. The
 * count is asserted against a literal 5 deliberately: FR-010 fixes it, and a model change
 * that added a sixth point should fail here rather than be silently accepted.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SATISFACTION_LABELS, SATISFACTION_POINTS } from '../../../core/models/survey.model';
import { FailingSurveyResponseGateway } from '../../../core/services/testing/failing-survey-response.gateway';
import {
  questionId,
  satisfactionQuestion,
} from '../../../core/models/__fixtures__/survey-builders';
import { mountQuestion } from './__fixtures__/question-harness';

function points(host: HTMLElement): HTMLButtonElement[] {
  return [...host.querySelectorAll<HTMLButtonElement>('.sv-scale__point')];
}

describe('SatisfactionQuestionComponent', () => {
  it('renders exactly five points, in scale order (FR-010)', async () => {
    const harness = await mountQuestion(satisfactionQuestion());

    // FR-010 fixes the scale at five. A sixth point is configuration failure F05.
    expect(points(harness.host)).toHaveLength(5);
    expect(SATISFACTION_POINTS).toHaveLength(5);
  });

  it('labels every point with visible text, not an icon or a colour alone (FR-010)', async () => {
    const harness = await mountQuestion(satisfactionQuestion());

    const labels = points(harness.host).map((point) => point.textContent?.trim() ?? '');
    expect(labels).toEqual(SATISFACTION_POINTS.map((point) => SATISFACTION_LABELS[point]));

    // The text is the label, so none of them may be empty or whitespace-only.
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(harness.host.querySelectorAll('.sv-scale__point [aria-hidden="true"]')).toHaveLength(0);
  });

  it("has a group whose accessible name is the question's title (FR-053)", async () => {
    const harness = await mountQuestion(
      satisfactionQuestion({ title: 'How satisfied were you with the support you received?' }),
    );

    const group = harness.host.querySelector('[role="radiogroup"]');
    if (group === null) {
      throw new Error('expected a radiogroup');
    }

    // The *group's* name, not the five option labels. Asserting the text it resolves to,
    // not merely that a name is present — axe can only see the latter.
    expect(harness.accessibleName(group)).toBe(
      'How satisfied were you with the support you received?',
    );
  });

  it('marks the group required when the question is required (FR-005)', async () => {
    const required = await mountQuestion(satisfactionQuestion({ required: true }));
    expect(required.host.querySelector('[role="radiogroup"]')?.getAttribute('aria-required')).toBe(
      'true',
    );

    const optional = await mountQuestion(satisfactionQuestion({ required: false }));
    expect(optional.host.querySelector('[role="radiogroup"]')?.getAttribute('aria-required')).toBe(
      'false',
    );
  });

  it('stores the integer point that was chosen, not its label', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support' }));

    points(harness.host)[3].click();
    await harness.settle();

    expect(harness.session.answers().get(questionId('q_support'))).toEqual({
      type: 'satisfaction',
      value: 4,
    });
  });

  it('marks the chosen point as checked, and only that one', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support' }));

    points(harness.host)[0].click();
    await harness.settle();

    const checked = points(harness.host).filter(
      (point) => point.getAttribute('aria-checked') === 'true',
    );
    expect(checked).toHaveLength(1);
    expect(checked[0].textContent?.trim()).toBe(SATISFACTION_LABELS[1]);
  });

  it('replaces the previous point rather than accumulating answers', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support' }));

    points(harness.host)[1].click();
    await harness.settle();
    points(harness.host)[4].click();
    await harness.settle();

    expect(harness.session.answers().get(questionId('q_support'))).toEqual({
      type: 'satisfaction',
      value: 5,
    });
    expect(
      points(harness.host).filter((point) => point.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(1);
  });

  it('returns the question to unanswered on Clear, not to the lowest point (FR-060)', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support', required: false }));

    points(harness.host)[2].click();
    await harness.settle();
    expect(harness.session.answers().has(questionId('q_support'))).toBe(true);

    harness.host.querySelector<HTMLButtonElement>('.sv-scale__clear')?.click();
    await harness.settle();

    // 'Very dissatisfied' is an answer. Clearing must leave no answer at all.
    expect(harness.session.answers().has(questionId('q_support'))).toBe(false);
    expect(
      points(harness.host).filter((point) => point.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(0);
    expect(harness.session.questionErrors().size).toBe(0);
  });

  it('disables Clear while there is nothing to clear', async () => {
    const harness = await mountQuestion(satisfactionQuestion());

    expect(harness.host.querySelector<HTMLButtonElement>('.sv-scale__clear')?.disabled).toBe(true);
  });

  it('offers Clear on a required question, and the required rule then reports at Next (US1 scenario 6)', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support', required: true }));

    points(harness.host)[3].click();
    await harness.settle();

    const clear = harness.host.querySelector<HTMLButtonElement>('.sv-scale__clear');
    // Clearing is allowed on a required question — it is not the same as never answering.
    expect(clear?.disabled).toBe(false);
    clear?.click();
    await harness.settle();

    harness.session.next();
    await harness.settle();

    expect(harness.session.errorFor(questionId('q_support'))).toBeDefined();
  });

  it('wires aria-invalid and aria-describedby when an error stands (FR-054)', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support', required: true }));

    harness.session.next();
    await harness.settle();

    const group = harness.host.querySelector('[role="radiogroup"]');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
    expect(group?.getAttribute('aria-describedby')).toBe('sv-q-q_support-error');
  });

  it('carries no error wiring while the question is valid', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support', required: true }));

    const group = harness.host.querySelector('[role="radiogroup"]');
    expect(group?.getAttribute('aria-invalid')).toBe('false');
    expect(group?.getAttribute('aria-describedby')).toBeNull();
  });

  it('gives every point a 44px minimum target (FR-058)', async () => {
    const harness = await mountQuestion(satisfactionQuestion());

    // Two halves, because jsdom computes no layout and does not inject `styleUrl` CSS:
    // every rendered point carries `sv-scale__point`, and the stylesheet the component
    // declares sizes that class. The rendered box is the 375px smoke gate's job (T146).
    const rendered = points(harness.host);
    expect(rendered).toHaveLength(5);
    expect(rendered.every((point) => point.classList.contains('sv-scale__point'))).toBe(true);

    const styles = readFileSync(
      resolve(process.cwd(), 'src/app/features/survey/questions/scale-question.css'),
      'utf8',
    );
    expect(styles).toMatch(/\.sv-scale__point\s*\{[^}]*min-width:\s*44px/s);
    expect(styles).toMatch(/\.sv-scale__point\s*\{[^}]*min-height:\s*44px/s);
  });

  it('disables every control while the submission is in flight (FR-039)', async () => {
    const harness = await mountQuestion(satisfactionQuestion({ id: 'q_support' }), {
      // An adapter that answers immediately would be in `submitted` before the assertion.
      gateway: new FailingSurveyResponseGateway('never-answers'),
    });

    points(harness.host)[2].click();
    await harness.settle();

    void harness.session.submit();
    await harness.settle();

    expect(points(harness.host).every((point) => point.disabled)).toBe(true);
    expect(harness.host.querySelector<HTMLButtonElement>('.sv-scale__clear')?.disabled).toBe(true);
  });
});
