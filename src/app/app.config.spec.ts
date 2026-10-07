import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PRIME_NG_CONFIG, PrimeNG } from 'primeng/config';
import { appConfig } from './app.config';
import { routes } from './app.routes';
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
  it('starts empty — survey routes arrive with the viewer feature', () => {
    expect(routes).toEqual([]);
  });
});
