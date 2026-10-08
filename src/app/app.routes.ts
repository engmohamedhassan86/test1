/**
 * The three routes — T081 and T087, `plan.md` §2.
 *
 * Every route is `loadComponent`, so SC-002's 1s catalog budget does not pay for the
 * survey bundle.
 *
 * `''` and `'**'` carry a static `title` because each has exactly one FR-077 title.
 * `'surveys/:surveyKey'` carries **none**: that screen has three different titles
 * depending on the survey and the state (`<title> — Survey`,
 * `<title> — Response received`, `Survey not available`), so `DocumentTitleService` sets
 * it and a static `title` here would race it.
 *
 * There is no resolver and no guard. The viewer drives `resolve` then `load` itself,
 * because the choice between the not-found screen and the configuration-error screen is
 * FR-066's and cannot be made before either screen exists.
 */

import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/catalog/catalog-page').then((m) => m.CatalogPageComponent),
    title: 'Surveys',
  },
  {
    path: 'surveys/:surveyKey',
    loadComponent: () => import('./features/survey/survey-page').then((m) => m.SurveyPageComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found-page').then((m) => m.NotFoundPageComponent),
    title: 'Survey not found',
  },
];
