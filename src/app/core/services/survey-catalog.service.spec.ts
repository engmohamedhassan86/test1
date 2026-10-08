/**
 * T051 — the catalog's four states, its one fetch per visit, and the FR-066 distinction
 * between `not-found` and `catalog-error`.
 *
 * The last of those is the one most likely to regress into a wrong screen, so it is
 * asserted at the survey route's entry point (`resolve`) and not only at `load`.
 */

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonFetchService } from './json-fetch.service';
import { SurveyCatalogService } from './survey-catalog.service';
import { provideSurveyTimeouts } from './survey-timeouts';
import {
  stubFetchNeverAnswers,
  stubFetchResponse,
  stubFetchSequence,
} from './__fixtures__/fetch-stub';

const TWO_SURVEYS = {
  surveys: [
    { key: 'customer-feedback', title: 'Customer Feedback', config: 'surveys/a.json' },
    { key: 'product-pulse', title: 'Product Pulse', config: 'surveys/b.json' },
  ],
};

function catalog(): SurveyCatalogService {
  TestBed.configureTestingModule({
    providers: [SurveyCatalogService, JsonFetchService, provideSurveyTimeouts()],
  });
  return TestBed.inject(SurveyCatalogService);
}

describe('SurveyCatalogService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('starts in loading before anything is asked of it', () => {
    stubFetchResponse({ status: 200, body: JSON.stringify(TWO_SURVEYS) });

    expect(catalog().state()).toEqual({ kind: 'loading' });
  });

  it('reaches ready with the entries in manifest order', async () => {
    stubFetchResponse({ status: 200, body: JSON.stringify(TWO_SURVEYS) });
    const service = catalog();

    await service.load();

    const state = service.state();
    expect(state.kind).toBe('ready');
    if (state.kind !== 'ready') {
      throw new Error('expected ready');
    }
    expect(state.entries.map((entry) => entry.key)).toEqual(['customer-feedback', 'product-pulse']);
  });

  it('reaches empty — not configuration-error — for a manifest with no surveys (FR-048)', async () => {
    stubFetchResponse({ status: 200, body: '{"surveys":[]}' });
    const service = catalog();

    await service.load();

    expect(service.state()).toEqual({ kind: 'empty' });
  });

  it('reaches configuration-error for a manifest that is not JSON under HTTP 200', async () => {
    stubFetchResponse({ status: 200, body: '<!doctype html><html></html>' });
    const service = catalog();

    await service.load();

    const state = service.state();
    expect(state.kind).toBe('configuration-error');
    if (state.kind !== 'configuration-error') {
      throw new Error('expected configuration-error');
    }
    expect(state.error.scope).toBe('manifest');
    expect(state.error.issues[0].code).toBe('F18');
  });

  it('fetches once for two resolve calls (FR-067, US4 scenario 8)', async () => {
    const { calls } = stubFetchSequence([{ status: 200, body: JSON.stringify(TWO_SURVEYS) }]);
    const service = catalog();

    // Started together, so a value-memoising implementation would issue two requests.
    const [first, second] = await Promise.all([
      service.resolve('customer-feedback'),
      service.resolve('product-pulse'),
    ]);

    expect(calls).toHaveLength(1);
    expect(first.outcome).toBe('found');
    expect(second.outcome).toBe('found');
  });

  it('resolves a listed key to its manifest entry', async () => {
    stubFetchResponse({ status: 200, body: JSON.stringify(TWO_SURVEYS) });

    const resolution = await catalog().resolve('product-pulse');

    expect(resolution).toEqual({
      outcome: 'found',
      entry: {
        key: 'product-pulse',
        title: 'Product Pulse',
        description: null,
        config: 'surveys/b.json',
      },
    });
  });

  it('resolves an absent key to not-found when the manifest was readable', async () => {
    stubFetchResponse({ status: 200, body: JSON.stringify(TWO_SURVEYS) });

    const resolution = await catalog().resolve('no-such-survey');

    expect(resolution).toEqual({ outcome: 'not-found', surveyKey: 'no-such-survey' });
  });

  it('resolves to catalog-error, never not-found, for an unreadable manifest (FR-066, US4 scenario 7)', async () => {
    stubFetchResponse({ status: 500, body: 'server error' });

    const resolution = await catalog().resolve('customer-feedback');

    // Without the manifest the key cannot be resolved either way, so reporting it as
    // unknown would be a claim the service is not in a position to make.
    expect(resolution.outcome).toBe('catalog-error');
    if (resolution.outcome !== 'catalog-error') {
      throw new Error('expected catalog-error');
    }
    expect(resolution.error.issues[0].code).toBe('F17');
  });

  it('leaves loading for configuration-error once the 10s deadline passes (US4 scenario 9)', async () => {
    vi.useFakeTimers();
    stubFetchNeverAnswers();
    const service = catalog();

    const pending = service.load();
    expect(service.state()).toEqual({ kind: 'loading' });

    await vi.advanceTimersByTimeAsync(10_000);
    await pending;

    const state = service.state();
    expect(state.kind).toBe('configuration-error');
    if (state.kind !== 'configuration-error') {
      throw new Error('expected configuration-error');
    }
    expect(state.error.issues[0].code).toBe('F19');
  });
});
