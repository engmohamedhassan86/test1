/**
 * `unknown` → `SurveyManifest` — T024, implementing `contracts/survey-json.md` §9.6
 * rules R53 to R61 one-to-one.
 *
 * `surveys` **may** be empty: `{"surveys": []}` is a valid manifest and renders the empty
 * catalog, which FR-048 is explicit is not an error state.
 */

import { brand } from '../models/branded';
import type { NonEmpty, SurveyKey } from '../models/branded';
import { MANIFEST_SUBJECT } from '../models/survey-config-error.model';
import type { ConfigIssue, ManifestValidation } from '../models/survey-config-error.model';
import type { SurveyManifestEntry } from '../models/survey-manifest.model';
import {
  codePointLength,
  hasContent,
  missingKeys,
  rejectUnknownKeys,
  requireArray,
  requireObject,
  requireString,
} from './json-reader';
import { SURVEY_KEY_PATTERN } from './survey-config.validator';

const ENTRY_KEYS = ['key', 'title', 'description', 'config'] as const;

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 300;

/** R61: under `public/`, ending `.json`, no scheme, no leading `/`, no `..` segment. */
export function isSafeConfigPath(value: string): boolean {
  if (!value.endsWith('.json')) {
    return false;
  }
  if (value.startsWith('/') || value.includes('://')) {
    return false;
  }
  return !value.split('/').includes('..');
}

export function validateSurveyManifest(raw: unknown): ManifestValidation {
  const issues: ConfigIssue[] = [];
  const add = (code: ConfigIssue['code'], path: string, message: string): undefined => {
    issues.push({ code, path, message });
    return undefined;
  };

  const invalid = (): ManifestValidation => {
    const [first, ...rest] = issues;
    if (first === undefined) {
      // Unreachable by construction — see the same guard in `survey-config.validator.ts`.
      throw new Error(`${MANIFEST_SUBJECT}: validation failed with no issue recorded`);
    }
    const nonEmpty: NonEmpty<ConfigIssue> = [first, ...rest];
    return {
      outcome: 'invalid',
      error: { scope: 'manifest', subject: MANIFEST_SUBJECT, issues: nonEmpty },
    };
  };

  // R53 — a JSON object whose only key is `surveys`. A non-object yields exactly one
  // issue and no field is examined (§9.7).
  const object = requireObject(raw);
  if (!object.ok) {
    add('F01', '', `${MANIFEST_SUBJECT}: the survey catalog could not be read`);
    return invalid();
  }
  const unknownKeys = rejectUnknownKeys(object.value, ['surveys']);
  const firstUnknown = unknownKeys[0];
  if (firstUnknown !== undefined) {
    add('F03', firstUnknown, `${firstUnknown}: unknown field`);
    return invalid();
  }

  // R54 — `surveys` present and an array. It may be empty.
  if (object.value['surveys'] === undefined) {
    add('F02', 'surveys', 'surveys: required field is missing');
    return invalid();
  }
  const surveys = requireArray(object.value['surveys']);
  if (!surveys.ok) {
    add('F06', 'surveys', `surveys: expected an array, got ${surveys.actual}`);
    return invalid();
  }

  const entries: SurveyManifestEntry[] = [];
  const seenKeys = new Set<string>();

  for (const [index, rawEntry] of surveys.value.entries()) {
    const basePath = `surveys[${index}]`;

    // R55 — an object whose only keys are the four. A failure stops descent into it, but
    // the remaining entries are still checked (§9.7).
    const entry = requireObject(rawEntry);
    if (!entry.ok) {
      add('F06', basePath, `${basePath}: expected an object, got ${entry.actual}`);
      continue;
    }
    const unknownEntryKeys = rejectUnknownKeys(entry.value, ENTRY_KEYS);
    const firstUnknownEntryKey = unknownEntryKeys[0];
    if (firstUnknownEntryKey !== undefined) {
      const path = `${basePath}.${firstUnknownEntryKey}`;
      add('F03', path, `${path}: unknown field`);
      continue;
    }

    // R56 — `key`, `title`, `config` present.
    const missing = missingKeys(entry.value, ['key', 'title', 'config']);
    const firstMissing = missing[0];
    if (firstMissing !== undefined) {
      const path = `${basePath}.${firstMissing}`;
      add('F02', path, `${path}: required field is missing`);
      continue;
    }

    // R57 — `key` matches the survey-key pattern.
    const keyPath = `${basePath}.key`;
    const key = requireString(entry.value['key']);
    if (!key.ok) {
      add('F06', keyPath, `${keyPath}: expected a string, got ${key.actual}`);
      continue;
    }
    if (!SURVEY_KEY_PATTERN.test(key.value)) {
      add(
        'F13',
        keyPath,
        `${keyPath}: ${JSON.stringify(key.value)} does not match ${SURVEY_KEY_PATTERN.source}`,
      );
      continue;
    }

    // R58 — not seen on an earlier entry.
    if (seenKeys.has(key.value)) {
      add('F07', keyPath, `${keyPath}: duplicate survey key ${JSON.stringify(key.value)}`);
      continue;
    }

    // R59 — `title` a non-empty trimmed string of at most 120 code points.
    const titlePath = `${basePath}.title`;
    const title = requireString(entry.value['title']);
    if (!title.ok) {
      add('F06', titlePath, `${titlePath}: expected a string, got ${title.actual}`);
      continue;
    }
    if (!hasContent(title.value)) {
      add('F13', titlePath, `${titlePath}: must not be empty`);
      continue;
    }
    if (codePointLength(title.value) > TITLE_MAX) {
      add(
        'F13',
        titlePath,
        `${titlePath}: must be at most ${TITLE_MAX} characters, got ${codePointLength(title.value)}`,
      );
      continue;
    }

    // R60 — `description`, when present, at most 300 code points. Absent or empty → null.
    const descriptionPath = `${basePath}.description`;
    let description: string | null = null;
    const rawDescription = entry.value['description'];
    if (rawDescription !== undefined) {
      const read = requireString(rawDescription);
      if (!read.ok) {
        add('F06', descriptionPath, `${descriptionPath}: expected a string, got ${read.actual}`);
        continue;
      }
      if (codePointLength(read.value) > DESCRIPTION_MAX) {
        add(
          'F13',
          descriptionPath,
          `${descriptionPath}: must be at most ${DESCRIPTION_MAX} characters, got ${codePointLength(read.value)}`,
        );
        continue;
      }
      description = read.value.trim().length === 0 ? null : read.value.trim();
    }

    // R61 — `config` a relative `.json` path under `public/`.
    const configPath = `${basePath}.config`;
    const config = requireString(entry.value['config']);
    if (!config.ok) {
      add('F06', configPath, `${configPath}: expected a string, got ${config.actual}`);
      continue;
    }
    if (!isSafeConfigPath(config.value)) {
      add(
        'F13',
        configPath,
        `${configPath}: ${JSON.stringify(config.value)} must be a relative path under public/ ending .json`,
      );
      continue;
    }

    seenKeys.add(key.value);
    entries.push({
      key: brand<SurveyKey>(key.value),
      title: title.value.trim(),
      description,
      config: config.value,
    });
  }

  if (issues.length > 0) {
    return invalid();
  }
  return { outcome: 'valid', manifest: { surveys: entries } };
}
