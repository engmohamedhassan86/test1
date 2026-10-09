/**
 * T116 — US2 scenario 9 and SC-012: moving both ways loses nothing, and shows no error
 * for a page the respondent has not tried to leave forward.
 *
 * The walk this file needs is the opposite of T114's. T114 drives Next into an *invalid*
 * page and asserts what appears. Here every page is answered first, so the question is
 * what **survives** the walk — and the two halves of that are easy to pass separately and
 * hard to pass together:
 *
 * - **Retention.** Read back primarily through the rendered controls. A session that held
 *   every answer perfectly while the viewer re-rendered an empty input would satisfy a
 *   signal-only assertion and still lose the respondent's work on screen, which is the
 *   thing SC-012 is about. One test reads `session.answers()` as well, and only as a
 *   complement: it asserts the map is byte-for-byte what it was, which catches a walk that
 *   re-wrote an answer to an equal-looking value — invisible to the DOM assertions.
 * - **Silence.** Asserted as the *absence* of error text and of `aria-invalid` anywhere on
 *   the page, over the whole walk, rather than on the one page the walk ends on. Previous
 *   never validates, so a page re-entered backwards must come back clean even though it
 *   was validated on the way out.
 *
 * ## Why the attachment half is read from the session
 *
 * SC-012 names attachments as well as answers, and page 3's `q_evidence` carries the
 * fixture's only attachment policy. The control that renders and re-renders a held file is
 * T117–T122's, and it does not exist yet, so there is no rendered file name to read back.
 * The file is therefore attached through `session.addFiles` and read back through
 * `session.attachmentsFor`, which is where retention actually lives — the
 * `attachmentMap` sits outside the `ResponseState` variant precisely so a page change
 * cannot drop it, and that is the property under test.
 *
 * What this does **not** yet prove is that the control re-renders the name after the walk.
 * When T119's attachment control lands, `attachedNames` below should read the rendered
 * list instead of the session, and this file then covers SC-012's attachment half end to
 * end. Stated here rather than left implied, because a reader would otherwise reasonably
 * take the assertion for a DOM one like its neighbours.
 */

import { describe, expect, it } from 'vitest';

import type { Question } from '../../core/models/survey.model';
import { customerFeedbackSurvey } from '../../core/models/__fixtures__/survey-builders';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { questionWrapperId } from './questions/question-host';
import { SurveyPageComponent } from './survey-page';

const SUBJECT = customerFeedbackSurvey();

/** Page 3's textarea — the fixture's only question with an attachment policy. */
const Q_EVIDENCE: Question = SUBJECT.pages[2].questions[0];

type Harness = ViewerHarness<SurveyPageComponent>;

/** What the respondent typed, so each assertion compares against one source. */
const TYPED = {
  name: 'Dana',
  evidence: 'The parcel arrived with the seal already broken.',
  fileName: 'receipt.pdf',
} as const;

/**
 * The fourth satisfaction point, as it reads on screen and as it is stored.
 *
 * Both halves are asserted, because they are different claims and the walk could break
 * either one alone: the label is what the respondent sees come back, and `4` is what a
 * receiver would be sent. A `satisfaction` control renders its label rather than its
 * number (FR-010), so a spec that only checked for `'4'` on screen would be asserting the
 * wrong thing about a correct component.
 */
const SATISFIED_LABEL = 'Satisfied';
const SATISFIED_VALUE = 4;

async function openViewer(): Promise<Harness> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: SUBJECT },
    gateway: new AcknowledgingSurveyResponseGateway(),
  });
}

// --- driving the rendered controls ----------------------------------------------------

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
    throw new Error(
      `expected at least ${index + 1} elements matching ${selector}, found ${targets.length}`,
    );
  }
  target.click();
  await harness.settle();
}

/**
 * Narrows a selector to one question's wrapper.
 *
 * Needed because `satisfaction` and `rating` render the same `.sv-scale__point` class —
 * page 2 has ten of them — so an unscoped index would silently mean "the satisfaction
 * control" for 0-4 and "the rating control" for 5-9. Naming the question makes each
 * assertion say which control it is about.
 */
function within(questionId: string, selector: string): string {
  return `#${questionWrapperId(questionId)} ${selector}`;
}

/** The four controls this walk reads back, each named by its question rather than by index. */
const TEXT_NAME = within('q_name', 'input[type="text"]');
const RADIO_SEGMENT = within('q_segment', 'input[type="radio"]');
const CHECKBOX_LIKED = within('q_liked', 'input[type="checkbox"]');
const TEXTAREA_EVIDENCE = within('q_evidence', 'textarea');

const next = (harness: Harness): Promise<void> => clickNth(harness, '.sv-nav__button--primary', 0);
const back = (harness: Harness): Promise<void> =>
  clickNth(harness, '.sv-nav__button--secondary', 0);

// --- reading it back ------------------------------------------------------------------

function position(harness: Harness): string {
  return harness.host.querySelector('.sv-nav__position')?.textContent?.trim() ?? '';
}

/** The value a field currently renders, or `null` when the field is not on the page. */
function valueOf(harness: Harness, selector: string): string | null {
  const field = harness.host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  return field === null ? null : field.value;
}

/** The values of the checked controls matching `selector`, in rendered order. */
function checkedValues(harness: Harness, selector: string): readonly string[] {
  return [...harness.host.querySelectorAll<HTMLInputElement>(selector)]
    .filter((input) => input.checked)
    .map((input) => input.value);
}

/**
 * The point `questionId`'s scale renders as chosen, by its `aria-checked`.
 *
 * Read from the ARIA state rather than from a CSS class: `aria-checked` is what a screen
 * reader reports, so it is the one that has to survive the walk. A class could stay
 * correct while the state went stale and nobody using a reader would see the answer.
 */
function chosenScalePoint(harness: Harness, questionId: string): string | null {
  const chosen = harness.host.querySelector<HTMLElement>(
    within(questionId, '.sv-scale__point[aria-checked="true"]'),
  );
  return chosen === null ? null : (chosen.textContent?.trim() ?? '');
}

/**
 * The names of the files held against `q_evidence`.
 *
 * Reads the session, for the reason in the header comment: no control renders them yet.
 */
function attachedNames(harness: Harness): readonly string[] {
  return harness.session.attachmentsFor(Q_EVIDENCE.id).map((attachment) => attachment.name);
}

/** Every error message rendered anywhere on the page. */
function errorMessages(harness: Harness): readonly string[] {
  return [...harness.host.querySelectorAll<HTMLElement>('.sv-question__error')].map(
    (element) => element.textContent?.trim() ?? '',
  );
}

/** Every control on the page carrying an `aria-invalid` of any value. */
function invalidMarkers(harness: Harness): readonly string[] {
  return [...harness.host.querySelectorAll('[aria-invalid]')].map(
    (element) => element.getAttribute('aria-invalid') ?? '',
  );
}

/** Asserts the page shows nothing that looks like a validation failure. */
function expectNoErrorsShown(harness: Harness): void {
  expect(errorMessages(harness)).toEqual([]);
  expect(invalidMarkers(harness)).toEqual([]);
  expect(harness.host.querySelector('.sv-summary')).toBeNull();
}

// --- the walk out to page 3 -----------------------------------------------------------

/**
 * Answers pages 1 and 2 through their controls, attaches one file to page 3's question and
 * types into its textarea, then leaves the respondent standing on page 3.
 *
 * Page 1 and 2 are answered rather than skipped because Next is validated: an unanswered
 * page 1 never reaches page 2, so a retention walk has to be a valid walk.
 */
async function walkToPageThree(harness: Harness): Promise<void> {
  await type(harness, TEXT_NAME, TYPED.name);
  await clickNth(harness, RADIO_SEGMENT, 1); // `returning`
  await next(harness);

  await clickNth(harness, within('q_satisfaction', '.sv-scale__point'), 3); // 4
  await clickNth(harness, CHECKBOX_LIKED, 0); // `delivery`
  await clickNth(harness, CHECKBOX_LIKED, 2); // `support`
  await clickNth(harness, within('q_delivery', '.sv-scale__point'), 4); // rating 5
  await next(harness);

  await type(harness, TEXTAREA_EVIDENCE, TYPED.evidence);
  await harness.session.addFiles(Q_EVIDENCE, [
    new File([new Uint8Array([1, 2, 3, 4])], TYPED.fileName, { type: 'application/pdf' }),
  ]);
  await harness.settle();
}

describe('SurveyPageComponent — retention across navigation (US2 scenario 9, SC-012)', () => {
  it('keeps every answer on pages 1, 2 and 3 across Previous twice and Next twice', async () => {
    const harness = await openViewer();
    await walkToPageThree(harness);

    expect(position(harness)).toContain('3');
    expect(valueOf(harness, TEXTAREA_EVIDENCE)).toBe(TYPED.evidence);
    expect(attachedNames(harness)).toEqual([TYPED.fileName]);

    // Back to page 2, and back again to page 1.
    await back(harness);
    expect(position(harness)).toContain('2');
    expect(chosenScalePoint(harness, 'q_satisfaction')).toBe(SATISFIED_LABEL);
    expect(checkedValues(harness, CHECKBOX_LIKED)).toEqual(['delivery', 'support']);

    await back(harness);
    expect(position(harness)).toContain('1');
    expect(valueOf(harness, TEXT_NAME)).toBe(TYPED.name);
    expect(checkedValues(harness, RADIO_SEGMENT)).toEqual(['returning']);

    // Forward twice, over the same two pages.
    await next(harness);
    expect(position(harness)).toContain('2');
    expect(chosenScalePoint(harness, 'q_satisfaction')).toBe(SATISFIED_LABEL);
    expect(checkedValues(harness, CHECKBOX_LIKED)).toEqual(['delivery', 'support']);

    await next(harness);
    expect(position(harness)).toContain('3');
    expect(valueOf(harness, TEXTAREA_EVIDENCE)).toBe(TYPED.evidence);
    expect(attachedNames(harness)).toEqual([TYPED.fileName]);

    // The stored side of the satisfaction answer, which the label alone does not prove:
    // a control that rendered the right label from a stale index would pass above.
    expect(harness.session.answers().get(SUBJECT.pages[1].questions[0].id)).toEqual({
      type: 'satisfaction',
      value: SATISFIED_VALUE,
    });
  });

  it('keeps page 1 and 2 answers in the session unchanged by the whole walk', async () => {
    const harness = await openViewer();
    await walkToPageThree(harness);
    const before = new Map(harness.session.answers());

    await back(harness);
    await back(harness);
    await next(harness);
    await next(harness);

    // Not merely "page 1 and 2 still render their values" — nothing moved at all. A walk
    // that re-wrote an answer to an equal-looking value would pass the DOM assertions
    // above and fail here, and FR-026 is about the answer, not about its rendering.
    expect([...harness.session.answers().entries()]).toEqual([...before.entries()]);
  });

  it('shows no error on a page re-entered backwards, even though Next validated it', async () => {
    const harness = await openViewer();
    await walkToPageThree(harness);

    // Page 1 was validated on the way out and passed. Coming back must still be clean.
    await back(harness);
    expectNoErrorsShown(harness);
    await back(harness);
    expectNoErrorsShown(harness);
    expect(position(harness)).toContain('1');
  });

  it('shows no error for a page the respondent has not tried to leave forward', async () => {
    const harness = await openViewer();
    await walkToPageThree(harness);

    // Page 3's `q_evidence` is optional and page 4's `q_recommend` is required, so page 4
    // is an invalid page the respondent has reached but not tried to leave. SC-012 says
    // arriving there shows no error.
    await next(harness);
    expect(position(harness)).toContain('4');
    expectNoErrorsShown(harness);
  });

  it('keeps the walk silent even after a blocked Next has shown an error', async () => {
    const harness = await openViewer();
    await walkToPageThree(harness);
    await next(harness);

    // Block on page 4: `q_recommend` is required and unanswered.
    await next(harness);
    expect(position(harness)).toContain('4');
    expect(errorMessages(harness).length).toBeGreaterThan(0);

    // Stepping back off a blocked page clears the error with it. Without this the
    // respondent carries page 4's failure onto page 3, which never failed.
    await back(harness);
    expect(position(harness)).toContain('3');
    expectNoErrorsShown(harness);
    expect(valueOf(harness, TEXTAREA_EVIDENCE)).toBe(TYPED.evidence);
    expect(attachedNames(harness)).toEqual([TYPED.fileName]);
  });

  it('survives a longer walk than SC-012 asks for without losing an answer', async () => {
    const harness = await openViewer();
    await walkToPageThree(harness);

    // SC-012 says "any number of times", so two round trips rather than one: a session
    // that dropped an answer on, say, every second re-entry would pass a single pass.
    for (let round = 0; round < 3; round += 1) {
      await back(harness);
      await back(harness);
      await next(harness);
      await next(harness);
    }

    expect(position(harness)).toContain('3');
    expect(valueOf(harness, TEXTAREA_EVIDENCE)).toBe(TYPED.evidence);
    expect(attachedNames(harness)).toEqual([TYPED.fileName]);

    await back(harness);
    await back(harness);
    expect(valueOf(harness, TEXT_NAME)).toBe(TYPED.name);
    expect(checkedValues(harness, RADIO_SEGMENT)).toEqual(['returning']);
    expectNoErrorsShown(harness);
  });
});
