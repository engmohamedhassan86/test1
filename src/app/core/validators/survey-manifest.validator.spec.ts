/**
 * T034 — `validateSurveyManifest`, one case per rule R53 to R61, plus the normalisation
 * `SurveyManifestEntry` promises and the §9.7 descent rule.
 *
 * `survey-fixtures.contract.spec.ts` already runs this validator over the deliberately
 * invalid manifests in `__fixtures__/invalid-manifests.ts`, but that spec's question is
 * "does every fixture reach the error screen". This one's is "does each rule fire on its
 * own, with the code and the path the contract names" — a fixture that happens to break
 * two rules tells you nothing about which of them was caught.
 *
 * The two cases worth naming before you read them:
 *
 * - **An empty `surveys` array is valid.** FR-048 is explicit that an empty catalog is a
 *   state and not an error, so a validator that rejected it would turn a deployment with
 *   no surveys yet into a configuration-error screen.
 * - **A bad entry does not stop the ones after it** (§9.7). Descent into the broken entry
 *   stops; the walk does not. A validator that returned on the first bad entry would
 *   report one issue where the operator has three to fix.
 */

import { describe, expect, it } from 'vitest';

import type { ConfigIssue } from '../models/survey-config-error.model';
import { isSafeConfigPath, validateSurveyManifest } from './survey-manifest.validator';

/** A manifest entry that passes every rule, for overriding one field at a time. */
function entry(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    key: 'customer-feedback',
    title: 'Customer Feedback',
    config: 'surveys/customer-feedback.json',
    ...overrides,
  };
}

/** The issues of a manifest expected to be invalid. Fails loudly if it was valid. */
function issuesOf(raw: unknown): readonly ConfigIssue[] {
  const result = validateSurveyManifest(raw);
  if (result.outcome !== 'invalid') {
    throw new Error('expected the manifest to be invalid, but it validated');
  }
  expect(result.error.scope).toBe('manifest');
  return result.error.issues;
}

/** The `code` and `path` of the only issue, which is also an assertion that there is one. */
function onlyIssue(raw: unknown): { code: string; path: string } {
  const issues = issuesOf(raw);
  expect(issues).toHaveLength(1);
  return { code: issues[0].code, path: issues[0].path };
}

describe('validateSurveyManifest — the valid shapes', () => {
  it('accepts a manifest of one complete entry and brands its key', () => {
    const result = validateSurveyManifest({ surveys: [entry({ description: 'Four pages.' })] });

    expect(result.outcome).toBe('valid');
    if (result.outcome !== 'valid') {
      return;
    }
    expect(result.manifest.surveys).toEqual([
      {
        key: 'customer-feedback',
        title: 'Customer Feedback',
        description: 'Four pages.',
        config: 'surveys/customer-feedback.json',
      },
    ]);
  });

  it('accepts an empty surveys array (FR-048 — empty is a state, not an error)', () => {
    const result = validateSurveyManifest({ surveys: [] });

    // The case that matters most: rejecting this would show a configuration-error screen
    // over a deployment whose only fault is having published nothing yet.
    expect(result.outcome).toBe('valid');
    if (result.outcome !== 'valid') {
      return;
    }
    expect(result.manifest.surveys).toEqual([]);
  });

  it('treats an absent description as null rather than as undefined or ""', () => {
    const result = validateSurveyManifest({ surveys: [entry()] });

    if (result.outcome !== 'valid') {
      throw new Error('expected valid');
    }
    // `null` is how the model spells "absent", so the catalog renders no empty line.
    expect(result.manifest.surveys[0].description).toBeNull();
  });

  it('normalises a whitespace-only description to null and trims the rest', () => {
    const result = validateSurveyManifest({
      surveys: [
        entry({ description: '   ' }),
        entry({ key: 'product-pulse', description: '  Short.  ' }),
      ],
    });

    if (result.outcome !== 'valid') {
      throw new Error('expected valid');
    }
    expect(result.manifest.surveys.map((survey) => survey.description)).toEqual([null, 'Short.']);
  });

  it('trims the title', () => {
    const result = validateSurveyManifest({ surveys: [entry({ title: '  Customer Feedback  ' })] });

    if (result.outcome !== 'valid') {
      throw new Error('expected valid');
    }
    expect(result.manifest.surveys[0].title).toBe('Customer Feedback');
  });

  it('preserves manifest order, because the catalog renders it as given', () => {
    const result = validateSurveyManifest({
      surveys: [entry({ key: 'product-pulse' }), entry({ key: 'customer-feedback' })],
    });

    if (result.outcome !== 'valid') {
      throw new Error('expected valid');
    }
    expect(result.manifest.surveys.map((survey) => survey.key)).toEqual([
      'product-pulse',
      'customer-feedback',
    ]);
  });
});

describe('validateSurveyManifest — one case per rule', () => {
  it('R53: a non-object yields exactly one issue and examines no field', () => {
    // §9.7: no descent. A validator that also reported "surveys is missing" would be
    // describing a document it never read.
    expect(onlyIssue([])).toEqual({ code: 'F01', path: '' });
    expect(onlyIssue(null)).toEqual({ code: 'F01', path: '' });
    expect(onlyIssue('{"surveys":[]}')).toEqual({ code: 'F01', path: '' });
  });

  it('R53: an unknown top-level key is rejected', () => {
    expect(onlyIssue({ surveys: [], version: 2 })).toEqual({ code: 'F03', path: 'version' });
  });

  it('R54: surveys is required', () => {
    expect(onlyIssue({})).toEqual({ code: 'F02', path: 'surveys' });
  });

  it('R54: surveys must be an array, and an object is not one', () => {
    // The near-miss worth covering: `{}` is truthy and iterable-looking to nobody, but a
    // validator written with a falsiness check would let it through.
    expect(onlyIssue({ surveys: {} })).toEqual({ code: 'F06', path: 'surveys' });
  });

  it('R55: an entry must be an object', () => {
    expect(onlyIssue({ surveys: ['customer-feedback'] })).toEqual({
      code: 'F06',
      path: 'surveys[0]',
    });
  });

  it('R55: an unknown entry key is rejected', () => {
    expect(onlyIssue({ surveys: [entry({ icon: 'star' })] })).toEqual({
      code: 'F03',
      path: 'surveys[0].icon',
    });
  });

  it('R56: key, title and config are each required', () => {
    for (const field of ['key', 'title', 'config'] as const) {
      const incomplete = entry();
      delete incomplete[field];
      expect(onlyIssue({ surveys: [incomplete] })).toEqual({
        code: 'F02',
        path: `surveys[0].${field}`,
      });
    }
  });

  it('R57: key must match the survey-key pattern', () => {
    expect(onlyIssue({ surveys: [entry({ key: 'Customer Feedback' })] })).toEqual({
      code: 'F13',
      path: 'surveys[0].key',
    });
  });

  it('R57: key must be a string before it is matched', () => {
    expect(onlyIssue({ surveys: [entry({ key: 7 })] })).toEqual({
      code: 'F06',
      path: 'surveys[0].key',
    });
  });

  it('R58: a key repeated on a later entry is a duplicate', () => {
    // The path names the *second* entry, which is the one the operator should delete.
    expect(onlyIssue({ surveys: [entry(), entry()] })).toEqual({
      code: 'F07',
      path: 'surveys[1].key',
    });
  });

  it('R59: title must be a non-empty string of at most 120 code points', () => {
    expect(onlyIssue({ surveys: [entry({ title: 4 })] })).toEqual({
      code: 'F06',
      path: 'surveys[0].title',
    });
    expect(onlyIssue({ surveys: [entry({ title: '   ' })] })).toEqual({
      code: 'F13',
      path: 'surveys[0].title',
    });
    expect(onlyIssue({ surveys: [entry({ title: 'x'.repeat(121) })] })).toEqual({
      code: 'F13',
      path: 'surveys[0].title',
    });
  });

  it('R59: the title ceiling counts code points, not UTF-16 units', () => {
    // 120 astral characters are 240 `.length` units. A validator using `.length` rejects
    // this valid title, and accepts a 120-unit emoji title that is really 60 characters.
    const astral = '🙂'.repeat(120);
    expect(validateSurveyManifest({ surveys: [entry({ title: astral })] }).outcome).toBe('valid');
    expect(onlyIssue({ surveys: [entry({ title: '🙂'.repeat(121) })] })).toEqual({
      code: 'F13',
      path: 'surveys[0].title',
    });
  });

  it('R60: description must be a string of at most 300 code points when present', () => {
    expect(onlyIssue({ surveys: [entry({ description: 12 })] })).toEqual({
      code: 'F06',
      path: 'surveys[0].description',
    });
    expect(onlyIssue({ surveys: [entry({ description: 'x'.repeat(301) })] })).toEqual({
      code: 'F13',
      path: 'surveys[0].description',
    });
  });

  it('R61: config must be a safe relative .json path', () => {
    expect(onlyIssue({ surveys: [entry({ config: 42 })] })).toEqual({
      code: 'F06',
      path: 'surveys[0].config',
    });
    expect(onlyIssue({ surveys: [entry({ config: 'surveys/customer-feedback.yaml' })] })).toEqual({
      code: 'F13',
      path: 'surveys[0].config',
    });
  });
});

describe('validateSurveyManifest — descent (§9.7)', () => {
  it('reports one issue per broken entry and keeps walking past the first', () => {
    const issues = issuesOf({
      surveys: [entry({ key: 'NOT A KEY' }), entry({ key: 'product-pulse' }), entry({ title: '' })],
    });

    // Three entries, two broken, and the good one in the middle does not end the walk.
    // Returning after `surveys[0]` would hand the operator one fix out of two.
    expect(issues.map((issue) => issue.path)).toEqual(['surveys[0].key', 'surveys[2].title']);
  });

  it('reports only the first fault within a single entry', () => {
    // Descent into a broken entry stops, so a second fault in the same entry is not
    // reported — the first one has to be fixed before it could even be reached.
    const issues = issuesOf({ surveys: [entry({ key: 'NOT A KEY', title: '' })] });

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('surveys[0].key');
  });
});

describe('isSafeConfigPath', () => {
  it('accepts a relative path under public/ ending .json', () => {
    expect(isSafeConfigPath('surveys/customer-feedback.json')).toBe(true);
    expect(isSafeConfigPath('customer-feedback.json')).toBe(true);
  });

  it('rejects a path that escapes public/, is absolute, or is not .json', () => {
    // The traversal and scheme cases are the reason this predicate exists: the value
    // becomes a fetch URL, so a manifest is otherwise a way to read any path or host.
    expect(isSafeConfigPath('../secrets.json')).toBe(false);
    expect(isSafeConfigPath('surveys/../../secrets.json')).toBe(false);
    expect(isSafeConfigPath('/surveys/customer-feedback.json')).toBe(false);
    expect(isSafeConfigPath('https://elsewhere.example/survey.json')).toBe(false);
    expect(isSafeConfigPath('surveys/customer-feedback.json5')).toBe(false);
    expect(isSafeConfigPath('surveys/customer-feedback')).toBe(false);
  });

  it('does not mistake a ".." inside a filename for a traversal segment', () => {
    // `split('/').includes('..')` is segment-exact on purpose. A `value.includes('..')`
    // check would reject this legitimate name.
    expect(isSafeConfigPath('surveys/odd..name.json')).toBe(true);
  });
});
