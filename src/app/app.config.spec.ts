import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PrimeNG } from 'primeng/config';
import { appConfig } from './app.config';
import { routes } from './app.routes';
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
});

describe('routes', () => {
  it('starts empty — survey routes arrive with the viewer feature', () => {
    expect(routes).toEqual([]);
  });
});
