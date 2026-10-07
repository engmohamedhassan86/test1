import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { surveyViewerPreset } from './theme/survey-viewer-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
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
