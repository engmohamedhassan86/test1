/**
 * T102 — US1 scenarios 1-5 and 8, walked through the real four-page `customer-feedback`
 * shape rather than a two-page stand-in.
 *
 * Everything here is driven **through the rendered controls**: the walk types into the
 * real inputs and clicks the real Next, rather than calling `session.setAnswer` and
 * `session.next` directly. That is the whole point of an end-to-end spec at this level —
 * the per-type specs already cover each control against the session, so what is left to
 * prove is that the wiring between them holds across a page boundary. A walk that drove
 * the session directly would pass against a viewer whose buttons were not connected at
 * all.
 *
 * The survey spreads the six question types over four pages, which is why the walk goes
 * all the way to page 4 instead of stopping once it has shown that one Next works.
 */

import { describe, expect, it } from 'vitest';

import { customerFeedbackSurvey } from '../../core/models/__fixtures__/survey-builders';
import { FailingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

const SUBJECT = customerFeedbackSurvey();

async function openViewer(
  options: { readonly gateway?: FailingSurveyResponseGateway } = {},
): Promise<ViewerHarness<SurveyPageComponent>> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: SUBJECT },
    gateway: options.gateway,
  });
}

function position(host: HTMLElement): string {
  return host.querySelector('.sv-nav__position')?.textContent?.trim() ?? '';
}

function primary(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.sv-nav__button--primary');
}

function previous(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.sv-nav__button--secondary');
}

async function type(
  harness: ViewerHarness<SurveyPageComponent>,
  selector: string,
  value: string,
): Promise<void> {
  const field = harness.host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (field === null) {
    throw new Error(`expected a field matching ${selector}`);
  }
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await harness.settle();
}

async function clickNth(
  harness: ViewerHarness<SurveyPageComponent>,
  selector: string,
  index: number,
): Promise<void> {
  const targets = [...harness.host.querySelectorAll<HTMLElement>(selector)];
  const target = targets[index];
  if (target === undefined) {
    throw new Error(`expected at least ${index + 1} elements matching ${selector}`);
  }
  target.click();
  await harness.settle();
}

/** Answers page 1 — a required textbox and a required radio — through the controls. */
async function completePage1(harness: ViewerHarness<SurveyPageComponent>): Promise<void> {
  await type(harness, 'input[type="text"]', 'Sam');
  await clickNth(harness, 'input[type="radio"]', 0);
}

/** Answers page 2 — required satisfaction, required checkbox, optional rating. */
async function completePage2(harness: ViewerHarness<SurveyPageComponent>): Promise<void> {
  await clickNth(harness, '.sv-scale__point', 3);
  await clickNth(harness, 'input[type="checkbox"]', 0);
}

describe('SurveyPageComponent — end to end (US1)', () => {
  it('opens on page 1 of 4 with Previous unavailable and Next offered (scenario 1)', async () => {
    const harness = await openViewer();

    expect(position(harness.host)).toBe('Page 1 of 4');
    expect(previous(harness.host)?.disabled).toBe(true);
    expect(primary(harness.host)?.textContent?.trim()).toBe('Next');
    expect(primary(harness.host)?.disabled).toBe(false);

    // Scenario 1 is also "the first page's questions are there".
    expect(harness.text()).toContain('What should we call you?');
    expect(harness.text()).toContain('Which of these describes you?');
  });

  it('advances to page 2 once page 1 is answered, through the Next control (scenario 2)', async () => {
    const harness = await openViewer();

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);

    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(previous(harness.host)?.disabled).toBe(false);
    expect(harness.text()).toContain('How satisfied were you with your order?');
    // Page 1's questions are gone, not merely scrolled past.
    expect(harness.text()).not.toContain('What should we call you?');
  });

  it("moves focus to the new page's heading on advancing (FR-029)", async () => {
    const harness = await openViewer();

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);

    const heading = harness.host.querySelector('.sv-page__title');
    expect(heading?.textContent?.trim()).toBe('Your Experience');
    expect(document.activeElement).toBe(heading);
  });

  it('walks all four pages and offers Submit only on the last one (scenario 3)', async () => {
    const harness = await openViewer();

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(primary(harness.host)?.textContent?.trim()).toBe('Next');

    await completePage2(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    expect(position(harness.host)).toBe('Page 3 of 4');
    expect(primary(harness.host)?.textContent?.trim()).toBe('Next');

    // Page 3 holds one optional textarea, so Next passes with nothing entered.
    await clickNth(harness, '.sv-nav__button--primary', 0);
    expect(position(harness.host)).toBe('Page 4 of 4');

    // Only now is Submit offered.
    expect(primary(harness.host)?.textContent?.trim()).toBe('Submit');
  });

  it('keeps every answer when stepping back, and never validates on the way (scenario 5)', async () => {
    const harness = await openViewer();

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await completePage2(harness);

    await clickNth(harness, '.sv-nav__button--secondary', 0);

    expect(position(harness.host)).toBe('Page 1 of 4');
    // The textbox still holds what was typed, re-rendered from the session.
    expect(harness.host.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe('Sam');
    expect(harness.host.querySelector<HTMLInputElement>('input[type="radio"]')?.checked).toBe(true);

    // Going forward again finds page 2's answers intact too.
    await clickNth(harness, '.sv-nav__button--primary', 0);
    expect(position(harness.host)).toBe('Page 2 of 4');
    expect(harness.host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(
      true,
    );
  });

  it('blocks Next on an incomplete page and keeps the respondent there (scenario 2, negative)', async () => {
    const harness = await openViewer();

    await clickNth(harness, '.sv-nav__button--primary', 0);

    expect(position(harness.host)).toBe('Page 1 of 4');
    const summary = harness.host.querySelector('.sv-survey__summary');
    expect(summary?.getAttribute('role')).toBe('alert');
    expect(summary?.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('submits from the last page and renders the confirmation with its reference (scenario 4)', async () => {
    const harness = await openViewer();

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await completePage2(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    expect(position(harness.host)).toBe('Page 4 of 4');

    // Page 4's required radio.
    await clickNth(harness, 'input[type="radio"]', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);

    expect(harness.session.state().kind).toBe('submitted');

    const confirmation = harness.host.querySelector('app-submission-confirmation');
    expect(confirmation).not.toBeNull();
    expect(harness.text()).toContain('Customer Feedback');
    expect(harness.text()).toContain('has been received');

    // The reference is on the page and is not empty.
    const reference = harness.host.querySelector('.sv-confirmation__reference code');
    expect(reference?.textContent?.trim()).not.toBe('');
  });

  it('renders no question control once the confirmation shows (scenario 4, SC-005)', async () => {
    const harness = await openViewer();

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await completePage2(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, 'input[type="radio"]', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);

    expect(harness.host.querySelectorAll('input')).toHaveLength(0);
    expect(harness.host.querySelectorAll('textarea')).toHaveLength(0);
    expect(harness.host.querySelector('app-survey-navigation')).toBeNull();
    expect(harness.host.querySelector('.sv-nav__position')).toBeNull();
  });

  it('offers a link back to the catalog from the confirmation (scenario 4)', async () => {
    const harness = await openViewer();

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await completePage2(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, 'input[type="radio"]', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);

    const hrefs = [...harness.host.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/');
  });

  it('titles the confirmation differently from the survey (FR-077)', async () => {
    const harness = await openViewer();
    expect(document.title).toBe('Customer Feedback — Survey');

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await completePage2(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, 'input[type="radio"]', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);

    expect(document.title).toBe('Customer Feedback — Response received');
  });

  it('reopening the survey starts a fresh response at page 1 (scenario 8)', async () => {
    const first = await openViewer();
    await completePage1(first);
    await clickNth(first, '.sv-nav__button--primary', 0);
    expect(position(first.host)).toBe('Page 2 of 4');

    // A route change away and back is a new component and a new session.
    const reopened = await openViewer();

    expect(position(reopened.host)).toBe('Page 1 of 4');
    expect(reopened.session.answers().size).toBe(0);
    expect(reopened.host.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe('');
  });

  it('shows no success screen and keeps the answers when the submission fails (scenario 4, negative)', async () => {
    const harness = await openViewer({
      gateway: new FailingSurveyResponseGateway('server-error'),
    });

    await completePage1(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await completePage2(harness);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);
    await clickNth(harness, 'input[type="radio"]', 0);
    await clickNth(harness, '.sv-nav__button--primary', 0);

    // Principle III: no confirmation until it is acknowledged.
    expect(harness.host.querySelector('app-submission-confirmation')).toBeNull();
    expect(harness.session.state().kind).toBe('submission-error');
    expect(harness.host.querySelector('.sv-survey__retry')).not.toBeNull();

    // Still on page 4, with the answer that was given.
    expect(position(harness.host)).toBe('Page 4 of 4');
    expect(harness.host.querySelector<HTMLInputElement>('input[type="radio"]')?.checked).toBe(true);
    expect(harness.session.answers().size).toBeGreaterThan(0);
  });
});
