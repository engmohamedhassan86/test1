/**
 * Fetching and validating one survey config — T049, `plan.md` §4.2.
 *
 * It composes and nothing more: `fetchJson(entry.config, fetchMs)` then
 * `validateSurveyConfig(value, entry.key)`. The key the config is validated **against** is
 * the key the manifest served it under, which is what makes F16 reachable (a config whose
 * own `key` disagrees with the manifest is invalid, not silently renamed).
 *
 * It fails closed: there is no path from an unreadable config to a rendered survey.
 */

import { inject, Injectable } from '@angular/core';

import type { SurveyValidation } from '../models/survey-config-error.model';
import type { SurveyManifestEntry } from '../models/survey-manifest.model';
import { fetchFailureError } from '../validators/fetch-outcome.validator';
import { validateSurveyConfig } from '../validators/survey-config.validator';
import { JsonFetchService } from './json-fetch.service';
import { SURVEY_TIMEOUTS } from './survey-timeouts';

@Injectable({ providedIn: 'root' })
export class SurveyLoaderService {
  private readonly jsonFetch = inject(JsonFetchService);
  private readonly timeouts = inject(SURVEY_TIMEOUTS);

  async load(entry: SurveyManifestEntry): Promise<SurveyValidation> {
    const fetched = await this.jsonFetch.fetchJson(entry.config, this.timeouts.fetchMs);

    if (fetched.outcome === 'json') {
      return validateSurveyConfig(fetched.value, entry.key);
    }

    return { outcome: 'invalid', error: fetchFailureError(fetched, 'survey', entry.key) };
  }
}
