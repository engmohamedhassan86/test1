/**
 * T050 — the two rules that live only in `JsonFetchService`.
 *
 * The HTML-under-200 case and the deadline case are the two the rest of the feature cannot
 * assert for itself, so they are asserted here in milliseconds under fake timers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonFetchService } from './json-fetch.service';
import {
  stubFetchNeverAnswers,
  stubFetchResponse,
  stubFetchTransportFailure,
} from './__fixtures__/fetch-stub';

const FETCH_MS = 10_000;

describe('JsonFetchService', () => {
  let service: JsonFetchService;

  beforeEach(() => {
    service = new JsonFetchService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the parsed value for a JSON body under a success status', async () => {
    stubFetchResponse({ status: 200, body: '{"surveys":[]}' });

    const result = await service.fetchJson('survey-manifest.json', FETCH_MS);

    expect(result).toEqual({ outcome: 'json', value: { surveys: [] }, status: 200 });
  });

  it('treats an HTML body under HTTP 200 as unreadable (FR-076, US4 scenario 11)', async () => {
    // The deployment's index.html, which is what a rewrite rule serves for a missing asset.
    stubFetchResponse({ status: 200, body: '<!doctype html><html><body></body></html>' });

    const result = await service.fetchJson('surveys/missing.json', FETCH_MS);

    // The body decided, not the status: a 200 is not evidence the document exists.
    expect(result).toEqual({ outcome: 'unreadable', status: 200 });
  });

  it('reports a 404 as unreadable and carries the status so F17 can be told from F18', async () => {
    stubFetchResponse({ status: 404, body: '{"error":"not found"}' });

    const result = await service.fetchJson('surveys/missing.json', FETCH_MS);

    // Parseable, but a non-success status: still unreadable.
    expect(result).toEqual({ outcome: 'unreadable', status: 404 });
  });

  it('reports a transport failure as unreadable with no status', async () => {
    stubFetchTransportFailure();

    const result = await service.fetchJson('survey-manifest.json', FETCH_MS);

    expect(result).toEqual({ outcome: 'unreadable', status: null });
  });

  it('times out at exactly fetchMs and not before (FR-075, SC-014)', async () => {
    vi.useFakeTimers();
    stubFetchNeverAnswers();

    const pending = service.fetchJson('survey-manifest.json', FETCH_MS);
    let settled: unknown = null;
    void pending.then((value) => {
      settled = value;
    });

    // One millisecond short of the deadline, the request is still in flight.
    await vi.advanceTimersByTimeAsync(FETCH_MS - 1);
    expect(settled).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ outcome: 'timeout' });
  });

  it('does not report a timeout for a request that answered before the deadline', async () => {
    vi.useFakeTimers();
    stubFetchResponse({ status: 200, body: '{"surveys":[]}' });

    const result = await service.fetchJson('survey-manifest.json', FETCH_MS);
    await vi.advanceTimersByTimeAsync(FETCH_MS * 2);

    expect(result.outcome).toBe('json');
  });
});
