/**
 * T052 — a valid config, the three fetch failure classes, and F16.
 *
 * F16 is the one that only exists because the loader validates against the key the
 * *manifest* served the config under rather than against the config's own `key`. An
 * implementation that trusted the config would make this class unreachable, so it is
 * asserted here rather than only in the config validator's own spec.
 */

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { brand } from '../models/branded';
import type { SurveyKey } from '../models/branded';
import type { SurveyManifestEntry } from '../models/survey-manifest.model';
import { JsonFetchService } from './json-fetch.service';
import { SurveyLoaderService } from './survey-loader.service';
import { provideSurveyTimeouts } from './survey-timeouts';
import {
  stubFetchNeverAnswers,
  stubFetchResponse,
  stubFetchTransportFailure,
} from './__fixtures__/fetch-stub';

function entry(key: string): SurveyManifestEntry {
  return {
    key: brand<SurveyKey>(key),
    title: 'Customer Feedback',
    description: null,
    config: `surveys/${key}.json`,
  };
}

const VALID_CONFIG = {
  key: 'customer-feedback',
  title: 'Customer Feedback',
  pages: [
    {
      id: 'p1',
      title: 'Only page',
      questions: [{ id: 'q_name', type: 'textbox', title: 'Your name' }],
    },
  ],
};

function loader(): SurveyLoaderService {
  TestBed.configureTestingModule({
    providers: [SurveyLoaderService, JsonFetchService, provideSurveyTimeouts()],
  });
  return TestBed.inject(SurveyLoaderService);
}

describe('SurveyLoaderService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the normalised survey for a config that satisfies its contract', async () => {
    stubFetchResponse({ status: 200, body: JSON.stringify(VALID_CONFIG) });

    const validation = await loader().load(entry('customer-feedback'));

    expect(validation.outcome).toBe('valid');
    if (validation.outcome !== 'valid') {
      throw new Error('expected valid');
    }
    expect(validation.survey.key).toBe('customer-feedback');
    expect(validation.survey.pages).toHaveLength(1);
  });

  it('maps a non-success status to F17', async () => {
    stubFetchResponse({ status: 404, body: 'not found' });

    const validation = await loader().load(entry('customer-feedback'));

    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      throw new Error('expected invalid');
    }
    expect(validation.error.scope).toBe('survey');
    expect(validation.error.subject).toBe('customer-feedback');
    expect(validation.error.issues[0].code).toBe('F17');
  });

  it('maps a transport failure to F17', async () => {
    stubFetchTransportFailure();

    const validation = await loader().load(entry('customer-feedback'));

    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      throw new Error('expected invalid');
    }
    expect(validation.error.issues[0].code).toBe('F17');
  });

  it('maps an HTML body under HTTP 200 to F18 (FR-076, US5 scenario 7)', async () => {
    stubFetchResponse({ status: 200, body: '<!doctype html><html></html>' });

    const validation = await loader().load(entry('customer-feedback'));

    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      throw new Error('expected invalid');
    }
    expect(validation.error.issues[0].code).toBe('F18');
  });

  it('maps a request still unanswered at the deadline to F19 (FR-075)', async () => {
    vi.useFakeTimers();
    stubFetchNeverAnswers();

    const pending = loader().load(entry('customer-feedback'));
    await vi.advanceTimersByTimeAsync(10_000);
    const validation = await pending;

    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      throw new Error('expected invalid');
    }
    expect(validation.error.issues[0].code).toBe('F19');
  });

  it('reports F16 when the config key differs from the key it was served under', async () => {
    stubFetchResponse({ status: 200, body: JSON.stringify(VALID_CONFIG) });

    // The manifest served this body under `product-pulse`; the body says
    // `customer-feedback`. Trusting the body would silently serve the wrong survey.
    const validation = await loader().load(entry('product-pulse'));

    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      throw new Error('expected invalid');
    }
    expect(validation.error.issues.map((issue) => issue.code)).toContain('F16');
  });
});
