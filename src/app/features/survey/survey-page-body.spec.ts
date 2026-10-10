/**
 * T109 — FR-073's ordering, US1 scenario 7's "nothing stands in for an absent
 * description", and FR-029's focus move to the new page's heading.
 *
 * The ordering assertion compares the **rendered sequence** rather than checking that both
 * elements exist. "The survey description is above the page title" is a claim about order,
 * and two `expect(...).not.toBeNull()` calls would pass just as happily with the order
 * reversed.
 *
 * The absent-description assertions check that the element is *missing*, not that its text
 * is empty. An empty `<p>` still occupies a line and still reserves space, which is the
 * thing US1 scenario 7 rules out.
 */

import { describe, expect, it } from 'vitest';

import {
  page,
  radioQuestion,
  survey,
  textboxQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { mountWithSession } from './__fixtures__/survey-harness';
import { SurveyPageBodyComponent } from './survey-page-body';

describe('SurveyPageBodyComponent', () => {
  it('renders the page title', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([page('p1', 'About your delivery', [radioQuestion({ id: 'q1' })])]),
    );

    expect(harness.host.querySelector('.sv-page__title')?.textContent?.trim()).toBe(
      'About your delivery',
    );
  });

  it("puts the survey's description above the page title and the page's below it (FR-073)", async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([page('p1', 'About your delivery', [radioQuestion({ id: 'q1' })], 'Page blurb.')], {
        description: 'Survey blurb.',
      }),
    );

    expect(harness.host.querySelector('.sv-page__survey-description')?.textContent?.trim()).toBe(
      'Survey blurb.',
    );
    expect(harness.host.querySelector('.sv-page__description')?.textContent?.trim()).toBe(
      'Page blurb.',
    );

    // Order, not mere presence: `querySelectorAll` yields document order, so the sequence
    // of class names *is* the rendered order. Two presence assertions would pass just as
    // happily with the survey blurb below the page title.
    const order = [
      ...harness.host.querySelectorAll(
        '.sv-page__survey-description, .sv-page__title, .sv-page__description',
      ),
    ].map((element) => element.className);

    expect(order).toEqual([
      'sv-page__survey-description',
      'sv-page__title',
      'sv-page__description',
    ]);
  });

  it('leaves no element behind for an absent survey description (US1 scenario 7)', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([page('p1', 'About your delivery', [radioQuestion({ id: 'q1' })], 'Page blurb.')]),
    );

    // Absent, not empty — an empty paragraph still reserves a line.
    expect(harness.host.querySelector('.sv-page__survey-description')).toBeNull();
    expect(harness.host.querySelector('.sv-page__description')).not.toBeNull();
  });

  it('leaves no element behind for an absent page description (US1 scenario 7)', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([page('p1', 'About your delivery', [radioQuestion({ id: 'q1' })])], {
        description: 'Survey blurb.',
      }),
    );

    expect(harness.host.querySelector('.sv-page__description')).toBeNull();
    expect(harness.host.querySelector('.sv-page__survey-description')).not.toBeNull();
  });

  it('renders one question host per question on the current page, in order', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([
        page('p1', 'First', [
          radioQuestion({ id: 'q1', title: 'First question' }),
          textboxQuestion({ id: 'q2', title: 'Second question' }),
        ]),
        page('p2', 'Second', [radioQuestion({ id: 'q3', title: 'Third question' })]),
      ]),
    );

    const hosts = harness.host.querySelectorAll('app-question-host');
    expect(hosts).toHaveLength(2);
    // Page 2's question must not be rendered — the viewer shows one page at a time.
    expect(harness.text()).not.toContain('Third question');
  });

  it('renders the next page only after the session advances', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([
        page('p1', 'First', [radioQuestion({ id: 'q1' })]),
        page('p2', 'Second', [radioQuestion({ id: 'q2' })]),
      ]),
    );

    harness.session.next();
    await harness.settle();

    expect(harness.host.querySelector('.sv-page__title')?.textContent?.trim()).toBe('Second');
    expect(harness.host.querySelectorAll('app-question-host')).toHaveLength(1);
  });

  it('renders a question-free page as its title and nothing else', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([page('p1', 'Introduction', [], 'Read this first.')]),
    );

    // A page with zero questions is valid configuration.
    expect(harness.host.querySelector('.sv-page__title')?.textContent?.trim()).toBe('Introduction');
    expect(harness.host.querySelectorAll('app-question-host')).toHaveLength(0);
    expect(harness.host.querySelector('.sv-page__description')?.textContent?.trim()).toBe(
      'Read this first.',
    );
  });

  it('makes the page heading programmatically focusable (FR-029)', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([page('p1', 'First', [radioQuestion({ id: 'q1' })])]),
    );

    // Without tabindex the heading cannot receive the post-Next focus move at all.
    expect(harness.host.querySelector('.sv-page__title')?.getAttribute('tabindex')).toBe('-1');
  });

  it("moves focus to the new page's heading after a successful Next (FR-029)", async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([
        page('p1', 'First', [radioQuestion({ id: 'q1', required: false })]),
        page('p2', 'Second', [radioQuestion({ id: 'q2' })]),
      ]),
    );

    harness.session.next();
    await harness.settle();

    const heading = harness.host.querySelector('.sv-page__title');
    expect(heading?.textContent?.trim()).toBe('Second');
    expect(document.activeElement).toBe(heading);
  });

  it('does not move focus to the heading when Next was refused', async () => {
    const harness = await mountWithSession(
      SurveyPageBodyComponent,
      survey([
        page('p1', 'First', [radioQuestion({ id: 'q1', required: true })]),
        page('p2', 'Second', [radioQuestion({ id: 'q2' })]),
      ]),
    );

    harness.host.querySelector<HTMLElement>('.sv-page__title')?.blur();
    harness.session.next();
    await harness.settle();

    // A refused Next requests focus on the offending *question*, which belongs to
    // `survey-page.ts`. The heading must not steal it.
    expect(harness.host.querySelector('.sv-page__title')?.textContent?.trim()).toBe('First');
    expect(document.activeElement).not.toBe(harness.host.querySelector('.sv-page__title'));
  });
});
