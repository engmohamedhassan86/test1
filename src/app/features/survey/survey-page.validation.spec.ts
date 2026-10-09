/**
 * T114 — US2 scenarios 1-4, 6-8 and 10-14, at the DOM level.
 *
 * Driven **through the rendered controls** over the real `customer-feedback` shape: the
 * walk types into the real input and clicks the real Next, so what is proven is the wiring
 * between the controls, the session and the two places an error appears. A walk that
 * called `session.next()` directly would pass against a viewer whose Next was not
 * connected at all.
 *
 * Two scenarios of US2 are deliberately **not** here, because they are not about blocked
 * navigation and already have a sharper home:
 *
 * - **scenario 5** (unselected options non-selectable at `maxSelections`, and the hint) —
 *   `questions/checkbox-question.spec.ts`;
 * - **scenario 11** (the five satisfaction labels, and that choosing "Satisfied" stores
 *   `4`) — `questions/satisfaction-question.spec.ts`.
 *
 * **Scenario 9** is `survey-page.retention.spec.ts` (T116), which needs a different walk.
 *
 * Together with the per-type specs T103-T107 this discharges **SC-003**: every one of the
 * six question types blocks Next on an invalid input.
 */

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { CheckboxQuestion } from '../../core/models/survey.model';
import {
  customerFeedbackSurvey,
  optionValue,
} from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

const SUBJECT = customerFeedbackSurvey();

/** `q_liked`, needed by scenario 13, which sets its answer without a control. */
const Q_LIKED = SUBJECT.pages[1].questions[1] as CheckboxQuestion;

type Harness = ViewerHarness<SurveyPageComponent>;

async function openViewer(
  gateway: AcknowledgingSurveyResponseGateway = new AcknowledgingSurveyResponseGateway(),
): Promise<Harness> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: SUBJECT },
    gateway,
  });
}

// --- reading the rendered page --------------------------------------------------------

function position(host: HTMLElement): string {
  return host.querySelector('.sv-nav__position')?.textContent?.trim() ?? '';
}

/** The error text rendered under one question, or `null` when none is. */
function errorFor(host: HTMLElement, questionId: string): string | null {
  const error = host.querySelector(`#sv-q-${questionId}-error`);
  return error === null ? null : (error.textContent?.trim() ?? '');
}

/** The summary's rows as `question title` / `message` pairs, in rendered order. */
function summaryRows(host: HTMLElement): readonly { question: string; message: string }[] {
  return [...host.querySelectorAll<HTMLElement>('.sv-summary__item')].map((item) => ({
    question: item.querySelector('.sv-summary__link')?.textContent?.trim() ?? '',
    message: item.querySelector('.sv-summary__message')?.textContent?.trim() ?? '',
  }));
}

/** Every control on the page that carries an `aria-invalid` of any value. */
function invalidMarkers(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll('[aria-invalid]')].map(
    (element) => element.getAttribute('aria-invalid') ?? '',
  );
}

function assertiveMessage(): string | null {
  return TestBed.inject(AnnouncerService).assertive();
}

// --- driving it -----------------------------------------------------------------------

async function type(harness: Harness, selector: string, value: string): Promise<void> {
  const field = harness.host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (field === null) {
    throw new Error(`expected a field matching ${selector}`);
  }
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await harness.settle();
}

async function clickNth(harness: Harness, selector: string, index: number): Promise<void> {
  const targets = [...harness.host.querySelectorAll<HTMLElement>(selector)];
  const target = targets[index];
  if (target === undefined) {
    throw new Error(`expected at least ${index + 1} elements matching ${selector}`);
  }
  target.click();
  await harness.settle();
}

const next = (harness: Harness): Promise<void> => clickNth(harness, '.sv-nav__button--primary', 0);
const back = (harness: Harness): Promise<void> =>
  clickNth(harness, '.sv-nav__button--secondary', 0);

/** Answers page 1 fully — required textbox, required radio — through the controls. */
async function answerPage1(harness: Harness): Promise<void> {
  await type(harness, 'input[type="text"]', 'Sam');
  await clickNth(harness, 'input[type="radio"]', 0);
}

/** Answers page 2 fully — required satisfaction, required checkbox. */
async function answerPage2(harness: Harness): Promise<void> {
  await clickNth(harness, '.sv-scale__point', 3);
  await clickNth(harness, 'input[type="checkbox"]', 0);
}

async function goToPage2(harness: Harness): Promise<void> {
  await answerPage1(harness);
  await next(harness);
}

describe('SurveyPageComponent — blocked navigation (US2)', () => {
  it('blocks Next on an unanswered required radio, naming and focusing it (scenario 1)', async () => {
    const harness = await openViewer();

    // Only the radio is left unanswered, so it is the *first* invalid question and the
    // scenario's focus claim is about it rather than about the textbox above it.
    await type(harness, 'input[type="text"]', 'Sam');
    await next(harness);

    expect(position(harness.host)).toBe('Page 1 of 4');
    expect(errorFor(harness.host, 'q_segment')).toBe('Choose one option');
    expect(assertiveMessage()).toBe('There is 1 answer to fix on this page');

    const firstRadio = harness.host.querySelector('input[type="radio"]');
    expect(document.activeElement).toBe(firstRadio);
  });

  it('reports the required rule, not the length rule, for a whitespace-only answer (scenario 2)', async () => {
    const harness = await openViewer();

    await clickNth(harness, 'input[type="radio"]', 0);
    await type(harness, 'input[type="text"]', '  ');
    await next(harness);

    expect(position(harness.host)).toBe('Page 1 of 4');
    // `minLength: 2` is satisfied by neither value, so rule *ordering* is the claim: the
    // trimmed answer is empty, which is the required rule and not the length rule.
    expect(errorFor(harness.host, 'q_name')).toBe('Enter an answer');

    // FR-069: the message names no question, so the association carries the context.
    const control = harness.host.querySelector<HTMLInputElement>('input[type="text"]');
    expect(control?.getAttribute('aria-describedby')).toContain('sv-q-q_name-error');
    expect(control?.getAttribute('aria-invalid')).toBe('true');
  });

  it('reports the length rule for a non-empty answer that is too short (scenario 3)', async () => {
    const harness = await openViewer();

    await clickNth(harness, 'input[type="radio"]', 0);
    await type(harness, 'input[type="text"]', 'D');
    await next(harness);

    expect(position(harness.host)).toBe('Page 1 of 4');
    expect(errorFor(harness.host, 'q_name')).toBe('Use at least 2 characters');
  });

  it('blocks Next on a checkbox below minSelections, focusing its first box (scenario 4)', async () => {
    const harness = await openViewer();
    await goToPage2(harness);

    // Satisfaction answered, so `q_liked` is the first invalid question on page 2.
    await clickNth(harness, '.sv-scale__point', 3);
    await next(harness);

    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(errorFor(harness.host, 'q_liked')).toBe('Select at least 1 option');
    expect(document.activeElement).toBe(harness.host.querySelector('input[type="checkbox"]'));
  });

  it('blocks Next on an empty required satisfaction, naming its range (scenario 6)', async () => {
    const harness = await openViewer();
    await goToPage2(harness);

    await clickNth(harness, 'input[type="checkbox"]', 0);
    await next(harness);

    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(errorFor(harness.host, 'q_satisfaction')).toBe('Choose a value between 1 and 5');
    // The group's first point, which is the first focusable control inside the wrapper.
    expect(document.activeElement).toBe(harness.host.querySelector('.sv-scale__point'));
  });

  it('renders both errors, lists both in page order and focuses the first (scenario 7)', async () => {
    const harness = await openViewer();
    await goToPage2(harness);

    await next(harness);

    expect(position(harness.host)).toBe('Page 2 of 4');

    // Under their own questions...
    expect(errorFor(harness.host, 'q_satisfaction')).toBe('Choose a value between 1 and 5');
    expect(errorFor(harness.host, 'q_liked')).toBe('Select at least 1 option');

    // ...and in the summary, in page order, which is satisfaction before liked.
    expect(summaryRows(harness.host)).toEqual([
      {
        question: 'How satisfied were you with your order?',
        message: 'Choose a value between 1 and 5',
      },
      { question: 'What did you like?', message: 'Select at least 1 option' },
    ]);

    expect(assertiveMessage()).toBe('There are 2 answers to fix on this page');
    expect(document.activeElement).toBe(harness.host.querySelector('.sv-scale__point'));
  });

  it("clears one question's error the moment it is answered, without Next (scenario 8)", async () => {
    const harness = await openViewer();
    await goToPage2(harness);
    await next(harness);

    expect(errorFor(harness.host, 'q_liked')).toBe('Select at least 1 option');

    await clickNth(harness, 'input[type="checkbox"]', 0);

    expect(errorFor(harness.host, 'q_liked')).toBeNull();
    // The other question's error is untouched: one answer fixed removes one message.
    expect(errorFor(harness.host, 'q_satisfaction')).toBe('Choose a value between 1 and 5');
    expect(summaryRows(harness.host)).toHaveLength(1);
    expect(position(harness.host)).toBe('Page 2 of 4');
  });

  it('never blocks Previous on an invalid page (scenario 10)', async () => {
    const harness = await openViewer();
    await goToPage2(harness);
    await next(harness);

    expect(harness.session.state().kind).toBe('validation-error');
    const previousButton = harness.host.querySelector<HTMLButtonElement>(
      '.sv-nav__button--secondary',
    );
    expect(previousButton?.disabled).toBe(false);

    await back(harness);

    expect(position(harness.host)).toBe('Page 1 of 4');
    expect(harness.text()).toContain('What should we call you?');
  });

  it('returns to a page with its answers and no error, and reports again on Next (scenario 12)', async () => {
    const harness = await openViewer();
    await goToPage2(harness);

    // Answer `q_liked` only, so the blocked Next is about `q_satisfaction` alone.
    await clickNth(harness, 'input[type="checkbox"]', 0);
    await next(harness);
    expect(errorFor(harness.host, 'q_satisfaction')).toBe('Choose a value between 1 and 5');

    await back(harness);
    await next(harness);

    // FR-064: the page returns in `editing` — answers intact, nothing carried over.
    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(harness.session.state().kind).toBe('editing');
    expect(harness.host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(
      true,
    );
    expect(errorFor(harness.host, 'q_satisfaction')).toBeNull();
    expect(summaryRows(harness.host)).toHaveLength(0);
    // No control carries an `aria-invalid` of *any* value, true or false.
    expect(invalidMarkers(harness.host)).toEqual([]);

    // And the rule is re-checked the next time the page is left forward.
    await next(harness);
    expect(errorFor(harness.host, 'q_satisfaction')).toBe('Choose a value between 1 and 5');
    expect(position(harness.host)).toBe('Page 2 of 4');
  });

  it('blocks Next on a maxSelections breach that arrived without the control (scenario 13)', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(gateway);
    await goToPage2(harness);

    await clickNth(harness, '.sv-scale__point', 3);
    // FR-070: four values on a `maxSelections: 3` question, set by a route that bypasses
    // the control entirely — a restored session, or a config whose ceiling was lowered.
    harness.session.setAnswer(Q_LIKED, {
      kind: 'options',
      values: [
        optionValue('delivery'),
        optionValue('packaging'),
        optionValue('support'),
        optionValue('price'),
      ],
    });
    await harness.settle();

    await next(harness);

    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(errorFor(harness.host, 'q_liked')).toBe('Select no more than 3 options');
    expect(gateway.calls).toHaveLength(0);
  });

  it('blocks Submit on the same breach, from the last page, with no gateway call (scenario 13)', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(gateway);
    await goToPage2(harness);

    await answerPage2(harness);
    harness.session.setAnswer(Q_LIKED, {
      kind: 'options',
      values: [
        optionValue('delivery'),
        optionValue('packaging'),
        optionValue('support'),
        optionValue('price'),
      ],
    });
    await harness.settle();

    // Pages 3 and 4: page 3 is all optional, page 4 needs `q_recommend`.
    await next(harness);
    expect(position(harness.host)).toBe('Page 2 of 4');

    // The blocked Next above proves the breach stops forward navigation; to reach Submit
    // the answer has to be legal first, then broken again on the last page.
    await clickNth(harness, 'input[type="checkbox"]', 3);
    await harness.settle();
    expect(errorFor(harness.host, 'q_liked')).toBeNull();
    await next(harness);
    expect(position(harness.host)).toBe('Page 3 of 4');
    await next(harness);
    expect(position(harness.host)).toBe('Page 4 of 4');
    await clickNth(harness, 'input[type="radio"]', 0);

    harness.session.setAnswer(Q_LIKED, {
      kind: 'options',
      values: [
        optionValue('delivery'),
        optionValue('packaging'),
        optionValue('support'),
        optionValue('price'),
      ],
    });
    await harness.settle();

    await next(harness);

    // FR-034: no submission starts, and the earliest invalid page renders.
    expect(gateway.calls).toHaveLength(0);
    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(errorFor(harness.host, 'q_liked')).toBe('Select no more than 3 options');
    expect(harness.session.state().kind).toBe('validation-error');
  });

  it('blocks Next on a trimmed answer longer than maxLength (scenario 14)', async () => {
    const harness = await openViewer();

    await clickNth(harness, 'input[type="radio"]', 0);
    // 81 characters once trimmed, against `maxLength: 80`. The control's own `maxlength`
    // stops a *typed* 81st character; this is the value arriving by any other route.
    await type(harness, 'input[type="text"]', ` ${'D'.repeat(81)} `);
    await next(harness);

    expect(position(harness.host)).toBe('Page 1 of 4');
    expect(errorFor(harness.host, 'q_name')).toBe('Use at most 80 characters');
  });

  it('moves focus again when Next is pressed a second time on the same question (FR-030)', async () => {
    const harness = await openViewer();

    await type(harness, 'input[type="text"]', 'Sam');
    await next(harness);
    const firstRadio = harness.host.querySelector<HTMLElement>('input[type="radio"]');
    expect(document.activeElement).toBe(firstRadio);

    // Focus is moved away, then Next is pressed again on the still-invalid question. The
    // token on `FocusRequest` is what makes the second request a new value.
    harness.host.querySelector<HTMLElement>('input[type="text"]')?.focus();
    expect(document.activeElement).not.toBe(firstRadio);

    await next(harness);

    expect(document.activeElement).toBe(firstRadio);
  });

  it('keeps Next and Submit operable while an error stands, so the error can re-report', async () => {
    const harness = await openViewer();

    await type(harness, 'input[type="text"]', 'Sam');
    await next(harness);

    // A disabled Next would make the FR-030 re-announcement above unreachable.
    const primary = harness.host.querySelector<HTMLButtonElement>('.sv-nav__button--primary');
    expect(primary?.disabled).toBe(false);
    expect(primary?.textContent?.trim()).toBe('Next');
  });

  it("activating a summary link focuses that question's control (FR-030)", async () => {
    const harness = await openViewer();

    await next(harness);

    // Both page-1 questions are invalid, so the summary has two rows and focus starts on
    // the first. The second row's link is the one worth asserting.
    expect(summaryRows(harness.host)).toHaveLength(2);
    await clickNth(harness, '.sv-summary__link', 1);

    expect(document.activeElement).toBe(harness.host.querySelector('input[type="radio"]'));
  });
});
