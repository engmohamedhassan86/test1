/**
 * T108 — FR-031's disabled Previous, FR-032's textual position, FR-033's single primary
 * action, and FR-039's busy Submit.
 *
 * Mounted over a **real** session rather than a stub. Every assertion here is really an
 * assertion about a computed signal in `core` — "Submit appears only on the last page" is
 * `primaryAction`, not markup — so a stub session would reduce this spec to a test of the
 * stub. That is also what keeps Principle II honest: if the component started deciding
 * which page is last, these specs would still pass against a stub and fail here.
 */

import { describe, expect, it } from 'vitest';

import { page, radioQuestion, survey } from '../../core/models/__fixtures__/survey-builders';
import { FailingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { mountWithSession } from './__fixtures__/survey-harness';
import { SurveyNavigationComponent } from './survey-navigation';

/** Three pages, so "first", "middle" and "last" are three distinct positions. */
function threePageSurvey() {
  return survey([
    page('p1', 'First', [radioQuestion({ id: 'q1' })]),
    page('p2', 'Second', [radioQuestion({ id: 'q2' })]),
    page('p3', 'Third', [radioQuestion({ id: 'q3' })]),
  ]);
}

function buttonNamed(host: HTMLElement, label: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === label,
  );
}

function previousButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.sv-nav__button--secondary');
}

function primaryButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.sv-nav__button--primary');
}

describe('SurveyNavigationComponent', () => {
  it('names the position as text, not as a progress bar alone (FR-032)', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    expect(harness.host.querySelector('.sv-nav__position')?.textContent?.trim()).toBe(
      'Page 1 of 3',
    );
  });

  it('updates the position as pages advance', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    harness.session.next();
    await harness.settle();

    expect(harness.host.querySelector('.sv-nav__position')?.textContent?.trim()).toBe(
      'Page 2 of 3',
    );
  });

  it('gives the navigation an accessible name of its own', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    expect(harness.host.querySelector('nav')?.getAttribute('aria-label')).toBe('Survey pages');
  });

  it('disables Previous on page 1 (FR-031)', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    expect(previousButton(harness.host)?.disabled).toBe(true);
  });

  it('enables Previous once past page 1 (FR-031)', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    harness.session.next();
    await harness.settle();

    expect(previousButton(harness.host)?.disabled).toBe(false);
  });

  it('offers Next, not Submit, on every page before the last (FR-033)', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    expect(primaryButton(harness.host)?.textContent?.trim()).toBe('Next');
    // The negative half: Submit must not be reachable early.
    expect(buttonNamed(harness.host, 'Submit')).toBeUndefined();

    harness.session.next();
    await harness.settle();
    expect(primaryButton(harness.host)?.textContent?.trim()).toBe('Next');
    expect(buttonNamed(harness.host, 'Submit')).toBeUndefined();
  });

  it('offers Submit, not Next, on the last page (FR-033)', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    harness.session.next();
    await harness.settle();
    harness.session.next();
    await harness.settle();

    expect(primaryButton(harness.host)?.textContent?.trim()).toBe('Submit');
    expect(buttonNamed(harness.host, 'Next')).toBeUndefined();
  });

  it('renders exactly one primary action at a time (FR-033)', async () => {
    const harness = await mountWithSession(SurveyNavigationComponent, threePageSurvey());

    expect(harness.host.querySelectorAll('.sv-nav__button--primary')).toHaveLength(1);
  });

  it('shows Submit on page 1 of a single-page survey', async () => {
    const harness = await mountWithSession(
      SurveyNavigationComponent,
      survey([page('p1', 'Only page', [radioQuestion({ id: 'q1' })])]),
    );

    // The first page is also the last one, so both rules apply at once.
    expect(primaryButton(harness.host)?.textContent?.trim()).toBe('Submit');
    expect(previousButton(harness.host)?.disabled).toBe(true);
    expect(harness.host.querySelector('.sv-nav__position')?.textContent?.trim()).toBe(
      'Page 1 of 1',
    );
  });

  it('marks Submit busy and disables both controls while a submission is in flight (FR-039)', async () => {
    const harness = await mountWithSession(
      SurveyNavigationComponent,
      survey([page('p1', 'Only page', [radioQuestion({ id: 'q1', required: false })])]),
      // An adapter that answers at once would be in `submitted` before the assertion.
      { gateway: new FailingSurveyResponseGateway('never-answers') },
    );

    void harness.session.submit();
    await harness.settle();

    const submit = primaryButton(harness.host);
    expect(submit?.getAttribute('aria-busy')).toBe('true');
    expect(submit?.textContent?.trim()).toBe('Submitting…');
    expect(submit?.disabled).toBe(true);
    // Previous must not offer an escape from an in-flight submission either.
    expect(previousButton(harness.host)?.disabled).toBe(true);
  });

  it('carries no busy marking while nothing is in flight', async () => {
    const harness = await mountWithSession(
      SurveyNavigationComponent,
      survey([page('p1', 'Only page', [radioQuestion({ id: 'q1' })])]),
    );

    expect(primaryButton(harness.host)?.getAttribute('aria-busy')).toBe('false');
    expect(primaryButton(harness.host)?.disabled).toBe(false);
  });

  it('delegates Next to the session rather than advancing the page itself', async () => {
    const harness = await mountWithSession(
      SurveyNavigationComponent,
      survey([
        page('p1', 'First', [radioQuestion({ id: 'q1', required: true })]),
        page('p2', 'Second', [radioQuestion({ id: 'q2' })]),
      ]),
    );

    primaryButton(harness.host)?.click();
    await harness.settle();

    // The required answer is missing, so the session refused. A component that moved the
    // page itself would be on page 2 here — this is Principle III's gate, asserted from
    // the control that triggers it.
    expect(harness.session.currentPageIndex()).toBe(0);
    expect(harness.host.querySelector('.sv-nav__position')?.textContent?.trim()).toBe(
      'Page 1 of 2',
    );
  });

  it('delegates Previous to the session, which never validates (FR-031)', async () => {
    const harness = await mountWithSession(
      SurveyNavigationComponent,
      survey([
        page('p1', 'First', [radioQuestion({ id: 'q1' })]),
        page('p2', 'Second', [radioQuestion({ id: 'q2', required: true })]),
      ]),
    );

    harness.session.next();
    await harness.settle();

    previousButton(harness.host)?.click();
    await harness.settle();

    // Page 2's required answer is missing, and Previous still went back.
    expect(harness.session.currentPageIndex()).toBe(0);
  });
});
