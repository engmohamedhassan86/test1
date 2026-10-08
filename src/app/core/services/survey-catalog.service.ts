import { inject, Injectable, signal } from '@angular/core';

import {
  SurveyManifestEntry,
  SurveyManifest,
  CatalogState,
  SurveyKeyResolution,
} from '../models/survey-manifest.model';
import { SurveyValidation } from '../models/survey-config-error.model';

import { JsonFetchService } from './json-fetch.service';
import { validateSurveyManifest } from '../validators/survey-manifest.validator';

@Injectable({ providedIn: 'root' })
export class SurveyCatalogService {
  private readonly jsonFetch = inject(JsonFetchService);

  private catalogPromise: Promise<SurveyManifest> | null = null;

  readonly state = signal<CatalogState>('loading');

  async load(): Promise<SurveyManifest> {
    if (this.catalogPromise) {
      return this.catalogPromise;
    }

    this.catalogPromise = this.performLoad();
    try {
      const result = await this.catalogPromise;
      this.state.set(
        result.surveys.length > 0
          ? { kind: 'ready', entries: result.surveys as SurveyManifestEntry[] }
          : { kind: 'empty' },
      );
      return result;
    } catch (error) {
      this.state.set({
        kind: 'configuration-error',
        error: {
          scope: 'manifest',
          subject: 'surveys',
          issues: [
            {
              code: 'F17',
              path: 'surveys',
              message: 'The survey manifest could not be read',
            },
          ],
        },
      });
      throw error;
    }
  }

  async resolve(surveyKey: string): Promise<SurveyKeyResolution> {
    try {
      const manifest = await this.load();

      const entry = manifest.surveys.find((e) => e.key === surveyKey);

      if (!entry) {
        return { outcome: 'not-found', surveyKey };
      }

      return { outcome: 'found', entry };
    } catch {
      return {
        outcome: 'catalog-error',
        error: {
          scope: 'manifest',
          subject: 'surveys',
          issues: [
            {
              code: 'F17',
              path: 'surveys',
              message: 'The survey manifest could not be read',
            },
          ],
        },
      };
    }
  }

  private async performLoad(): Promise<SurveyManifest> {
    try {
      const fetchResult = await this.jsonFetch.fetchJson('public/survey-manifest.json', 10_000);

      if (fetchResult.outcome !== 'json') {
        throw new Error('Manifest fetch failed');
      }

      return validateSurveyManifest(fetchResult.value) as SurveyManifest;
    } catch (error) {
      return { surveys: [] };
    }
  }
}
