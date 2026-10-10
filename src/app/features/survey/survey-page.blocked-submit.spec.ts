/**
 * T127 — US6 scenario 6: Submit pressed on the last page with two earlier pages invalid.
 *
 * FR-034 says all pages are re-validated before a submission starts, so this is the case
 * that distinguishes a real survey-wide check from a last-page one. A viewer that validated
 * only the page Submit was pressed on would reach the boundary here with two unanswered
 * required questions, and a respondent bounced to the *last* invalid page rather than the
 * first would have to work backwards to find the rest.
 *
 * Four separate claims, each able to fail while the others hold:
 *
 * 1. no submission starts;
 * 2. the **earliest** invalid page renders, not the current one and not the last invalid;
 * 3. focus moves to that page's first invalid control, so a keyboard user is where the work
 *    is rather than at the top of a page they have to search;
 * 4. the summary says there are answers to fix on more than one page — without it, a
 *    respondent who fixes page 1 and presses Submit again is surprised a second time.
 */

import { describe, expect, it } from 'vitest';

import type { Survey } from '../../core/models/survey.model';
import {
  option,
  page,
  optionValue,
  radioQuestion,
  survey,
  textboxQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { multiplePagesInvalidMessage } from '../../core/validators/messages';
import { TestBed } from '@angular/core/testing';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { questionWrapperId } from './questions/question-host';
import { SurveyPageComponent } from './survey-page';

type Harness = ViewerHarness<SurveyPageComponent>;

/**
 * Four pages. Pages 1 and 3 carry required questions; pages 2 and 4 are satisfiable.
 *
 * Page 1 holds **two** required questions so "the first invalid control on the earliest
 * invalid page" is a real choice rather than the only one available — focus landing on
 * `q_two` would pass a one-question fixture.
 */
function fourPageSubject(): Survey {
  return survey([
    page('p1', 'First', [
      textboxQuestion({ id: 'q_one', title: 'Your name', required: true, minLength: 2 }),
      textboxQuestion({ id: 'q_two', title: 'Your city', required: true, minLength: 2 }),
    ]),
    page('p2', 'Second', [textboxQuestion({ id: 'q_optional', title: 'Anything else?' })]),
    page('p3', 'Third', [
      textboxQuestion({ id: 'q_three', title: 'Your order number', required: true, minLength: 2 }),
    ]),
    page('p4', 'Fourth', [
      radioQuestion({
        id: 'q_four',
        title: 'Would you recommend us?',
        required: true,
        options: [option('yes', 'Yes', 'yes'), option('no', 'No', 'no')],
      }),
    ]),
  ]);
}

const SUBJECT = fourPageSubject();

async function openViewer(gateway: AcknowledgingSurveyResponseGateway): Promise<Harness> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: SUBJECT },
    gateway,
  });
}

function position(harness: Harness): string {
  return harness.host.querySelector('.sv-nav__position')?.textContent?.trim() ?? '';
}

function summaryMessages(harness: Harness): readonly string[] {
  return [...harness.host.querySelectorAll<HTMLElement>('.sv-summary__message')].map(
    (element) => element.textContent?.trim() ?? '',
  );
}

function summaryText(harness: Harness): string {
  return harness.host.querySelector('.sv-summary')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/**
 * Reaches page 4 with pages 1 and 3 still invalid.
 *
 * Next is validated, so the walk cannot simply skip pages 1 and 3 — it answers them, moves
 * past, then clears the answers through `clearAnswer`. That is the honest route to the
 * state: there is no path through the rendered controls that both passes Next and leaves an
 * earlier page invalid, which is precisely why FR-034's re-check exists for the cases that
 * do arise (an edit, a cleared field, an FR-027 attachment re-check).
 */
async function reachPageFourWithTwoInvalidPages(harness: Harness): Promise<void> {
  const [p1, p2, p3, p4] = SUBJECT.pages;

  harness.session.setAnswer(p1.questions[0], { kind: 'text', value: 'Dana' });
  harness.session.setAnswer(p1.questions[1], { kind: 'text', value: 'Leeds' });
  harness.session.next();
  harness.session.next();
  harness.session.setAnswer(p3.questions[0], { kind: 'text', value: 'A-1' });
  harness.session.next();
  harness.session.setAnswer(p4.questions[0], { kind: 'option', value: optionValue('yes') });
  await harness.settle();
  expect(position(harness)).toBe('Page 4 of 4');

  // Now empty one question on page 1 and the one on page 3, leaving the respondent on 4.
  harness.session.clearAnswer(p1.questions[0].id);
  harness.session.clearAnswer(p3.questions[0].id);
  await harness.settle();

  // `p2` is referenced only to keep the destructure honest about the page order above.
  expect(p2.questions).toHaveLength(1);
}

describe('SurveyPageComponent — Submit blocked by an earlier page (US6 scenario 6)', () => {
  it('starts no submission', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(gateway);
    await reachPageFourWithTwoInvalidPages(harness);

    await harness.session.submit();
    await harness.settle();

    // FR-034: the boundary is never reached, so no `clientSubmissionId` is spent either.
    expect(gateway.calls).toEqual([]);
    expect(harness.session.state().kind).toBe('validation-error');
  });

  it('renders page 1, the earliest invalid page, not page 3 and not page 4', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    await reachPageFourWithTwoInvalidPages(harness);

    await harness.session.submit();
    await harness.settle();

    // Earliest, not last: a viewer that moved to `invalidPageIndexes.at(-1)` would land on
    // page 3 and make the respondent work backwards to find page 1's problem.
    expect(position(harness)).toBe('Page 1 of 4');
  });

  it("moves focus to page 1's first invalid control, not merely onto the page", async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    await reachPageFourWithTwoInvalidPages(harness);

    await harness.session.submit();
    await harness.settle();

    // `q_one` is empty and `q_two` is answered, so "first invalid" and "first on the page"
    // happen to agree here; the next test pins the case where they do not.
    const wrapper = harness.host.querySelector(`#${questionWrapperId('q_one')}`);
    expect(wrapper).not.toBeNull();
    expect(wrapper?.contains(harness.host.ownerDocument.activeElement)).toBe(true);
  });

  it('focuses the first *invalid* control even when an earlier control on the page is fine', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    const [p1, , p3] = SUBJECT.pages;
    await reachPageFourWithTwoInvalidPages(harness);

    // Put `q_one` back and empty `q_two` instead, so page 1's first invalid question is
    // its *second* question. A viewer that focused `page.questions[0]` would pass the test
    // above and fail here.
    harness.session.setAnswer(p1.questions[0], { kind: 'text', value: 'Dana' });
    harness.session.clearAnswer(p1.questions[1].id);
    await harness.settle();

    await harness.session.submit();
    await harness.settle();

    expect(position(harness)).toBe('Page 1 of 4');
    const wrapper = harness.host.querySelector(`#${questionWrapperId('q_two')}`);
    expect(wrapper?.contains(harness.host.ownerDocument.activeElement)).toBe(true);
    // Page 3 is still invalid, so this is the two-page case and not a one-page one.
    expect(harness.session.errorFor(p3.questions[0].id)).toBeUndefined();
  });

  it('states that there are answers to fix on more than one page (FR-034)', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    await reachPageFourWithTwoInvalidPages(harness);

    await harness.session.submit();
    await harness.settle();

    // The sentence comes from the catalogue, not from this spec and not from the template.
    expect(summaryText(harness)).toContain(multiplePagesInvalidMessage());
    // And it is announced, so it is not only visible to someone looking at the summary.
    expect(TestBed.inject(AnnouncerService).assertive()).toBe(multiplePagesInvalidMessage());
    // Page 1's own error is listed too — the scope line replaces nothing.
    expect(summaryMessages(harness)).toHaveLength(1);
  });

  it('says nothing about more than one page when only one page is invalid', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    const [, , p3] = SUBJECT.pages;
    await reachPageFourWithTwoInvalidPages(harness);

    // Fix page 3, leaving page 1 as the only invalid page.
    harness.session.setAnswer(p3.questions[0], { kind: 'text', value: 'A-1' });
    await harness.settle();

    await harness.session.submit();
    await harness.settle();

    // The negative half of FR-034. Without it, a summary that always showed the line would
    // pass the test above and tell every blocked respondent to look at pages that are fine.
    expect(position(harness)).toBe('Page 1 of 4');
    expect(summaryText(harness)).not.toContain(multiplePagesInvalidMessage());
    expect(summaryMessages(harness)).toHaveLength(1);
  });

  it('submits once both pages are fixed, so the block is about the answers', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(gateway);
    const [p1, , p3] = SUBJECT.pages;
    await reachPageFourWithTwoInvalidPages(harness);

    await harness.session.submit();
    await harness.settle();
    expect(gateway.calls).toEqual([]);

    harness.session.setAnswer(p1.questions[0], { kind: 'text', value: 'Dana' });
    harness.session.setAnswer(p3.questions[0], { kind: 'text', value: 'A-1' });
    await harness.settle();

    await harness.session.submit();
    await harness.settle();

    // The positive control: the viewer can submit this survey, so the four assertions
    // above are about the invalid pages and not about a Submit that never works.
    expect(gateway.calls).toHaveLength(1);
    expect(harness.session.state().kind).toBe('submitted');
  });
});
