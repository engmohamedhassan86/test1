/**
 * T106 — FR-009's two presentations, FR-053's grouped form, FR-060's Clear, and FR-058's
 * target size.
 *
 * The `min: 0` case is the one worth having: zero stars cannot be told apart from no
 * answer, which is the whole reason the numeric presentation exists.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { questionId, ratingQuestion } from '../../../core/models/__fixtures__/survey-builders';
import { mountQuestion } from './__fixtures__/question-harness';

function points(host: HTMLElement): HTMLButtonElement[] {
  return [...host.querySelectorAll<HTMLButtonElement>('.sv-scale__point')];
}

describe('RatingQuestionComponent', () => {
  it('renders stars when scale.min is at least 1 (FR-009)', async () => {
    const harness = await mountQuestion(ratingQuestion({ scale: { min: 1, max: 5 } }));

    expect(points(harness.host)).toHaveLength(5);
    expect(harness.host.querySelectorAll('.sv-scale__star')).toHaveLength(5);
    expect(harness.host.querySelectorAll('.sv-scale__number')).toHaveLength(0);
  });

  it('renders a labelled numeric row when scale.min is 0 (FR-009)', async () => {
    const harness = await mountQuestion(ratingQuestion({ scale: { min: 0, max: 10 } }));

    // Zero stars is indistinguishable from no answer, so the numbers carry the scale.
    expect(points(harness.host)).toHaveLength(11);
    expect(harness.host.querySelectorAll('.sv-scale__number')).toHaveLength(11);
    expect(harness.host.querySelectorAll('.sv-scale__star')).toHaveLength(0);
    expect(points(harness.host)[0].textContent?.trim()).toBe('0');
  });

  it("has a group whose accessible name is the question's title in the star presentation", async () => {
    const harness = await mountQuestion(
      ratingQuestion({ title: 'How would you rate the delivery?', scale: { min: 1, max: 5 } }),
    );

    const group = harness.host.querySelector('[role="radiogroup"]');
    if (group === null) {
      throw new Error('expected a radiogroup');
    }
    expect(harness.accessibleName(group)).toBe('How would you rate the delivery?');
  });

  it("has a group whose accessible name is the question's title in the numeric presentation", async () => {
    const harness = await mountQuestion(
      ratingQuestion({ title: 'How likely are you to return?', scale: { min: 0, max: 10 } }),
    );

    const group = harness.host.querySelector('[role="radiogroup"]');
    if (group === null) {
      throw new Error('expected a radiogroup');
    }
    // Asserted in both presentations: the group markup differs, so one assertion would
    // leave half of FR-053 unchecked for this type.
    expect(harness.accessibleName(group)).toBe('How likely are you to return?');
  });

  it('gives each star an accessible name even though the glyph is decorative', async () => {
    const harness = await mountQuestion(ratingQuestion({ scale: { min: 1, max: 5 } }));

    expect(harness.host.querySelectorAll('.sv-scale__star[aria-hidden="true"]')).toHaveLength(5);
    expect(points(harness.host)[2].textContent?.trim()).toContain('3');
  });

  it('stores the integer that was chosen', async () => {
    const harness = await mountQuestion(
      ratingQuestion({ id: 'q_delivery', scale: { min: 1, max: 5 } }),
    );

    points(harness.host)[3].click();
    await harness.settle();

    expect(harness.session.answers().get(questionId('q_delivery'))).toEqual({
      type: 'rating',
      value: 4,
    });
  });

  it('marks the chosen point as checked, and only that one', async () => {
    const harness = await mountQuestion(
      ratingQuestion({ id: 'q_delivery', scale: { min: 1, max: 5 } }),
    );

    points(harness.host)[3].click();
    await harness.settle();

    const checked = points(harness.host).filter(
      (point) => point.getAttribute('aria-checked') === 'true',
    );
    expect(checked).toHaveLength(1);
  });

  it('returns the question to unanswered on Clear, and Next is still accepted (FR-060, US1 scenario 6)', async () => {
    const harness = await mountQuestion(
      ratingQuestion({ id: 'q_delivery', required: false, scale: { min: 1, max: 5 } }),
    );

    points(harness.host)[2].click();
    await harness.settle();
    expect(harness.session.answers().has(questionId('q_delivery'))).toBe(true);

    harness.host.querySelector<HTMLButtonElement>('.sv-scale__clear')?.click();
    await harness.settle();

    // Not reset to the scale's minimum, which would be an answer.
    expect(harness.session.answers().has(questionId('q_delivery'))).toBe(false);
    expect(harness.session.questionErrors().size).toBe(0);
  });

  it('disables Clear while there is nothing to clear', async () => {
    const harness = await mountQuestion(ratingQuestion({ scale: { min: 1, max: 5 } }));

    expect(harness.host.querySelector<HTMLButtonElement>('.sv-scale__clear')?.disabled).toBe(true);
  });

  it('gives every star a 44px minimum target (FR-058)', async () => {
    const harness = await mountQuestion(ratingQuestion({ scale: { min: 1, max: 5 } }));

    // jsdom computes no layout and does not inject `styleUrl` CSS into the fixture, so the
    // two halves are asserted separately: every rendered point carries `sv-scale__point`,
    // and the stylesheet the component declares sizes that class to 44px. The rendered box
    // is the 375px smoke gate's job (T146).
    const rendered = points(harness.host);
    expect(rendered).toHaveLength(5);
    expect(rendered.every((point) => point.classList.contains('sv-scale__point'))).toBe(true);

    // Resolved from the project root rather than `import.meta.url`: under the jsdom
    // environment Vite hands this module an http: URL, which `node:fs` cannot open.
    const styles = readFileSync(
      resolve(process.cwd(), 'src/app/features/survey/questions/scale-question.css'),
      'utf8',
    );
    expect(styles).toMatch(/\.sv-scale__point\s*\{[^}]*min-width:\s*44px/s);
    expect(styles).toMatch(/\.sv-scale__point\s*\{[^}]*min-height:\s*44px/s);
  });

  it('wires aria-invalid and aria-describedby when an error stands', async () => {
    const harness = await mountQuestion(
      ratingQuestion({ id: 'q_delivery', required: true, scale: { min: 1, max: 5 } }),
    );

    harness.session.next();
    await harness.settle();

    const group = harness.host.querySelector('[role="radiogroup"]');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
    expect(group?.getAttribute('aria-describedby')).toBe('sv-q-q_delivery-error');
  });
});
