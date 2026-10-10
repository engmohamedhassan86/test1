/**
 * The manifest-driven catalog — T048, `plan.md` §4.1.
 *
 * Three things here are easy to get wrong and are therefore stated:
 *
 * - **The promise is memoised, not the value** (research D11, FR-067). Memoising the value
 *   would let `/` and a deep link both start a fetch before either answered; memoising the
 *   promise collapses that race into one request. Root provision makes the lifetime the
 *   visit, so a reload refetches — US4 scenario 8.
 * - **`ready` cannot be empty.** An empty manifest is `empty`, which is not an error state
 *   (FR-048, FR-074). `CatalogState.ready` carries `NonEmpty`, so the compiler agrees.
 * - **`resolve` never reports `not-found` for a manifest it could not read** (FR-066, US4
 *   scenario 7). Without the manifest the key cannot be resolved either way, so the
 *   outcome is `catalog-error`.
 *
 * Nothing is written to `localStorage` or `sessionStorage`.
 */

import { inject, Injectable, signal } from '@angular/core';

import { isNonEmpty } from '../models/branded';
import { MANIFEST_SUBJECT } from '../models/survey-config-error.model';
import type { ManifestValidation } from '../models/survey-config-error.model';
import type { CatalogState, SurveyKeyResolution } from '../models/survey-manifest.model';
import { fetchFailureError } from '../validators/fetch-outcome.validator';
import { validateSurveyManifest } from '../validators/survey-manifest.validator';
import { JsonFetchService } from './json-fetch.service';
import { SURVEY_TIMEOUTS } from './survey-timeouts';

/** Relative to `<base href="/">`, which is how the `public/` directory is served. */
export const MANIFEST_URL = 'survey-manifest.json';

@Injectable({ providedIn: 'root' })
export class SurveyCatalogService {
  private readonly jsonFetch = inject(JsonFetchService);
  private readonly timeouts = inject(SURVEY_TIMEOUTS);

  /** The memoised request. One per visit, shared by every caller. */
  private inFlight: Promise<ManifestValidation> | null = null;

  private readonly catalogState = signal<CatalogState>({ kind: 'loading' });

  readonly state = this.catalogState.asReadonly();

  load(): Promise<ManifestValidation> {
    this.inFlight ??= this.fetchManifest();
    return this.inFlight;
  }

  async resolve(surveyKey: string): Promise<SurveyKeyResolution> {
    const validation = await this.load();

    if (validation.outcome === 'invalid') {
      return { outcome: 'catalog-error', error: validation.error };
    }

    const entry = validation.manifest.surveys.find((candidate) => candidate.key === surveyKey);
    return entry === undefined ? { outcome: 'not-found', surveyKey } : { outcome: 'found', entry };
  }

  private async fetchManifest(): Promise<ManifestValidation> {
    const fetched = await this.jsonFetch.fetchJson(MANIFEST_URL, this.timeouts.fetchMs);
    const validation: ManifestValidation =
      fetched.outcome === 'json'
        ? validateSurveyManifest(fetched.value)
        : { outcome: 'invalid', error: fetchFailureError(fetched, 'manifest', MANIFEST_SUBJECT) };

    this.catalogState.set(catalogStateFor(validation));
    return validation;
  }
}

/** FR-074's four states, derived from the one validation result. */
function catalogStateFor(validation: ManifestValidation): CatalogState {
  if (validation.outcome === 'invalid') {
    return { kind: 'configuration-error', error: validation.error };
  }
  const entries = validation.manifest.surveys;
  return isNonEmpty(entries) ? { kind: 'ready', entries } : { kind: 'empty' };
}
