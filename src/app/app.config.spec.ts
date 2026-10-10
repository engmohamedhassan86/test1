import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PRIME_NG_CONFIG, PrimeNG } from 'primeng/config';
import { appConfig } from './app.config';
import { routes } from './app.routes';
import { SimulatedSurveyResponseGateway, SurveyResponseGateway } from './core/services';
import { SURVEY_TIMEOUTS } from './core/services/survey-timeouts';
import { primeUiLicenseKey } from './primeui-license';
import { surveyViewerPreset } from './theme/survey-viewer-preset';

/**
 * These tests exist so the application wiring is covered rather than excluded
 * from coverage: a silently dropped `providePrimeNG` or `provideRouter` would
 * otherwise only show up in a browser.
 */
describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('registers the router with the application routes', () => {
    expect(TestBed.inject(Router).config).toEqual(routes);
  });

  it('applies the maroon survey-viewer preset to PrimeNG', () => {
    const theme: unknown = TestBed.inject(PrimeNG).theme();

    expect(theme).toMatchObject({ preset: surveyViewerPreset });
  });

  it('scopes dark mode to an explicit class rather than the OS setting', () => {
    const theme: unknown = TestBed.inject(PrimeNG).theme();

    // An OS-driven dark mode would flip the brand colour without the app asking.
    expect(theme).toMatchObject({ options: { darkModeSelector: '.app-dark' } });
  });

  it('enables PrimeNG ripple', () => {
    expect(TestBed.inject(PrimeNG).ripple()).toBe(true);
  });

  it('binds the simulated gateway as the default submission adapter (T090, contract §5)', () => {
    const gateway = TestBed.inject(SurveyResponseGateway);

    // Selecting another adapter is a change to this one provider and nothing else, so the
    // assertion is that the *default* really is the simulated one — a build that shipped
    // the HTTP adapter by accident would post respondent data to an endpoint that does
    // not exist.
    expect(gateway).toBeInstanceOf(SimulatedSurveyResponseGateway);
  });

  it('provides the fetch and submit deadlines as a value (FR-075, FR-038)', () => {
    // Injected rather than read from a literal inside the services, which is what lets
    // both deadlines be asserted in milliseconds under fake timers.
    expect(TestBed.inject(SURVEY_TIMEOUTS)).toEqual({ fetchMs: 10_000, submitMs: 15_000 });
  });

  it('hands the injected PrimeUI licence key to PrimeNG', () => {
    // Without this, PrimeNG paints a red "Invalid PrimeUI License" banner over
    // every page from a closed shadow root that no stylesheet can reach.
    expect(TestBed.inject(PRIME_NG_CONFIG)).toMatchObject({ license: primeUiLicenseKey });
  });
});

describe('primeUiLicenseKey', () => {
  it('is always a string, so PrimeNG never receives an undefined licence', () => {
    // An empty key is a supported state: providePrimeNG ignores a falsy licence,
    // so the suite behaves the same before and after the key is dropped in.
    expect(typeof primeUiLicenseKey).toBe('string');
  });

  it('carries the key that `pnpm test` injected from the environment', () => {
    // Vitest is the quality gate's test command, so it is the path that must
    // substitute the build-time constant. `ng test` injects "" instead.
    expect(primeUiLicenseKey).toBe(process.env['PRIMEUI_LICENSE_KEY'] ?? '');
  });
});

describe('routes', () => {
  it('declares the catalog, the viewer and the catch-all, in that order (T081, T087)', () => {
    // Order matters: `'**'` matches anything, so a route declared after it is dead.
    expect(routes.map((route) => route.path)).toEqual(['', 'surveys/:surveyKey', '**']);
  });

  it('lazy-loads every route, so the catalog does not pay for the survey bundle (SC-002)', () => {
    expect(routes.every((route) => typeof route.loadComponent === 'function')).toBe(true);
    // An eagerly referenced component would pull the viewer into the initial chunk.
    expect(routes.some((route) => route.component !== undefined)).toBe(false);
  });

  it('resolves every lazy loader to the component the route is for', async () => {
    // `typeof === 'function'` above proves only that a loader exists. A mistyped import
    // path or a renamed export still satisfies it and then fails in the browser on
    // navigation, where nothing in the suite would have caught it. So call each one.
    const loaded = await Promise.all(
      routes.map(async (route) => {
        const loadComponent = route.loadComponent;
        if (loadComponent === undefined) {
          throw new Error(`route ${String(route.path)} has no loadComponent`);
        }
        const resolved = await loadComponent();
        return 'name' in resolved ? resolved.name : '';
      }),
    );

    expect(loaded).toEqual([
      'CatalogPageComponent',
      'SurveyPageComponent',
      'NotFoundPageComponent',
    ]);
  });

  it('gives the two single-title screens a static title (FR-077)', () => {
    expect(routes.find((route) => route.path === '')?.title).toBe('Surveys');
    expect(routes.find((route) => route.path === '**')?.title).toBe('Survey not found');
  });

  it('leaves the viewer route without a static title, because it has three (FR-077)', () => {
    // `<title> — Survey`, `<title> — Response received` and `Survey not available` all
    // belong to this one route, so `DocumentTitleService` owns it; a static title here
    // would race it on every state change.
    expect(routes.find((route) => route.path === 'surveys/:surveyKey')?.title).toBeUndefined();
  });

  it('uses no resolver and no guard on the viewer route', () => {
    const viewer = routes.find((route) => route.path === 'surveys/:surveyKey');

    // The choice between not-found and configuration-error is FR-066's, and cannot be made
    // before either screen exists — so the viewer drives resolve-then-load itself.
    expect(viewer?.resolve).toBeUndefined();
    expect(viewer?.canActivate).toBeUndefined();
  });
});

describe('component input binding', () => {
  it('binds route params to component inputs, which is how surveyKey arrives', () => {
    // Without `withComponentInputBinding()` the viewer's `input.required<string>()` would
    // never be set and the component would throw on first read.
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });

    expect(TestBed.inject(Router).componentInputBindingEnabled).toBe(true);
  });
});
