/**
 * Deliberately invalid survey manifests — one per manifest-reachable failure class
 * in `specs/001-survey-management/contracts/survey-json.md` §4, checked by rules
 * R53 to R61 in §9.6.
 *
 * The manifest is the only index of surveys, so a broken manifest must take down the
 * whole catalog rather than render a partial list (contract §1, spec FR-044). These
 * fixtures are what proves that.
 *
 * `INVALID_MANIFEST_CASES` is the table the contract test iterates.
 */

import type { ExpectedFailureCode } from './invalid-survey-configs';

export interface InvalidManifestCase {
  readonly name: string;
  readonly code: ExpectedFailureCode;
  readonly path: string;
  readonly raw: unknown;
  readonly unparseable?: true;
}

/** F01 — the body is not parseable JSON. */
export const INVALID_MANIFEST_F01_UNPARSEABLE_BODY: unknown = '{ "surveys": [ ';

/** F02 — `surveys` is required, even when it would be empty. Path `surveys`. */
export const INVALID_MANIFEST_F02_MISSING_SURVEYS: unknown = {};

/** F03 — `version` is in no part of the contract. Path `version`. */
export const INVALID_MANIFEST_F03_UNKNOWN_KEY: unknown = {
  surveys: [],
  version: 2,
};

/** F06 — `surveys` must be an array, not a string. Path `surveys`. */
export const INVALID_MANIFEST_F06_WRONG_JSON_TYPE: unknown = {
  surveys: 'customer-feedback',
};

/** F07 — two entries share the key `customer-feedback`. The path names the second. */
export const INVALID_MANIFEST_F07_DUPLICATE_KEY: unknown = {
  surveys: [
    {
      key: 'customer-feedback',
      title: 'Customer Feedback',
      config: 'surveys/customer-feedback.json',
    },
    {
      key: 'customer-feedback',
      title: 'Customer Feedback (old)',
      config: 'surveys/customer-feedback-v1.json',
    },
  ],
};

/**
 * F13 — `config` must stay under `public/`: no scheme, no leading `/`, no `..`
 * segment. Path `surveys[0].config`.
 */
export const INVALID_MANIFEST_F13_CONFIG_PATH_ESCAPES: unknown = {
  surveys: [
    {
      key: 'customer-feedback',
      title: 'Customer Feedback',
      config: '../../etc/surveys/customer-feedback.json',
    },
  ],
};

/** The table the contract test iterates. */
export const INVALID_MANIFEST_CASES: readonly InvalidManifestCase[] = [
  {
    name: 'F01 body is not parseable JSON',
    code: 'F01',
    path: '',
    raw: INVALID_MANIFEST_F01_UNPARSEABLE_BODY,
    unparseable: true,
  },
  {
    name: 'F02 surveys is missing',
    code: 'F02',
    path: 'surveys',
    raw: INVALID_MANIFEST_F02_MISSING_SURVEYS,
  },
  {
    name: 'F03 unknown top-level key',
    code: 'F03',
    path: 'version',
    raw: INVALID_MANIFEST_F03_UNKNOWN_KEY,
  },
  {
    name: 'F06 surveys is not an array',
    code: 'F06',
    path: 'surveys',
    raw: INVALID_MANIFEST_F06_WRONG_JSON_TYPE,
  },
  {
    name: 'F07 duplicate survey key',
    code: 'F07',
    path: 'surveys[1].key',
    raw: INVALID_MANIFEST_F07_DUPLICATE_KEY,
  },
  {
    name: 'F13 config path escapes public/',
    code: 'F13',
    path: 'surveys[0].config',
    raw: INVALID_MANIFEST_F13_CONFIG_PATH_ESCAPES,
  },
];
