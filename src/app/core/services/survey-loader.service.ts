import { inject, Injectable } from '@angular/core';

import { SurveyManifestEntry } from '../models/survey-manifest.model';
import { SurveyValidation } from '../models/survey-config-error.model';
import { SurveyKeyResolution, SurveyCatalogService } from './survey-catalog.service';
import { SurveyTimeouts } from './survey-timeouts';

import { JsonFetchService } from './json-fetch.service';
import { validateSurveyManifest } from '../validators/survey-manifest.validator';

@Injectable({ providedIn: 'root' })
export class SurveyLoaderService {
  private readonly jsonFetch = inject(JsonFetchService);
  private readonly catalogService = inject(SurveyCatalogService);
  private readonly timeouts = inject(SurveyTimeouts);

  async load(entry: SurveyManifestEntry): Promise<SurveyValidation> {
    const fetchResult = await this.jsonFetch.fetchJson(entry.config, this.timeouts.fetchMs);

    if (fetchResult.outcome === 'json') {
      return validateSurveyManifest(fetchResult.value, entry.key);
    }

    return this.mapFetchOutcomeToFailure(fetchResult, entry.key);
  }

  private mapFetchOutcomeToFailure(
    fetchResult: { outcome: 'unreadable'; status: number | null } | { outcome: 'timeout' },
    key: string,
  ): SurveyValidation {
    switch (fetchResult.outcome) {
      case 'unreadable':
        return {
          outcome: 'configuration-error',
          scope: 'survey',
          subject: key,
          issues: [
            {
              code: fetchResult.status === 404 ? 'F18' : 'F17',
              path:
                fetchResult.status === 404 ? 'surveys.{index}.config' : 'surveys.{index}.config',
              message:
                fetchResult.status === 404
                  ? 'This survey could not be found'
                  : 'This survey could not be read',
            },
          ],
        };
      case 'timeout':
        return {
          outcome: 'configuration-error',
          scope: 'survey',
          subject: key,
          issues: [
            {
              code: 'F19',
              path: 'surveys.{index}.config',
              message: 'This survey request timed out',
            },
          ],
        };
      default:
        throw new Error('Never');
    }
  }
}
