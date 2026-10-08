import { Routes } from '@angular/router';

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
