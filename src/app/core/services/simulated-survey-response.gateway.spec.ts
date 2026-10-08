/**
 * T062 — the default adapter always acknowledges, inside 1s, and has no failure path.
 *
 * "No failure path" is the load-bearing assertion: a failure-injection switch on the
 * default adapter is how gate 3 starts being flaky, which is exactly what FR-068 forbids.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { brand } from '../models/branded';
import type { ClientSubmissionId, SurveyKey } from '../models/branded';
import type { SurveyResponse } from '../models/survey-response.model';
import { isSubmissionReceipt } from '../validators/submission-receipt.validator';
import {
  SIMULATED_ACKNOWLEDGEMENT_DELAY_MS,
  SimulatedSurveyResponseGateway,
} from './simulated-survey-response.gateway';

const PAYLOAD: SurveyResponse = {
  surveyKey: brand<SurveyKey>('customer-feedback'),
  clientSubmissionId: brand<ClientSubmissionId>('11111111-2222-3333-4444-555555555555'),
  submittedAt: '2026-10-08T10:30:00.000Z',
  answers: [],
};

describe('SimulatedSurveyResponseGateway', () => {
  let gateway: SimulatedSurveyResponseGateway;

  beforeEach(() => {
    gateway = new SimulatedSurveyResponseGateway();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('acknowledges with a non-empty submissionId', async () => {
    const result = await gateway.submit(PAYLOAD, new AbortController().signal);

    expect(result.outcome).toBe('acknowledged');
    if (result.outcome !== 'acknowledged') {
      throw new Error('expected acknowledged');
    }
    expect(result.receipt.submissionId.length).toBeGreaterThan(0);
  });

  it('acknowledges with a receipt that satisfies isSubmissionReceipt (SC-006)', async () => {
    const result = await gateway.submit(PAYLOAD, new AbortController().signal);

    if (result.outcome !== 'acknowledged') {
      throw new Error('expected acknowledged');
    }
    // `submitted` is reachable only through this predicate, so an adapter whose receipt
    // failed it would make the confirmation screen unreachable.
    expect(isSubmissionReceipt(result.receipt)).toBe(true);
  });

  it('answers within 1s, which is contract §5s ceiling', async () => {
    vi.useFakeTimers();

    const pending = gateway.submit(PAYLOAD, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(SIMULATED_ACKNOWLEDGEMENT_DELAY_MS).toBeLessThanOrEqual(1_000);
    expect((await pending).outcome).toBe('acknowledged');
  });

  it('does not answer before its delay has elapsed', async () => {
    vi.useFakeTimers();
    let settled = false;

    void gateway.submit(PAYLOAD, new AbortController().signal).then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(SIMULATED_ACKNOWLEDGEMENT_DELAY_MS - 1);
    expect(settled).toBe(false);
  });

  it('mints a different submissionId per call, so two submissions are distinguishable', async () => {
    const first = await gateway.submit(PAYLOAD, new AbortController().signal);
    const second = await gateway.submit(PAYLOAD, new AbortController().signal);

    if (first.outcome !== 'acknowledged' || second.outcome !== 'acknowledged') {
      throw new Error('expected acknowledged');
    }
    expect(first.receipt.submissionId).not.toBe(second.receipt.submissionId);
  });

  it('resolves rather than rejecting when the caller aborts before it is called', async () => {
    const controller = new AbortController();
    controller.abort();

    // Contract §9 obligation 1: it resolves, it never rejects. A rejection would leave
    // the viewer in `submitting`, which is failing open at the worst moment.
    const result = await gateway.submit(PAYLOAD, controller.signal);

    expect(result).toEqual({
      outcome: 'failed',
      failure: {
        kind: 'timeout',
        message: 'The submission timed out. Your answers are safe — try again.',
        details: [],
      },
    });
  });

  it('honours an abort that arrives while the delay is still running', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();

    const pending = gateway.submit(PAYLOAD, controller.signal);
    await vi.advanceTimersByTimeAsync(SIMULATED_ACKNOWLEDGEMENT_DELAY_MS - 10);
    controller.abort();

    const result = await pending;
    expect(result.outcome).toBe('failed');
  });

  it('exposes no way to make it fail', () => {
    // Anything that let a test pick a failure kind here would also let a build pick one.
    const surface = Object.getOwnPropertyNames(SimulatedSurveyResponseGateway.prototype);
    expect(surface).toEqual(['constructor', 'submit']);
  });
});
