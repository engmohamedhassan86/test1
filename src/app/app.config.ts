/**
 * Application providers — T082 and T090.
 *
 * `withComponentInputBinding()` is what makes `surveys/:surveyKey` arrive at
 * `SurveyPageComponent` as a routed `input()` rather than through an injected
 * `ActivatedRoute` subscription.
 *
 * `SURVEY_TIMEOUTS` is provided here as a value rather than read from a literal inside the
 * services, which is what lets the fetch deadline (FR-075) and the submission deadline
 * (FR-038) be asserted under fake timers in milliseconds.
 *
 * The simulated gateway is the **default** adapter (contract §5). Selecting another one is
 * a change to this line and to nothing else — no survey, validation or navigation
 * behaviour depends on which adapter is bound.
 */

import { provideBrowserGlobalErrorListeners } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import {
  provideSurveyTimeouts,
  SimulatedSurveyResponseGateway,
  SurveyResponseGateway,
} from './core/services';
import { primeUiLicenseKey } from './primeui-license';
import { surveyViewerPreset } from './theme/survey-viewer-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideSurveyTimeouts(),
    { provide: SurveyResponseGateway, useClass: SimulatedSurveyResponseGateway },
    providePrimeNG({
      // Empty until the key is dropped in; see src/app/primeui-license.ts.
      license: primeUiLicenseKey,
      theme: {
        preset: surveyViewerPreset,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
      ripple: true,
    }),
  ],
};
