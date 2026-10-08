import { InjectionToken, Provider } from '@angular/core';

export const SURVEY_TIMEOUTS = new InjectionToken<SurveyTimeouts>('SURVEY_TIMEOUTS');

export interface SurveyTimeouts {
  fetchMs: number;
  submitMs: number;
}

export const DEFAULT_SURVEY_TIMEOUTS: SurveyTimeouts = {
  fetchMs: 10_000,
  submitMs: 15_000,
};

export function provideSurveyTimeouts(): Provider {
  return { provide: SURVEY_TIMEOUTS, useValue: DEFAULT_SURVEY_TIMEOUTS };
}
