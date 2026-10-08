/**
 * Configuration failure model — `data-model.md` §5, `contracts/survey-json.md` §9.
 *
 * `issues` is `NonEmpty<ConfigIssue>` because a `SurveyConfigError` with nothing wrong
 * is not a thing that should be constructible.
 */

import type { NonEmpty } from './branded';
import type { SurveyManifest } from './survey-manifest.model';
import type { Survey } from './survey.model';

/** The F-classes of `contracts/survey-json.md` §4. This list is the contract-test list. */
export type ConfigFailureCode =
  | 'F01' // body is not parseable JSON
  | 'F02' // required field missing
  | 'F03' // unknown field present
  | 'F04' // unknown question type
  | 'F05' // field not valid for its question type
  | 'F06' // wrong JSON type for a field
  | 'F07' // duplicate page id
  | 'F08' // duplicate question id
  | 'F09' // duplicate option id or value
  | 'F10' // fewer than 2 options on radio/checkbox
  | 'F11' // pages empty
  | 'F12' // unsatisfiable selection rule
  | 'F13' // inverted or out-of-bound numeric rule
  | 'F14' // rating scale out of bounds
  | 'F15' // attachment policy incomplete or out of range
  | 'F16' // config key does not match the key served
  | 'F17' // manifest config path missing or unreadable
  | 'F18' // non-JSON body under any status, including 200
  | 'F19'; // manifest or config fetch unanswered after 10s

export interface ConfigIssue {
  readonly code: ConfigFailureCode;
  /** FR-041: the location, e.g. `pages[1].questions[0].type`, or `''` for the document. */
  readonly path: string;
  /** FR-041: author-facing, naming the location and the offending value. */
  readonly message: string;
}

export interface SurveyConfigError {
  readonly scope: 'manifest' | 'survey';
  /** The survey key, or `survey-manifest.json` when `scope` is `manifest`. */
  readonly subject: string;
  readonly issues: NonEmpty<ConfigIssue>;
}

export type SurveyValidation =
  | { readonly outcome: 'valid'; readonly survey: Survey }
  | { readonly outcome: 'invalid'; readonly error: SurveyConfigError };

export type ManifestValidation =
  | { readonly outcome: 'valid'; readonly manifest: SurveyManifest }
  | { readonly outcome: 'invalid'; readonly error: SurveyConfigError };

/** The subject every manifest failure is reported against. */
export const MANIFEST_SUBJECT = 'survey-manifest.json';
