import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { primeUiLicenseKey } from './primeui-license';
import { surveyViewerPreset } from './theme/survey-viewer-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      // Injected at build time; empty when no key is configured. See
      // src/app/primeui-license.ts.
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
