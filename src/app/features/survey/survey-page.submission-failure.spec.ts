/**
 * T125 — US6 scenarios 1-5 and 8, over the real four-page viewer.
 *
 * The one claim every test here is a different angle on: **no failure path reaches the
 * confirmation screen, and no failure path loses an answer.** That is Principle III, and it
 * is asserted positively each time — `app-submission-confirmation` absent, and the answers
 * still on the page — rather than inferred from the state name. A viewer that rendered the
 * right state and an empty page 4 would satisfy a state-only assertion and have lost the
 * respondent's work.
 *
 * Driven through the rendered controls, including Submit and Try again, for the same reason
 * `survey-page.end-to-end.spec.ts` gives: calling `session.submit()` would pass against a
 * Submit button that was never wired.
 *
 * Scenario 8's FR-062 case is asserted as an **absence**: a 401 renders its sentence and no
 * credential prompt, no password field and no login link. There is no authentication in
 * this application, so a 401 is a server-side condition the respondent cannot fix by
 * signing in, and inviting them to try would be worse than the plain message.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SubmissionResult, SurveyResponse } from '../../core/models/survey-response.model';
import { customerFeedbackSurvey } from '../../core/models/__fixtures__/survey-builders';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import {
  AcknowledgingSurveyResponseGateway,
  FailingSurveyResponseGateway,
} from '../../core/services/testing/failing-survey-response.gateway';
import { submissionFailureMessage } from '../../core/validators/messages';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

const SUBJECT = customerFeedbackSurvey();
/** `mountViewer`'s injected deadline, so the timeout test advances by the real figure. */
const SUBMIT_MS = 15_000;

type Harness = ViewerHarness<SurveyPageComponent>;

/** Fails the first attempt, acknowledges every later one — scenario 3's shape. */
class FailsOnceThenAcknowledges extends SurveyResponseGateway {
  readonly calls: SurveyResponse[] = [];

  override submit(response: SurveyResponse): Promise<SubmissionResult> {
    this.calls.push(response);
    if (this.calls.length === 1) {
      return Promise.resolve({
        outcome: 'failed',
        failure: {
          kind: 'transport-error',
          message: submissionFailureMessage('transport-error'),
          details: [],
        },
      });
    }
    return Promise.resolve({
      outcome: 'acknowledged',
      receipt: { submissionId: 'sub_after_retry', receivedAt: '2026-03-03T00:00:00.000Z' },
    });
  }
}

async function openViewer(gateway: SurveyResponseGateway): Promise<Harness> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: SUBJECT },
    gateway,
  });
}

// --- driving --------------------------------------------------------------------------

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

async function type(harness: Harness, selector: string, value: string): Promise<void> {
  const field = harness.host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (field === null) {
    throw new Error(`expected a field matching ${selector}`);
  }
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await harness.settle();
}

const primaryAction = (harness: Harness): Promise<void> =>
  clickNth(harness, '.sv-nav__button--primary', 0);
const back = (harness: Harness): Promise<void> =>
  clickNth(harness, '.sv-nav__button--secondary', 0);

/**
 * Clicks the primary control without settling — for use under fake timers.
 *
 * `harness.settle()` awaits a `setTimeout(…, 0)`, which the viewer's load chain needs and
 * which fake timers never fire on their own, so calling it with fake timers installed
 * deadlocks the test. The two tests that own the clock therefore click synchronously and
 * then use `settleFake` below.
 */
function clickPrimary(harness: Harness): void {
  const button = harness.host.querySelector<HTMLElement>('.sv-nav__button--primary');
  if (button === null) {
    throw new Error('expected a primary navigation control');
  }
  button.click();
}

/**
 * Re-renders under fake timers, without awaiting anything the fake clock owns.
 *
 * `fixture.whenStable()` is also unusable here: Angular's scheduler resolves it through a
 * timer, so awaiting it with fake timers installed hangs for the same reason
 * `harness.settle()` does. `advanceTimersByTimeAsync(0)` drains the pending zero-delay
 * timers *and* the microtask queue between them, and `detectChanges()` then renders
 * synchronously.
 */
async function settleFake(harness: Harness): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  harness.fixture.detectChanges();
}

const TYPED_NAME = 'Dana';

/** Answers all four pages through the controls and stops on page 4, before Submit. */
async function walkToPageFour(harness: Harness): Promise<void> {
  await type(harness, 'input[type="text"]', TYPED_NAME);
  await clickNth(harness, 'input[type="radio"]', 0);
  await primaryAction(harness);

  await clickNth(harness, '.sv-scale__point', 3);
  await clickNth(harness, 'input[type="checkbox"]', 0);
  await primaryAction(harness);

  await primaryAction(harness); // page 3's questions are all optional

  await clickNth(harness, 'input[type="radio"]', 0); // page 4's required radio
}

// --- reading --------------------------------------------------------------------------

function position(harness: Harness): string {
  return harness.host.querySelector('.sv-nav__position')?.textContent?.trim() ?? '';
}

function bannerText(harness: Harness): string | null {
  const message = harness.host.querySelector('.sv-submit-error__message');
  return message === null ? null : (message.textContent?.trim() ?? '');
}

function retryButton(harness: Harness): HTMLButtonElement | null {
  return harness.host.querySelector<HTMLButtonElement>('.sv-submit-error__retry');
}

function confirmation(harness: Harness): Element | null {
  return harness.host.querySelector('app-submission-confirmation');
}

/** Asserts Principle III's "no answer lost" half on page 4. */
function expectPageFourIntact(harness: Harness): void {
  expect(position(harness)).toBe('Page 4 of 4');
  expect(harness.host.querySelector<HTMLInputElement>('input[type="radio"]')?.checked).toBe(true);
  expect(harness.session.answers().size).toBeGreaterThan(0);
}

describe('SurveyPageComponent — submission failure (US6)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an assertive error with Try again and keeps page 4 intact (scenario 1)', async () => {
    const harness = await openViewer(new FailingSurveyResponseGateway('transport-error'));
    await walkToPageFour(harness);
    await primaryAction(harness); // Submit
    await harness.settle();

    const region = harness.host.querySelector('.sv-submit-error');
    expect(region?.getAttribute('role')).toBe('alert');
    expect(region?.getAttribute('aria-live')).toBe('assertive');
    expect(bannerText(harness)).toBe(submissionFailureMessage('transport-error'));
    expect(retryButton(harness)?.textContent?.trim()).toBe('Try again');

    // Principle III, both halves.
    expect(confirmation(harness)).toBeNull();
    expectPageFourIntact(harness);
  });

  it('leaves every answer on every page unchanged after a failure (scenario 1, SC-007)', async () => {
    const harness = await openViewer(new FailingSurveyResponseGateway('server-error'));
    await walkToPageFour(harness);

    const before = [...harness.session.answers().entries()];
    await primaryAction(harness);
    await harness.settle();

    // Not merely "page 4 still shows its answer" — the whole map is untouched. A failure
    // that cleared pages 1 to 3 would pass the per-page assertion and still have thrown
    // away most of the response.
    expect([...harness.session.answers().entries()]).toEqual(before);

    // And walking back finds them rendered, not just held.
    await back(harness);
    await back(harness);
    await back(harness);
    expect(harness.host.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe(
      TYPED_NAME,
    );
  });

  it('renders the timeout message at 15s and no confirmation (scenario 2)', async () => {
    const harness = await openViewer(new FailingSurveyResponseGateway('never-answers'));
    await walkToPageFour(harness);

    vi.useFakeTimers();
    clickPrimary(harness);
    await settleFake(harness);

    // One millisecond short of the deadline the submission is still in flight, so the
    // assertion below is about the deadline and not about any earlier failure.
    await vi.advanceTimersByTimeAsync(SUBMIT_MS - 1);
    harness.fixture.detectChanges();
    expect(harness.session.state().kind).toBe('submitting');

    await vi.advanceTimersByTimeAsync(1);
    harness.fixture.detectChanges();

    expect(harness.session.state().kind).toBe('submission-error');
    expect(bannerText(harness)).toBe(submissionFailureMessage('timeout'));
    // A boundary that never answers must never produce a confirmation, which is the whole
    // reason the caller owns the clock.
    expect(confirmation(harness)).toBeNull();
  });

  it('renders the confirmation with the returned reference after Try again (scenario 3)', async () => {
    const gateway = new FailsOnceThenAcknowledges();
    const harness = await openViewer(gateway);
    await walkToPageFour(harness);
    await primaryAction(harness);
    await harness.settle();
    expect(confirmation(harness)).toBeNull();

    const retry = retryButton(harness);
    expect(retry).not.toBeNull();
    retry?.click();
    await harness.settle();

    expect(gateway.calls).toHaveLength(2);
    expect(confirmation(harness)).not.toBeNull();
    // The reference the boundary returned, not one the viewer invented.
    expect(harness.text()).toContain('sub_after_retry');
  });

  it('clears the stale error and offers Submit again after editing an answer (scenario 4)', async () => {
    const harness = await openViewer(new FailingSurveyResponseGateway('transport-error'));
    await walkToPageFour(harness);
    await primaryAction(harness);
    await harness.settle();
    expect(bannerText(harness)).not.toBeNull();

    // Back to page 2 and change the satisfaction answer. FR-045 says Previous and Next
    // keep working from `submission-error`, so this is reachable.
    await back(harness);
    await back(harness);
    expect(position(harness)).toBe('Page 2 of 4');
    await clickNth(harness, '.sv-scale__point', 0);

    // The error is gone the moment the response is edited: it described an attempt that no
    // longer matches what is on the page, and a stale failure beside a changed answer
    // reads as though the edit had failed.
    expect(bannerText(harness)).toBeNull();

    await primaryAction(harness);
    await primaryAction(harness);
    expect(position(harness)).toBe('Page 4 of 4');
    // Submit is available again rather than permanently spent.
    expect(
      harness.host.querySelector<HTMLButtonElement>('.sv-nav__button--primary')?.disabled,
    ).toBe(false);
  });

  it('starts no second submission while the first is still in flight (scenario 5, FR-039)', async () => {
    const gateway = new FailingSurveyResponseGateway('never-answers');
    const harness = await openViewer(gateway);
    await walkToPageFour(harness);

    vi.useFakeTimers();
    clickPrimary(harness);
    await settleFake(harness);
    expect(harness.session.state().kind).toBe('submitting');

    // A second press during `submitting`. The transition table has no self-edge there, so
    // this must not reach the boundary — a duplicate response is not recoverable once sent.
    clickPrimary(harness);
    await settleFake(harness);
    expect(gateway.calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(SUBMIT_MS);
    harness.fixture.detectChanges();
    expect(gateway.calls).toHaveLength(1);
  });

  it('renders the 401 sentence with no credential prompt at all (scenario 8, FR-062)', async () => {
    const harness = await openViewer(new FailingSurveyResponseGateway('unauthorized'));
    await walkToPageFour(harness);
    await primaryAction(harness);
    await harness.settle();

    expect(bannerText(harness)).toBe(
      'This survey is not accepting responses right now. Your answers are safe — try again.',
    );

    // FR-062 as an absence. There is no authentication in this application, so a 401 is
    // not something the respondent can resolve by signing in, and offering a form would
    // invite them to hand credentials to a screen that does nothing with them.
    expect(harness.host.querySelector('input[type="password"]')).toBeNull();
    expect(harness.host.querySelector('input[type="email"]')).toBeNull();
    expect(harness.host.querySelector('form')).toBeNull();
    const text = harness.text().toLowerCase();
    expect(text).not.toContain('sign in');
    expect(text).not.toContain('log in');
    expect(text).not.toContain('password');

    // And the answers are still there, as the message promises.
    expectPageFourIntact(harness);
  });

  it('keeps answers across every failure kind, not only the transport one (SC-007)', async () => {
    for (const kind of [
      'rejected',
      'not-found',
      'unauthorized',
      'server-error',
      'malformed-response',
    ] as const) {
      const harness = await openViewer(new FailingSurveyResponseGateway(kind));
      await walkToPageFour(harness);
      await primaryAction(harness);
      await harness.settle();

      expect(bannerText(harness)).toBe(submissionFailureMessage(kind));
      expect(confirmation(harness)).toBeNull();
      expectPageFourIntact(harness);
    }
  });

  it('reaches the confirmation on a clean submission, so the above is not vacuous', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway('sub_clean'));
    await walkToPageFour(harness);
    await primaryAction(harness);
    await harness.settle();

    // The positive control. Without it, a viewer that never rendered the confirmation
    // under any circumstances would pass every assertion above.
    expect(confirmation(harness)).not.toBeNull();
    expect(bannerText(harness)).toBeNull();
  });
});
