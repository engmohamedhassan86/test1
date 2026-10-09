/**
 * T083 — FR-074's four catalog states, plus the two assertions PRI-19 and PRI-22 recorded
 * as S9 exit criteria. This file previously held a single `should create` stub.
 *
 * **US4.2 is a routed test, not a navigation spy.** It mounts the real shell over the real
 * route table and activates the `Customer Feedback` link, then asserts *both* halves in one
 * test: the URL becomes `/surveys/customer-feedback` **and** page 1 of that survey renders.
 * A spy on `Router.navigate` would prove the click was wired and nothing at all about the
 * render, which is the half that actually breaks — the viewer has to resolve the key
 * against the manifest and then load and validate the config before anything appears.
 *
 * **US4.9 is a deadline test on the rendered screen.** A manifest request that never
 * answers has to leave `loading` for the **configuration-error screen** once FR-075's
 * deadline passes. `T050` covers the `json-fetch` `timeout` outcome in isolation and `T051`
 * covers an *unreadable* manifest; neither says what the catalog screen does when the
 * request simply never comes back, which is the state a real broken deployment produces.
 *
 * `fetch` is stubbed by URL rather than by call order, so the manifest and the config
 * cannot silently swap places.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../app';
import { routes } from '../../app.routes';
import { provideSurveyTimeouts } from '../../core/services';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import { SURVEY_TIMEOUTS } from '../../core/services/survey-timeouts';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import {
  stubFetchByUrl,
  stubFetchJson,
  stubFetchNeverAnswers,
  stubFetchResponse,
} from '../../core/services/__fixtures__/fetch-stub';
import { CatalogPageComponent } from './catalog-page';

const FETCH_MS = 10_000;

const MANIFEST = {
  surveys: [
    {
      key: 'customer-feedback',
      title: 'Customer Feedback',
      description: 'Four short pages about your recent order.',
      config: 'surveys/customer-feedback.json',
    },
    {
      // `description` omitted rather than null, which is how the contract spells
      // "absent" — and the case the "only one description renders" assertion needs.
      key: 'product-pulse',
      title: 'Product Pulse',
      config: 'surveys/product-pulse.json',
    },
  ],
};

/** The smallest config that validates, served under `customer-feedback`. */
const CUSTOMER_FEEDBACK_CONFIG = {
  key: 'customer-feedback',
  title: 'Customer Feedback',
  pages: [
    {
      id: 'about-you',
      title: 'About You',
      questions: [
        { id: 'q_name', type: 'textbox', title: 'What should we call you?', required: true },
      ],
    },
  ],
};

function providers() {
  return [
    provideSurveyTimeouts(),
    { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
  ];
}

/** Mounts the catalog screen alone, for the state assertions. */
async function mountCatalog() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CatalogPageComponent],
    providers: [provideRouter([]), ...providers()],
  });

  const fixture = TestBed.createComponent(CatalogPageComponent);
  await settle(fixture);

  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, text: () => host.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

/**
 * Yields the macrotask queue and re-renders, several times over.
 *
 * Following a catalog link runs **two** sequential fetches — the manifest, then the survey
 * config — each awaited inside an effect that the Angular scheduler does not track. One
 * turn of the queue settles the first; the viewer would still be `loading` when the
 * assertion ran.
 */
async function settle(fixture: { whenStable: () => Promise<unknown> }): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    await fixture.whenStable();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('CatalogPageComponent — the four states (FR-074)', () => {
  it('lists every survey in the manifest, each as a link to its own route (ready)', async () => {
    stubFetchJson(MANIFEST);

    const harness = await mountCatalog();

    const links = [...harness.host.querySelectorAll<HTMLAnchorElement>('.sv-catalog__link')];
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Customer Feedback',
      'Product Pulse',
    ]);
    // FR-049: a real route, so the link works with the keyboard and in a new tab.
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/surveys/customer-feedback',
      '/surveys/product-pulse',
    ]);
  });

  it('renders a description only for the entry that has one', async () => {
    stubFetchJson(MANIFEST);

    const harness = await mountCatalog();

    // Two entries, one description — an empty paragraph for the other would reserve a line.
    expect(harness.host.querySelectorAll('.sv-catalog__description')).toHaveLength(1);
  });

  it('states that there are no surveys without calling it an error (empty, FR-048)', async () => {
    stubFetchJson({ surveys: [] });

    const harness = await mountCatalog();

    expect(harness.host.querySelector('.sv-catalog__status')).not.toBeNull();
    // `"surveys": []` is a valid manifest, so this must not be the error screen.
    expect(harness.host.querySelector('app-configuration-error')).toBeNull();
    expect(harness.host.querySelectorAll('.sv-catalog__link')).toHaveLength(0);
  });

  it('renders the configuration-error screen for an unreadable manifest (FR-044)', async () => {
    // The deployment's index.html, which is what a rewrite serves for a missing asset.
    stubFetchResponse({ status: 200, body: '<!doctype html><html></html>' });

    const harness = await mountCatalog();

    expect(harness.host.querySelector('app-configuration-error')).not.toBeNull();
    // Every issue named — not an empty list and not a retry button.
    expect(harness.host.querySelectorAll('.sv-config-error__issues li').length).toBeGreaterThan(0);
    expect(harness.host.querySelectorAll('button')).toHaveLength(0);
    expect(harness.host.querySelectorAll('.sv-catalog__link')).toHaveLength(0);
  });

  it('announces the wait politely while the request is in flight (US4 scenario 10)', async () => {
    stubFetchNeverAnswers();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [provideRouter([]), ...providers()],
    });
    const fixture = TestBed.createComponent(CatalogPageComponent);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const status = host.querySelector('.sv-catalog__status');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('Loading');
  });

  it('sets the catalog document title (FR-077)', async () => {
    stubFetchJson(MANIFEST);

    await mountCatalog();

    expect(document.title).toBe('Surveys');
  });

  it('starts no second request on a second visit in the same page load (FR-067, US4 scenario 8)', async () => {
    const { calls } = stubFetchByUrl({ 'survey-manifest.json': MANIFEST });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [provideRouter([]), ...providers()],
    });

    const first = TestBed.createComponent(CatalogPageComponent);
    await settle(first);
    // A second screen over the *same* injector, which is what returning to `/` is.
    const second = TestBed.createComponent(CatalogPageComponent);
    await settle(second);

    expect(calls).toEqual(['survey-manifest.json']);
  });
});

describe('CatalogPageComponent — US4.9, a manifest that never answers', () => {
  it('leaves loading for the configuration-error screen once the deadline passes (FR-075)', async () => {
    vi.useFakeTimers();
    stubFetchNeverAnswers();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [
        provideRouter([]),
        { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: FETCH_MS, submitMs: 15_000 } },
        { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
      ],
    });

    const fixture = TestBed.createComponent(CatalogPageComponent);
    // `whenStable` is avoided throughout this test: it waits on timers that
    // `useFakeTimers` has replaced, so awaiting it here hangs until the test times out.
    // `advanceTimersByTimeAsync` flushes the microtask queue as it goes, and
    // `detectChanges` is the render.
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // Before the deadline the screen is still waiting, not yet an error.
    expect(host.querySelector('.sv-catalog__status')?.getAttribute('role')).toBe('status');
    expect(host.querySelector('app-configuration-error')).toBeNull();

    await vi.advanceTimersByTimeAsync(FETCH_MS + 1);
    fixture.detectChanges();

    // The rendered screen, not merely the fetch outcome: an unanswered request is a
    // configuration failure the author has to be told about.
    expect(host.querySelector('app-configuration-error')).not.toBeNull();
    expect(host.querySelector('.sv-catalog__status')).toBeNull();
    expect(host.querySelectorAll('.sv-catalog__link')).toHaveLength(0);
    // F19 is the deadline class.
    expect(host.textContent).toContain('F19');
  });
});

describe('CatalogPageComponent — US4.2, following a catalog link', () => {
  it('puts the URL at /surveys/customer-feedback and renders page 1 of that survey', async () => {
    stubFetchByUrl({
      'survey-manifest.json': MANIFEST,
      'surveys/customer-feedback.json': CUSTOMER_FEEDBACK_CONFIG,
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes, withComponentInputBinding()), ...providers()],
    });

    const harness = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await settle(harness);

    const host = harness.nativeElement as HTMLElement;
    const link = [...host.querySelectorAll<HTMLAnchorElement>('.sv-catalog__link')].find(
      (candidate) => candidate.textContent?.trim() === 'Customer Feedback',
    );
    if (link === undefined) {
      throw new Error('expected a Customer Feedback link on the catalog');
    }

    link.click();
    await settle(harness);

    // Both halves, in the same test. The URL alone would pass against a viewer that
    // rendered nothing; the render alone would pass against a click handler that never
    // navigated.
    expect(router.url).toBe('/surveys/customer-feedback');
    expect(host.querySelector('.sv-survey__title')?.textContent?.trim()).toBe('Customer Feedback');
    expect(host.querySelector('.sv-page__title')?.textContent?.trim()).toBe('About You');
    expect(host.textContent).toContain('What should we call you?');
    expect(host.querySelector('.sv-nav__position')?.textContent?.trim()).toBe('Page 1 of 1');
  });

  it('renders the not-found screen for a key the manifest does not hold (FR-050)', async () => {
    stubFetchByUrl({ 'survey-manifest.json': MANIFEST });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes, withComponentInputBinding()), ...providers()],
    });

    const harness = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/surveys/no-such-survey');
    await settle(harness);

    const host = harness.nativeElement as HTMLElement;
    expect(host.querySelector('app-not-found-page')).not.toBeNull();
    expect(host.textContent).toContain('no-such-survey');
    expect(host.querySelector('app-configuration-error')).toBeNull();
  });
});
