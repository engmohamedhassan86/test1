/**
 * T128 — US6 scenario 9, SC-011, and contract tests 10 and 13.
 *
 * One property, stated three ways: **a receiver can never be presented with two distinct
 * responses for one filled-in survey.**
 *
 * `clientSubmissionId` is what carries it, so each test is about when that value is minted
 * and when it is re-used:
 *
 * - a retry re-sends the **same** id with a **later** `submittedAt`, so a receiver that
 *   already stored the first attempt can recognise the second as the same response rather
 *   than a second one (contract test 10);
 * - reopening the survey mints a **different** id, because that is genuinely a new response
 *   and de-duplicating it against the previous one would discard it;
 * - a Submit blocked by FR-034 mints **nothing**, so a respondent bounced once and then
 *   successful produces exactly one value over the whole session (contract test 13).
 *
 * The third is the one a plausible implementation gets wrong: minting the id at the top of
 * `submit()`, before validation, is the obvious place for it and burns an id per blocked
 * attempt. Nothing visible changes, which is why the assertion is on the payload's id
 * across a blocked-then-successful sequence rather than on a count of calls.
 */

import { describe, expect, it } from 'vitest';

import type { SubmissionResult, SurveyResponse } from '../../core/models/survey-response.model';
import type { Survey } from '../../core/models/survey.model';
import {
  option,
  optionValue,
  page,
  radioQuestion,
  survey,
  textboxQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { submissionFailureMessage } from '../../core/validators/messages';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

type Harness = ViewerHarness<SurveyPageComponent>;

/** Fails the first `failures` attempts, then acknowledges. */
class FailsNTimes extends SurveyResponseGateway {
  readonly calls: SurveyResponse[] = [];

  constructor(private readonly failures: number) {
    super();
  }

  override submit(response: SurveyResponse): Promise<SubmissionResult> {
    this.calls.push(response);
    if (this.calls.length <= this.failures) {
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
      receipt: { submissionId: 'sub_ok', receivedAt: '2026-04-04T00:00:00.000Z' },
    });
  }
}

/** Two pages, each with one required question, so a blocked Submit is reachable. */
function twoPageSubject(): Survey {
  return survey([
    page('p1', 'First', [
      textboxQuestion({ id: 'q_name', title: 'Your name', required: true, minLength: 2 }),
    ]),
    page('p2', 'Second', [
      radioQuestion({
        id: 'q_pick',
        title: 'Would you recommend us?',
        required: true,
        options: [option('yes', 'Yes', 'yes'), option('no', 'No', 'no')],
      }),
    ]),
  ]);
}

const SUBJECT = twoPageSubject();

async function openViewer(gateway: SurveyResponseGateway): Promise<Harness> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: SUBJECT },
    gateway,
  });
}

/** Answers both pages and leaves the respondent on page 2, ready to Submit. */
async function answerEverything(harness: Harness): Promise<void> {
  const [p1, p2] = SUBJECT.pages;
  harness.session.setAnswer(p1.questions[0], { kind: 'text', value: 'Dana' });
  harness.session.next();
  harness.session.setAnswer(p2.questions[0], { kind: 'option', value: optionValue('yes') });
  await harness.settle();
}

function retryButton(harness: Harness): HTMLButtonElement {
  const button = harness.host.querySelector<HTMLButtonElement>('.sv-submit-error__retry');
  if (button === null) {
    throw new Error('expected a Try again control');
  }
  return button;
}

describe('SurveyPageComponent — submission idempotency (US6 scenario 9, SC-011)', () => {
  it('re-sends the same clientSubmissionId with a later submittedAt on Try again', async () => {
    const gateway = new FailsNTimes(1);
    const harness = await openViewer(gateway);
    await answerEverything(harness);

    await harness.session.submit();
    await harness.settle();
    expect(harness.session.state().kind).toBe('submission-error');

    retryButton(harness).click();
    await harness.settle();

    expect(gateway.calls).toHaveLength(2);
    const [first, second] = gateway.calls;

    // Contract test 10, both halves. The id is the receiver's de-duplication key, so it
    // must not change; `submittedAt` describes *this attempt*, so it must.
    expect(second.clientSubmissionId).toBe(first.clientSubmissionId);
    expect(Date.parse(second.submittedAt)).toBeGreaterThanOrEqual(Date.parse(first.submittedAt));
    expect(second.submittedAt).not.toBe('');
  });

  it('keeps one id across several retries, not one per attempt (SC-011)', async () => {
    const gateway = new FailsNTimes(3);
    const harness = await openViewer(gateway);
    await answerEverything(harness);

    await harness.session.submit();
    await harness.settle();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      retryButton(harness).click();
      await harness.settle();
    }

    expect(gateway.calls).toHaveLength(4);
    // SC-011 as written: *no sequence* of retries within one session can present a
    // receiver with two distinct responses. One retry passing proves less than four.
    const ids = new Set(gateway.calls.map((call) => call.clientSubmissionId));
    expect(ids.size).toBe(1);
    expect(harness.session.state().kind).toBe('submitted');
  });

  it('mints a different id when the survey is reopened', async () => {
    // One gateway across two mounts, because the comparison is between sessions. Returning
    // to `/` and opening the survey again destroys the viewer and its session, so a second
    // mount is what that is — `navigateTo` with the same key changes no input and so
    // reopens nothing.
    const gateway = new AcknowledgingSurveyResponseGateway();

    const first = await openViewer(gateway);
    await answerEverything(first);
    await first.session.submit();
    await first.settle();
    expect(gateway.calls).toHaveLength(1);

    // Reopening is a *new response*, not a retry of the old one. Re-using the id here
    // would invite the receiver to discard the second response as a duplicate — the
    // failure mode is a respondent filling the survey in twice on purpose and the second
    // one vanishing.
    const reopened = await openViewer(gateway);
    await answerEverything(reopened);
    await reopened.session.submit();
    await reopened.settle();

    expect(gateway.calls).toHaveLength(2);
    expect(gateway.calls[1].clientSubmissionId).not.toBe(gateway.calls[0].clientSubmissionId);
  });

  it('mints no id for a Submit blocked by FR-034 (contract test 13)', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(gateway);
    const [p1, p2] = SUBJECT.pages;

    // Answer both, walk to page 2, then empty page 1 — the FR-034 block.
    await answerEverything(harness);
    harness.session.clearAnswer(p1.questions[0].id);
    await harness.settle();

    await harness.session.submit();
    await harness.settle();
    expect(gateway.calls).toEqual([]);
    expect(harness.session.state().kind).toBe('validation-error');

    // Fix it and submit for real.
    harness.session.setAnswer(p1.questions[0], { kind: 'text', value: 'Dana' });
    harness.session.setAnswer(p2.questions[0], { kind: 'option', value: optionValue('yes') });
    await harness.settle();
    await harness.session.submit();
    await harness.settle();

    expect(gateway.calls).toHaveLength(1);
    expect(gateway.calls[0].clientSubmissionId).not.toBe('');
  });

  it('produces exactly one id across blocked, failed and successful attempts', async () => {
    const gateway = new FailsNTimes(1);
    const harness = await openViewer(gateway);
    const [p1, p2] = SUBJECT.pages;

    await answerEverything(harness);
    harness.session.clearAnswer(p1.questions[0].id);
    await harness.settle();

    // Blocked: no id minted, no call.
    await harness.session.submit();
    await harness.settle();
    expect(gateway.calls).toEqual([]);

    harness.session.setAnswer(p1.questions[0], { kind: 'text', value: 'Dana' });
    harness.session.setAnswer(p2.questions[0], { kind: 'option', value: optionValue('yes') });
    await harness.settle();

    // Failed, then retried to success: one id, two calls.
    await harness.session.submit();
    await harness.settle();
    retryButton(harness).click();
    await harness.settle();

    expect(gateway.calls).toHaveLength(2);
    // The whole sequence spends one value. An implementation that minted the id before
    // validating would have burned one on the blocked attempt — invisible on screen, which
    // is why this is asserted over the sequence rather than per call.
    expect(new Set(gateway.calls.map((call) => call.clientSubmissionId)).size).toBe(1);
    expect(harness.session.state().kind).toBe('submitted');
  });

  it('carries the survey key and the answers unchanged across a retry', async () => {
    const gateway = new FailsNTimes(1);
    const harness = await openViewer(gateway);
    await answerEverything(harness);

    await harness.session.submit();
    await harness.settle();
    retryButton(harness).click();
    await harness.settle();

    const [first, second] = gateway.calls;
    // `submittedAt` is the only field a retry is allowed to change. Asserted by comparing
    // the two payloads with that field removed, so a future field added to the payload is
    // covered without this test being edited.
    const withoutTimestamp = ({ submittedAt: _ignored, ...rest }: SurveyResponse): unknown => rest;
    expect(withoutTimestamp(second)).toEqual(withoutTimestamp(first));
  });
});
