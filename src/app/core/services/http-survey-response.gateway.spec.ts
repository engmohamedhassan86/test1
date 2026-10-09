/**
 * T063 — the real adapter, against a stubbed `fetch`.
 *
 * This is the only spec in the suite that turns an **HTTP status into a
 * `SubmissionFailureKind`**. Every other submission-failure test injects the kind directly
 * through `FailingSurveyResponseGateway`, which proves what the viewer does with a kind but
 * not that the wire produces the right one. So the eight rows of
 * `contracts/response-submission.md` §11.3 are asserted here, once each (contract tests 6
 * and 12), together with the request itself (contract test 11) and the rule that the body,
 * not the status, decides an acknowledgement (contract test 5).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { brand } from '../models/branded';
import type { ClientSubmissionId, QuestionId, SurveyKey } from '../models/branded';
import type { SubmissionFailureKind, SurveyResponse } from '../models/survey-response.model';
import { submissionFailureMessage } from '../validators/messages';
import {
  stubFetchNeverAnswers,
  stubFetchRecording,
  stubFetchResponse,
  stubFetchTransportFailure,
} from './__fixtures__/fetch-stub';
import {
  HttpSurveyResponseGateway,
  SURVEY_RESPONSE_ENDPOINT,
} from './http-survey-response.gateway';

const CLIENT_SUBMISSION_ID = brand<ClientSubmissionId>('7f3c1a9e-5d42-4b18-9f06-2a1c84b6e0d3');

const PAYLOAD: SurveyResponse = {
  surveyKey: brand<SurveyKey>('customer-feedback'),
  clientSubmissionId: CLIENT_SUBMISSION_ID,
  submittedAt: '2026-10-08T10:30:00.000Z',
  answers: [
    {
      questionId: brand<QuestionId>('q_overall'),
      type: 'rating',
      value: 4,
    },
  ],
};

const RECEIPT_BODY = JSON.stringify({
  submissionId: 'sub_20261008_0001',
  receivedAt: '2026-10-08T10:30:01.411Z',
});

describe('HttpSurveyResponseGateway', () => {
  let gateway: HttpSurveyResponseGateway;

  beforeEach(() => {
    gateway = new HttpSurveyResponseGateway();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Every failure assertion below is the same shape; only the kind changes. */
  async function submitAgainst(status: number, body: string): Promise<SubmissionFailureKind> {
    stubFetchResponse({ status, body });
    const result = await gateway.submit(PAYLOAD, new AbortController().signal);
    if (result.outcome !== 'failed') {
      throw new Error(`expected a failure for HTTP ${status}, got ${result.outcome}`);
    }
    return result.failure.kind;
  }

  async function expectKind(status: number, kind: SubmissionFailureKind): Promise<void> {
    expect(await submitAgainst(status, '{}')).toBe(kind);
  }

  // --- the request: contract test 11 -------------------------------------------------

  describe('the request it sends', () => {
    it('sends Idempotency-Key equal to clientSubmissionId and no Authorization header (contract test 11)', async () => {
      const stub = stubFetchRecording({ status: 200, body: RECEIPT_BODY });

      await gateway.submit(PAYLOAD, new AbortController().signal);

      expect(stub.requests).toHaveLength(1);
      // Asserted as the whole header set, which is what makes "no `Authorization`" a real
      // assertion: an extra credential header would fail this equality (FR-062).
      expect(stub.requests[0]?.init?.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': CLIENT_SUBMISSION_ID,
      });
      // Said again by name, so the reason this test exists survives a future edit that
      // relaxes the equality above.
      expect(JSON.stringify(stub.requests[0]?.init?.headers)).not.toContain('Authorization');
    });

    it('sends no cookie either, because the endpoint is anonymous (FR-062)', async () => {
      const stub = stubFetchRecording({ status: 200, body: RECEIPT_BODY });

      await gateway.submit(PAYLOAD, new AbortController().signal);

      // `credentials` left at its default would attach a same-origin session cookie to a
      // request that must carry no respondent identity at all.
      expect(stub.requests[0]?.init?.credentials).toBe('omit');
    });

    it('POSTs the payload verbatim to /api/survey-responses with no envelope (contract §11.1)', async () => {
      const stub = stubFetchRecording({ status: 200, body: RECEIPT_BODY });

      await gateway.submit(PAYLOAD, new AbortController().signal);

      expect(stub.requests[0]?.url).toBe(SURVEY_RESPONSE_ENDPOINT);
      expect(stub.requests[0]?.init?.method).toBe('POST');
      expect(stub.requests[0]?.init?.body).toBe(JSON.stringify(PAYLOAD));
      // Round-tripped so the assertion is about the document, not about key order.
      expect(JSON.parse(String(stub.requests[0]?.init?.body))).toEqual(PAYLOAD);
    });

    it('passes the caller the signal, so the caller keeps the 15s clock (contract §9)', async () => {
      const stub = stubFetchRecording({ status: 200, body: RECEIPT_BODY });
      const controller = new AbortController();

      await gateway.submit(PAYLOAD, controller.signal);

      expect(stub.requests[0]?.init?.signal).toBe(controller.signal);
    });
  });

  // --- acknowledgement: contract §11.2 ----------------------------------------------

  describe('an acknowledgement', () => {
    it('reads a 200 whose body satisfies §9.1 as acknowledged', async () => {
      stubFetchResponse({ status: 200, body: RECEIPT_BODY });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      expect(result).toEqual({
        outcome: 'acknowledged',
        receipt: { submissionId: 'sub_20261008_0001', receivedAt: '2026-10-08T10:30:01.411Z' },
      });
    });

    it('reads a 201 the same way as a 200', async () => {
      stubFetchResponse({ status: 201, body: RECEIPT_BODY });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      expect(result.outcome).toBe('acknowledged');
    });

    it('drops a receiver extra key rather than passing it to the confirmation screen', async () => {
      stubFetchResponse({
        status: 200,
        body: JSON.stringify({
          submissionId: 'sub_1',
          receivedAt: '2026-10-08T10:30:01.411Z',
          internalQueueId: 'leak',
        }),
      });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      if (result.outcome !== 'acknowledged') {
        throw new Error('expected acknowledged');
      }
      expect(result.receipt).toEqual({
        submissionId: 'sub_1',
        receivedAt: '2026-10-08T10:30:01.411Z',
      });
    });
  });

  // --- the body decides: contract test 5 --------------------------------------------

  describe('a 2xx whose body is not a receipt', () => {
    it('maps a 200 body missing submissionId to malformed-response (contract test 5)', async () => {
      expect(
        await submitAgainst(200, JSON.stringify({ receivedAt: '2026-10-08T10:30:01.411Z' })),
      ).toBe('malformed-response');
    });

    it('maps a 200 body missing receivedAt to malformed-response', async () => {
      expect(await submitAgainst(200, JSON.stringify({ submissionId: 'sub_1' }))).toBe(
        'malformed-response',
      );
    });

    it('maps a 200 with an empty submissionId to malformed-response', async () => {
      expect(
        await submitAgainst(
          200,
          JSON.stringify({ submissionId: '', receivedAt: '2026-10-08T10:30:01.411Z' }),
        ),
      ).toBe('malformed-response');
    });

    it('maps an empty 200 body to malformed-response', async () => {
      expect(await submitAgainst(200, '')).toBe('malformed-response');
    });

    it('maps an HTML body under a 201 — a deployment index fallback — to malformed-response', async () => {
      expect(await submitAgainst(201, '<!doctype html><html><body>OK</body></html>')).toBe(
        'malformed-response',
      );
    });

    it('carries the §4 malformed-response message, so the respondent is told answers are safe', async () => {
      stubFetchResponse({ status: 200, body: '{}' });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      expect(result).toEqual({
        outcome: 'failed',
        failure: {
          kind: 'malformed-response',
          message: 'We could not confirm your submission. Your answers are safe — try again.',
          details: [],
        },
      });
    });
  });

  // --- the §11.3 status mapping: contract tests 6 and 12 ----------------------------

  describe('the §11.3 status mapping', () => {
    it('maps 400 to rejected', async () => {
      await expectKind(400, 'rejected');
    });

    it('maps 422 to rejected', async () => {
      await expectKind(422, 'rejected');
    });

    it('maps 401 to unauthorized with §4s exact text and no credential prompt (contract test 12)', async () => {
      const stub = stubFetchRecording({ status: 401, body: '{"error":"unauthorized"}' });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      // An ordinary `submission-error`, with the §4 wording verbatim.
      expect(result).toEqual({
        outcome: 'failed',
        failure: {
          kind: 'unauthorized',
          message:
            'This survey is not accepting responses right now. Your answers are safe — try again.',
          details: [],
        },
      });
      // "No credential prompt" at this layer means the adapter does not answer a 401 by
      // retrying with a credential: the endpoint is anonymous, so one unauthenticated
      // attempt is all there ever is (FR-062). Whether the *viewer* shows a login screen is
      // asserted in the submission-error component specs.
      expect(stub.requests).toHaveLength(1);
      expect(JSON.stringify(stub.requests[0]?.init?.headers)).not.toContain('Authorization');
    });

    it('maps 403 to unauthorized', async () => {
      await expectKind(403, 'unauthorized');
    });

    it('maps 404 to not-found', async () => {
      await expectKind(404, 'not-found');
    });

    it('maps 500 to server-error', async () => {
      await expectKind(500, 'server-error');
    });

    it('maps 503 to server-error, so every 5xx row is the same answer', async () => {
      await expectKind(503, 'server-error');
    });

    it('fails closed on an unmapped status: 301 is server-error, never an acknowledgement', async () => {
      await expectKind(301, 'server-error');
    });

    it('fails closed on 418', async () => {
      await expectKind(418, 'server-error');
    });

    it('fails closed on 429, because this feature has no retry-after behaviour', async () => {
      // "Try again" is the retry, so a rate limit is an ordinary server-side failure here.
      await expectKind(429, 'server-error');
    });

    it('maps a fetch that threw to transport-error', async () => {
      stubFetchTransportFailure();

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      expect(result).toEqual({
        outcome: 'failed',
        failure: {
          kind: 'transport-error',
          message: 'We could not reach the server. Your answers are safe — try again.',
          details: [],
        },
      });
    });

    it('maps the callers abort to timeout rather than to a transport failure it did not see', async () => {
      stubFetchNeverAnswers();
      const controller = new AbortController();

      const pending = gateway.submit(PAYLOAD, controller.signal);
      controller.abort();

      expect(await pending).toEqual({
        outcome: 'failed',
        failure: {
          kind: 'timeout',
          message: 'The submission timed out. Your answers are safe — try again.',
          details: [],
        },
      });
    });

    it('resolves rather than rejecting when the signal is already aborted (contract §9 obligation 1)', async () => {
      stubFetchNeverAnswers();
      const controller = new AbortController();
      controller.abort();

      const result = await gateway.submit(PAYLOAD, controller.signal);

      expect(result.outcome).toBe('failed');
    });

    it('gives every kind it produces the message §4 fixes for that kind', async () => {
      // Guards against a message composed at the call site, which §9 forbids.
      for (const [status, kind] of [
        [400, 'rejected'],
        [401, 'unauthorized'],
        [404, 'not-found'],
        [500, 'server-error'],
      ] as readonly (readonly [number, SubmissionFailureKind])[]) {
        stubFetchResponse({ status, body: '{}' });
        const result = await gateway.submit(PAYLOAD, new AbortController().signal);
        if (result.outcome !== 'failed') {
          throw new Error(`expected a failure for HTTP ${status}`);
        }
        expect(result.failure.message).toBe(submissionFailureMessage(kind));
      }
    });
  });

  // --- rejected details: contract §11.3 last paragraph ------------------------------

  describe('the details of a rejected response', () => {
    it('reads each well-formed details entry', async () => {
      stubFetchResponse({
        status: 422,
        body: JSON.stringify({
          details: [
            { questionId: 'q_liked', reason: 'Select at least 1 option' },
            { questionId: 'q_overall', reason: 'Out of range' },
          ],
        }),
      });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      if (result.outcome !== 'failed') {
        throw new Error('expected a failure');
      }
      expect(result.failure).toEqual({
        kind: 'rejected',
        message: 'The server could not accept this response',
        details: [
          { questionId: 'q_liked', reason: 'Select at least 1 option' },
          { questionId: 'q_overall', reason: 'Out of range' },
        ],
      });
    });

    it('downgrades a malformed details array to an empty list, keeping the kind', async () => {
      // The failure is already classified correctly; the detail is decoration, so a bad
      // `details` must not turn a `rejected` into a `malformed-response`.
      stubFetchResponse({ status: 400, body: JSON.stringify({ details: 'nope' }) });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      if (result.outcome !== 'failed') {
        throw new Error('expected a failure');
      }
      expect(result.failure.kind).toBe('rejected');
      expect(result.failure.details).toEqual([]);
    });

    it('drops only the entries that are malformed', async () => {
      stubFetchResponse({
        status: 400,
        body: JSON.stringify({
          details: [
            'not an object',
            { reason: 'no question id' },
            { questionId: 'q_liked' },
            { questionId: '   ', reason: 'blank question id' },
            { questionId: 'q_email', reason: '  ' },
            { questionId: 'q_liked', reason: 'Select at least 1 option' },
          ],
        }),
      });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      if (result.outcome !== 'failed') {
        throw new Error('expected a failure');
      }
      expect(result.failure.details).toEqual([
        { questionId: 'q_liked', reason: 'Select at least 1 option' },
      ]);
    });

    it('reports no details when the body is not an object at all', async () => {
      stubFetchResponse({ status: 400, body: '[]' });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      if (result.outcome !== 'failed') {
        throw new Error('expected a failure');
      }
      expect(result.failure.details).toEqual([]);
    });

    it('leaves details empty for a kind that is not rejected, even when the body carries them', async () => {
      // Contract §4: `details` is empty unless the kind is `rejected`.
      stubFetchResponse({
        status: 500,
        body: JSON.stringify({ details: [{ questionId: 'q_liked', reason: 'ignored' }] }),
      });

      const result = await gateway.submit(PAYLOAD, new AbortController().signal);

      if (result.outcome !== 'failed') {
        throw new Error('expected a failure');
      }
      expect(result.failure.details).toEqual([]);
    });
  });
});
