/**
 * The manifest model and the catalog's own state machine — `data-model.md` §4.
 *
 * `CatalogState.ready` carrying `NonEmpty<SurveyManifestEntry>` makes FR-074's
 * distinction between `ready` and `empty` a type-level fact: a catalog cannot be
 * `ready` with nothing to list.
 */

import type { NonEmpty, SurveyKey } from './branded';
import type { SurveyConfigError } from './survey-config-error.model';

export interface SurveyManifestEntry {
  readonly key: SurveyKey;
  readonly title: string;
  readonly description: string | null;
  /** Relative path under `public/`, ending `.json`. No absolute URL, no `..` segment. */
  readonly config: string;
}

export interface SurveyManifest {
  /** May be empty — FR-048 renders the empty catalog, which is not an error state. */
  readonly surveys: readonly SurveyManifestEntry[];
}

/** FR-074: the catalog's own four states. */
export type CatalogState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly entries: NonEmpty<SurveyManifestEntry> }
  | { readonly kind: 'empty' }
  | { readonly kind: 'configuration-error'; readonly error: SurveyConfigError };

/**
 * FR-050 / FR-066. Three outcomes, not two: a key the manifest does not list is
 * `not-found`, but a manifest that could not be read is `catalog-error` and MUST NOT be
 * reported as an unknown key, because without the manifest the key cannot be resolved
 * either way.
 */
export type SurveyKeyResolution =
  | { readonly outcome: 'found'; readonly entry: SurveyManifestEntry }
  | { readonly outcome: 'not-found'; readonly surveyKey: string }
  | { readonly outcome: 'catalog-error'; readonly error: SurveyConfigError };
