/**
 * T126 — the banner's region, all seven contract §4 messages, and the retry wiring.
 *
 * The seven messages are asserted **twice over**, and the second assertion is the one that
 * matters. Comparing each rendered message against `submissionFailureMessage(kind)` proves
 * the banner renders what it was handed; it does not prove the catalogue says what the
 * contract says, because both sides would be the same function. So one test pins the seven
 * sentences as literals copied from `contracts/response-submission.md` §4, and the loop
 * then compares the rendered text against the catalogue. Together they say: the contract's
 * wording is in `core`, and the banner adds nothing to it.
 *
 * The banner is mounted over a **real** `SurveySessionService`, so "Try again forwards to
 * retry" is a statement about the session advancing rather than about a spy being called. A
 * spy would pass against a button wired to a method that did nothing.
 */

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type {
  SubmissionFailure,
  SubmissionFailureKind,
  SubmissionResult,
  SurveyResponse,
} from '../../core/models/survey-response.model';
import { page, survey, textboxQuestion } from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AttachmentCodecService } from '../../core/services/attachment-codec.service';
import { IdFactoryService } from '../../core/services/id-factory.service';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from '../../core/services/survey-timeouts';
import {
  AcknowledgingSurveyResponseGateway,
  FailingSurveyResponseGateway,
} from '../../core/services/testing/failing-survey-response.gateway';
import { submissionFailureMessage } from '../../core/validators/messages';
import { SubmissionErrorBannerComponent } from './submission-error-banner';

/** Contract §4, copied by hand. The catalogue must agree with this, not the reverse. */
const CONTRACT_TEXT: Readonly<Record<SubmissionFailureKind, string>> = {
  'transport-error': 'We could not reach the server. Your answers are safe — try again.',
  timeout: 'The submission timed out. Your answers are safe — try again.',
  rejected: 'The server could not accept this response',
  'not-found': 'This survey is no longer accepting responses.',
  unauthorized:
    'This survey is not accepting responses right now. Your answers are safe — try again.',
  'server-error': 'Something went wrong at our end. Your answers are safe — try again.',
  'malformed-response': 'We could not confirm your submission. Your answers are safe — try again.',
};

const ALL_KINDS = Object.keys(CONTRACT_TEXT) as readonly SubmissionFailureKind[];

/**
 * Fails the first attempt and acknowledges every later one.
 *
 * Neither shared adapter does this: `FailingSurveyResponseGateway` always fails and
 * `AcknowledgingSurveyResponseGateway` always succeeds, so neither can produce the one
 * sequence a retry test needs — reach `submission-error`, then succeed from it. Kept local
 * because this is the only spec that needs the sequence; T125 and T128 need their own
 * shapes.
 */
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
      receipt: { submissionId: 'sub_retry', receivedAt: '2026-02-02T00:00:00.000Z' },
    });
  }
}

function failureOf(kind: SubmissionFailureKind): SubmissionFailure {
  return {
    kind,
    message: submissionFailureMessage(kind),
    // Contract §4: non-empty only for `rejected`.
    details:
      kind === 'rejected'
        ? [{ questionId: textboxQuestion({ id: 'q1' }).id, reason: 'q1 was not understood' }]
        : [],
  };
}

interface Mounted {
  readonly host: HTMLElement;
  readonly session: SurveySessionService;
  settle(): Promise<void>;
}

async function mount(
  failure: SubmissionFailure,
  gateway: SurveyResponseGateway = new AcknowledgingSurveyResponseGateway(),
): Promise<Mounted> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SubmissionErrorBannerComponent],
    providers: [
      SurveySessionService,
      AnnouncerService,
      AttachmentCodecService,
      IdFactoryService,
      { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
      { provide: SurveyResponseGateway, useValue: gateway },
    ],
  });

  const session = TestBed.inject(SurveySessionService);
  // A one-question optional survey, so a retry is a legal move and passes validation.
  session.open(survey([page('p1', 'Only', [textboxQuestion({ id: 'q1' })])]));

  const fixture = TestBed.createComponent(SubmissionErrorBannerComponent);
  fixture.componentRef.setInput('failure', failure);
  await fixture.whenStable();

  const host = fixture.nativeElement as HTMLElement;
  return {
    host,
    session,
    settle: async () => {
      await fixture.whenStable();
    },
  };
}

function messageText(host: HTMLElement): string {
  return host.querySelector('.sv-submit-error__message')?.textContent?.trim() ?? '';
}

function retryButton(host: HTMLElement): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('.sv-submit-error__retry');
  if (button === null) {
    throw new Error('expected a Try again control');
  }
  return button;
}

describe('SubmissionErrorBannerComponent', () => {
  it('renders one assertive region (FR-045)', async () => {
    const { host } = await mount(failureOf('transport-error'));

    const region = host.querySelector('.sv-submit-error');
    // `role="alert"` is the assertive mapping; both are present so the requirement is
    // readable in the DOM rather than implied by the role alone.
    expect(region?.getAttribute('role')).toBe('alert');
    expect(region?.getAttribute('aria-live')).toBe('assertive');
  });

  it("agrees with the contract's own wording for all seven kinds", () => {
    // The literals above are from `contracts/response-submission.md` §4. If this fails, the
    // catalogue drifted from the contract — not the banner from the catalogue.
    for (const kind of ALL_KINDS) {
      expect(submissionFailureMessage(kind)).toBe(CONTRACT_TEXT[kind]);
    }
    // Guards against a kind being added to the union and silently skipped here.
    expect(ALL_KINDS).toHaveLength(7);
  });

  for (const kind of ALL_KINDS) {
    it(`renders the ${kind} message verbatim`, async () => {
      const { host } = await mount(failureOf(kind));

      expect(messageText(host)).toBe(submissionFailureMessage(kind));
      expect(messageText(host)).toBe(CONTRACT_TEXT[kind]);
    });
  }

  it('offers Try again for every kind, including the three whose text does not say so', async () => {
    // `rejected`, `not-found` and `unauthorized` do not invite a retry in their wording.
    // The action is still offered, because the alternative is a dead end for a respondent
    // holding answers; the transition table refuses an illegal retry, not this button.
    for (const kind of ['rejected', 'not-found', 'unauthorized'] as const) {
      const { host } = await mount(failureOf(kind));
      expect(retryButton(host).textContent?.trim()).toBe('Try again');
    }
  });

  it('forwards Try again to retry, asserted by the session advancing', async () => {
    const mounted = await mount(failureOf('transport-error'), new FailsOnceThenAcknowledges());

    // Reach `submission-error` for real first, so `retry` is a legal transition — the
    // table refuses it from `ready`, and a test that started there would assert nothing
    // about the button.
    await mounted.session.submit();
    await mounted.settle();
    expect(mounted.session.state().kind).toBe('submission-error');

    retryButton(mounted.host).click();
    await mounted.settle();
    // Awaits the retry's own promise, which the click fired and did not return.
    await Promise.resolve();
    await mounted.settle();

    // Not a spy on `retry`: the session actually reached `submitted`, which a button wired
    // to a no-op method could not produce.
    expect(mounted.session.state().kind).toBe('submitted');
  });

  it('lists rejected details, and nothing for the six kinds that carry none', async () => {
    const rejected = await mount(failureOf('rejected'));
    expect(
      [...rejected.host.querySelectorAll('.sv-submit-error__detail')].map((element) =>
        element.textContent?.trim(),
      ),
    ).toEqual(['q1 was not understood']);

    const transport = await mount(failureOf('transport-error'));
    // No empty list element either — contract §4 makes `details` empty for the other six,
    // and an empty `<ul>` is announced as a list with no items.
    expect(transport.host.querySelector('.sv-submit-error__details')).toBeNull();
  });

  it('disables Try again while a submission is in flight (FR-039)', async () => {
    // `never-answers` leaves the session in `submitting` for the life of the assertion.
    const mounted = await mount(
      failureOf('transport-error'),
      new FailingSurveyResponseGateway('never-answers'),
    );

    void mounted.session.submit();
    await mounted.settle();

    expect(mounted.session.state().kind).toBe('submitting');
    // Without this, a second click during `submitting` would be refused silently by the
    // transition table and read to the respondent as a button that does nothing.
    expect(retryButton(mounted.host).disabled).toBe(true);
  });
});
