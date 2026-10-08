/**
 * Fixture contract test — test strategy Layer 4, `specs/001-survey-management/plan.md` §7.
 *
 * This is the test that keeps the authored survey data honest. It is table-driven on
 * purpose: the lists are `MANIFEST_ENTRIES`, `INVALID_SURVEY_CONFIG_CASES` and
 * `INVALID_MANIFEST_CASES`, so adding a survey or a failure class means adding data,
 * never adding a test by hand.
 *
 * It has two halves.
 *
 * 1. **Authored content** — always runs. It reads `public/survey-manifest.json` and
 *    every config the manifest points at, straight off disk, and checks them against
 *    `contracts/survey-json.md`. It has no dependency on application code, so a survey
 *    that breaks the contract fails here from the moment it is committed.
 * 2. **Validator-backed assertions** — the normative half, which runs
 *    `validateSurveyManifest` / `validateSurveyConfig` over the same files and over
 *    every invalid fixture. `src/app/core/validators` holds only a README until
 *    Phase 2C of `tasks.md` lands, so this half is skipped while the two validators do
 *    not exist and activates by itself the moment they do. Nothing needs to be edited
 *    here to switch it on.
 *
 * The rule checks in half 1 duplicate what the validators will do, which is deliberate
 * but temporary: they exist so that Content ships a running gate rather than a dormant
 * one, and they are to be deleted once half 2 is live. The structural assertions about
 * `customer-feedback` itself (contract §5) are not duplication and stay.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INVALID_MANIFEST_CASES } from './__fixtures__/invalid-manifests';
import { INVALID_SURVEY_CONFIG_CASES } from './__fixtures__/invalid-survey-configs';

// --- locating the repository -------------------------------------------------------

const VALIDATORS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(VALIDATORS_DIR, '../../../..');
const PUBLIC_DIR = resolve(REPO_ROOT, 'public');
const MANIFEST_FILE = resolve(PUBLIC_DIR, 'survey-manifest.json');

// --- reading JSON without reaching for `any` ---------------------------------------

type JsonObject = Readonly<Record<string, unknown>>;

function readJsonFile(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown, where: string): JsonObject {
  if (!isObject(value)) {
    throw new Error(`${where}: expected a JSON object, got ${JSON.stringify(value)}`);
  }
  return value;
}

function asArray(value: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${where}: expected a JSON array, got ${JSON.stringify(value)}`);
  }
  return value;
}

/** Code points, not UTF-16 units — contract §2 measures lengths this way. */
function codePoints(value: string): number {
  return [...value.trim()].length;
}

// --- the contract, as data ---------------------------------------------------------

const SURVEY_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,63}$/;

const QUESTION_TYPES = [
  'radio',
  'checkbox',
  'textbox',
  'textarea',
  'rating',
  'satisfaction',
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

const COMMON_QUESTION_KEYS = ['id', 'type', 'title', 'description', 'required', 'attachments'];

/** Contract §2: a question carries only the fields listed for its own type. */
const TYPE_SPECIFIC_KEYS: Readonly<Record<QuestionType, readonly string[]>> = {
  radio: ['options'],
  checkbox: ['options', 'minSelections', 'maxSelections'],
  textbox: ['minLength', 'maxLength'],
  textarea: ['minLength', 'maxLength'],
  rating: ['scale'],
  satisfaction: [],
};

/** Contract §2: the `maxLength` ceiling, which differs between the two text types. */
const MAX_LENGTH_CEILING: Readonly<Record<'textbox' | 'textarea', number>> = {
  textbox: 255,
  textarea: 5000,
};

const MAX_SIZE_BYTES_CEILING = 10_485_760;
const ACCEPTED_TYPE_PATTERN =
  /^([a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*|\.[a-z0-9]+)$/;

// --- the manifest, loaded once ------------------------------------------------------

interface ManifestEntry {
  readonly key: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly config: string;
  readonly configFile: string;
}

function loadManifestEntries(): readonly ManifestEntry[] {
  const manifest = asObject(readJsonFile(MANIFEST_FILE), 'survey-manifest.json');
  return asArray(manifest['surveys'], 'surveys').map((raw, index) => {
    const entry = asObject(raw, `surveys[${index}]`);
    const key = entry['key'];
    const title = entry['title'];
    const description = entry['description'];
    const config = entry['config'];
    if (typeof key !== 'string' || typeof title !== 'string' || typeof config !== 'string') {
      throw new Error(`surveys[${index}]: key, title and config must all be strings`);
    }
    if (description !== undefined && typeof description !== 'string') {
      throw new Error(`surveys[${index}].description: expected a string`);
    }
    return { key, title, description, config, configFile: resolve(PUBLIC_DIR, config) };
  });
}

const MANIFEST_ENTRIES = loadManifestEntries();

// --- is the validator half live yet? ------------------------------------------------

interface ConfigIssueLike {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

interface ValidationLike {
  readonly outcome: 'valid' | 'invalid';
  readonly survey?: unknown;
  readonly error?: { readonly issues?: readonly ConfigIssueLike[] };
}

type ConfigValidator = (raw: unknown, servedKey: string) => ValidationLike;
type ManifestValidator = (raw: unknown) => ValidationLike;

function findModule(...candidates: readonly string[]): string | undefined {
  return candidates.map((file) => resolve(VALIDATORS_DIR, file)).find((file) => existsSync(file));
}

const CONFIG_VALIDATOR_MODULE = findModule('survey-config.validator.ts', 'index.ts');
const MANIFEST_VALIDATOR_MODULE = findModule('survey-manifest.validator.ts', 'index.ts');
const VALIDATORS_LIVE =
  CONFIG_VALIDATOR_MODULE !== undefined && MANIFEST_VALIDATOR_MODULE !== undefined;

// --- half 1: the authored content ---------------------------------------------------

describe('authored survey content', () => {
  describe('the manifest', () => {
    it('is the single index of surveys and lists at least the default fixture', () => {
      expect(MANIFEST_ENTRIES.map((entry) => entry.key)).toEqual([
        'customer-feedback',
        'product-pulse',
      ]);
    });

    it('holds only the keys the contract defines', () => {
      const manifest = asObject(readJsonFile(MANIFEST_FILE), 'survey-manifest.json');
      expect(Object.keys(manifest)).toEqual(['surveys']);
      for (const [index, raw] of asArray(manifest['surveys'], 'surveys').entries()) {
        const unknownKeys = Object.keys(asObject(raw, `surveys[${index}]`)).filter(
          (key) => !['key', 'title', 'description', 'config'].includes(key),
        );
        expect(unknownKeys, `surveys[${index}]`).toEqual([]);
      }
    });

    it.each(MANIFEST_ENTRIES)('entry $key satisfies the manifest rules', (entry) => {
      expect(entry.key, 'key pattern').toMatch(SURVEY_KEY_PATTERN);
      expect(codePoints(entry.title), 'title length').toBeGreaterThan(0);
      expect(codePoints(entry.title), 'title length').toBeLessThanOrEqual(120);
      if (entry.description !== undefined) {
        expect(codePoints(entry.description), 'description length').toBeLessThanOrEqual(300);
      }
      expect(entry.config, 'config extension').toMatch(/\.json$/);
      expect(entry.config, 'config must be relative').not.toMatch(/^([a-z]+:|\/)/);
      expect(entry.config.split('/'), 'config must not escape public/').not.toContain('..');
    });

    it('has no duplicate keys', () => {
      const keys = MANIFEST_ENTRIES.map((entry) => entry.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it.each(MANIFEST_ENTRIES)('entry $key points at a file that exists', (entry) => {
      expect(existsSync(entry.configFile), entry.configFile).toBe(true);
    });
  });

  describe.each(MANIFEST_ENTRIES)('the $key config', (entry) => {
    const config = asObject(readJsonFile(entry.configFile), entry.key);
    const pages = asArray(config['pages'], 'pages').map((raw, index) =>
      asObject(raw, `pages[${index}]`),
    );

    it('declares the key it is served under', () => {
      expect(config['key']).toBe(entry.key);
    });

    it('holds only the keys the contract defines, and has at least one page', () => {
      const unknownKeys = Object.keys(config).filter(
        (key) => !['key', 'title', 'description', 'pages'].includes(key),
      );
      expect(unknownKeys).toEqual([]);
      expect(pages.length).toBeGreaterThanOrEqual(1);
    });

    it('gives every page a unique, well-formed id and only contract keys', () => {
      const seen = new Set<string>();
      for (const [index, page] of pages.entries()) {
        const where = `pages[${index}]`;
        const unknownKeys = Object.keys(page).filter(
          (key) => !['id', 'title', 'description', 'questions'].includes(key),
        );
        expect(unknownKeys, where).toEqual([]);
        const id = page['id'];
        expect(typeof id, `${where}.id`).toBe('string');
        expect(id as string, `${where}.id`).toMatch(ID_PATTERN);
        expect(seen.has(id as string), `${where}.id is a duplicate`).toBe(false);
        seen.add(id as string);
        const title = page['title'];
        expect(typeof title, `${where}.title`).toBe('string');
        expect(codePoints(title as string), `${where}.title`).toBeGreaterThan(0);
        expect(codePoints(title as string), `${where}.title`).toBeLessThanOrEqual(120);
        asArray(page['questions'], `${where}.questions`);
      }
    });

    it('gives every question a known type and only the fields that type allows', () => {
      const seenIds = new Set<string>();
      for (const [pageIndex, page] of pages.entries()) {
        const questions = asArray(page['questions'], `pages[${pageIndex}].questions`);
        for (const [questionIndex, raw] of questions.entries()) {
          const where = `pages[${pageIndex}].questions[${questionIndex}]`;
          const question = asObject(raw, where);
          const type = question['type'];
          expect(QUESTION_TYPES, `${where}.type`).toContain(type);
          const allowed = [...COMMON_QUESTION_KEYS, ...TYPE_SPECIFIC_KEYS[type as QuestionType]];
          const disallowed = Object.keys(question).filter((key) => !allowed.includes(key));
          expect(
            disallowed,
            `${where} carries fields that are not valid for a ${String(type)}`,
          ).toEqual([]);

          const id = question['id'];
          expect(typeof id, `${where}.id`).toBe('string');
          expect(id as string, `${where}.id`).toMatch(ID_PATTERN);
          expect(seenIds.has(id as string), `${where}.id is a duplicate`).toBe(false);
          seenIds.add(id as string);

          const title = question['title'];
          expect(typeof title, `${where}.title`).toBe('string');
          expect(codePoints(title as string), `${where}.title`).toBeGreaterThan(0);
          expect(codePoints(title as string), `${where}.title`).toBeLessThanOrEqual(300);

          const description = question['description'];
          if (description !== undefined) {
            expect(codePoints(description as string), `${where}.description`).toBeLessThanOrEqual(
              500,
            );
          }
          if (question['required'] !== undefined) {
            expect(typeof question['required'], `${where}.required`).toBe('boolean');
          }
        }
      }
    });

    it('satisfies every type-specific rule', () => {
      for (const [pageIndex, page] of pages.entries()) {
        const questions = asArray(page['questions'], `pages[${pageIndex}].questions`);
        for (const [questionIndex, raw] of questions.entries()) {
          const where = `pages[${pageIndex}].questions[${questionIndex}]`;
          const question = asObject(raw, where);
          const type = question['type'] as QuestionType;

          if (type === 'radio' || type === 'checkbox') {
            const options = asArray(question['options'], `${where}.options`).map((option, index) =>
              asObject(option, `${where}.options[${index}]`),
            );
            expect(options.length, `${where}.options`).toBeGreaterThanOrEqual(2);
            const ids = new Set<string>();
            const values = new Set<string>();
            for (const [index, option] of options.entries()) {
              const optionWhere = `${where}.options[${index}]`;
              expect(Object.keys(option).sort(), optionWhere).toEqual(['id', 'label', 'value']);
              expect(option['id'] as string, `${optionWhere}.id`).toMatch(ID_PATTERN);
              expect(codePoints(option['label'] as string), `${optionWhere}.label`).toBeGreaterThan(
                0,
              );
              expect(
                codePoints(option['label'] as string),
                `${optionWhere}.label`,
              ).toBeLessThanOrEqual(200);
              expect((option['value'] as string).length, `${optionWhere}.value`).toBeGreaterThan(0);
              expect(
                (option['value'] as string).length,
                `${optionWhere}.value`,
              ).toBeLessThanOrEqual(100);
              expect(ids.has(option['id'] as string), `${optionWhere}.id is a duplicate`).toBe(
                false,
              );
              expect(
                values.has(option['value'] as string),
                `${optionWhere}.value is a duplicate`,
              ).toBe(false);
              ids.add(option['id'] as string);
              values.add(option['value'] as string);
            }

            if (type === 'checkbox') {
              const min = (question['minSelections'] as number | undefined) ?? 0;
              const max = (question['maxSelections'] as number | undefined) ?? options.length;
              expect(Number.isInteger(min), `${where}.minSelections`).toBe(true);
              expect(Number.isInteger(max), `${where}.maxSelections`).toBe(true);
              expect(min, `${where}.minSelections`).toBeGreaterThanOrEqual(0);
              expect(max, `${where}.maxSelections`).toBeGreaterThanOrEqual(Math.max(1, min));
              expect(max, `${where}.maxSelections`).toBeLessThanOrEqual(options.length);
            }
          }

          if (type === 'textbox' || type === 'textarea') {
            const min = (question['minLength'] as number | undefined) ?? 0;
            const max =
              (question['maxLength'] as number | undefined) ?? (type === 'textbox' ? 255 : 2000);
            expect(Number.isInteger(min), `${where}.minLength`).toBe(true);
            expect(Number.isInteger(max), `${where}.maxLength`).toBe(true);
            expect(min, `${where}.minLength`).toBeGreaterThanOrEqual(0);
            expect(max, `${where}.maxLength`).toBeGreaterThanOrEqual(Math.max(1, min));
            expect(max, `${where}.maxLength`).toBeLessThanOrEqual(MAX_LENGTH_CEILING[type]);
          }

          if (type === 'rating' && question['scale'] !== undefined) {
            const scale = asObject(question['scale'], `${where}.scale`);
            expect(Object.keys(scale).sort(), `${where}.scale`).toEqual(['max', 'min']);
            const min = scale['min'] as number;
            const max = scale['max'] as number;
            expect(Number.isInteger(min), `${where}.scale.min`).toBe(true);
            expect(Number.isInteger(max), `${where}.scale.max`).toBe(true);
            expect(min, `${where}.scale.min`).toBeGreaterThanOrEqual(0);
            expect(max, `${where}.scale.max`).toBeGreaterThan(min);
            expect(max, `${where}.scale.max`).toBeLessThanOrEqual(10);
          }

          if (question['attachments'] !== undefined) {
            const policy = asObject(question['attachments'], `${where}.attachments`);
            const maxFiles = policy['maxFiles'];
            expect(Number.isInteger(maxFiles), `${where}.attachments.maxFiles`).toBe(true);
            expect(maxFiles as number, `${where}.attachments.maxFiles`).toBeGreaterThanOrEqual(0);
            expect(maxFiles as number, `${where}.attachments.maxFiles`).toBeLessThanOrEqual(3);
            if ((maxFiles as number) === 0) {
              expect(Object.keys(policy), `${where}.attachments`).toEqual(['maxFiles']);
              continue;
            }
            expect(Object.keys(policy).sort(), `${where}.attachments`).toEqual([
              'acceptedTypes',
              'maxFiles',
              'maxSizeBytes',
            ]);
            const acceptedTypes = asArray(
              policy['acceptedTypes'],
              `${where}.attachments.acceptedTypes`,
            ) as readonly string[];
            expect(acceptedTypes.length, `${where}.attachments.acceptedTypes`).toBeGreaterThan(0);
            expect(
              new Set(acceptedTypes).size,
              `${where}.attachments.acceptedTypes has duplicates`,
            ).toBe(acceptedTypes.length);
            for (const [index, accepted] of acceptedTypes.entries()) {
              const acceptedWhere = `${where}.attachments.acceptedTypes[${index}]`;
              expect(accepted, acceptedWhere).toBe(accepted.toLowerCase());
              expect(accepted, acceptedWhere).not.toContain('*');
              expect(accepted, acceptedWhere).toMatch(ACCEPTED_TYPE_PATTERN);
            }
            const maxSizeBytes = policy['maxSizeBytes'];
            expect(Number.isInteger(maxSizeBytes), `${where}.attachments.maxSizeBytes`).toBe(true);
            expect(
              maxSizeBytes as number,
              `${where}.attachments.maxSizeBytes`,
            ).toBeGreaterThanOrEqual(1);
            expect(maxSizeBytes as number, `${where}.attachments.maxSizeBytes`).toBeLessThanOrEqual(
              MAX_SIZE_BYTES_CEILING,
            );
          }
        }
      }
    });
  });

  describe('the default customer-feedback fixture', () => {
    const config = asObject(
      readJsonFile(resolve(PUBLIC_DIR, 'surveys/customer-feedback.json')),
      'customer-feedback',
    );
    const pages = asArray(config['pages'], 'pages').map((raw, index) =>
      asObject(raw, `pages[${index}]`),
    );
    const questions = pages.flatMap((page, pageIndex) =>
      asArray(page['questions'], `pages[${pageIndex}].questions`).map((raw, questionIndex) =>
        asObject(raw, `pages[${pageIndex}].questions[${questionIndex}]`),
      ),
    );

    it('has the four pages of contract §5, in order', () => {
      expect(pages.map((page) => [page['id'], page['title']])).toEqual([
        ['about-you', 'About You'],
        ['your-experience', 'Your Experience'],
        ['supporting-files', 'Supporting Files'],
        ['final-thoughts', 'Final Thoughts'],
      ]);
    });

    it('leaves page 2 without a description, so the no-description path is exercised', () => {
      expect(pages[1]?.['description']).toBeUndefined();
      expect(pages[0]?.['description']).toBe('Who we are hearing from.');
    });

    it('has the eight questions of contract §5, in order', () => {
      expect(questions.map((question) => [question['id'], question['type']])).toEqual([
        ['q_name', 'textbox'],
        ['q_segment', 'radio'],
        ['q_satisfaction', 'satisfaction'],
        ['q_liked', 'checkbox'],
        ['q_delivery', 'rating'],
        ['q_evidence', 'textarea'],
        ['q_comments', 'textarea'],
        ['q_recommend', 'radio'],
      ]);
    });

    it('exercises all six question types', () => {
      expect(new Set(questions.map((question) => question['type']))).toEqual(
        new Set(QUESTION_TYPES),
      );
    });

    it('carries the exact rules contract §5 requires', () => {
      const byId = new Map(questions.map((question) => [question['id'] as string, question]));

      expect(byId.get('q_name')?.['required']).toBe(true);
      expect(byId.get('q_name')?.['minLength']).toBe(2);
      expect(byId.get('q_name')?.['maxLength']).toBe(80);

      expect(byId.get('q_segment')?.['required']).toBe(true);
      expect(asArray(byId.get('q_segment')?.['options'], 'q_segment.options').length).toBe(3);

      expect(byId.get('q_satisfaction')?.['required']).toBe(true);
      expect(byId.get('q_satisfaction')?.['scale']).toBeUndefined();

      expect(byId.get('q_liked')?.['required']).toBe(true);
      expect(asArray(byId.get('q_liked')?.['options'], 'q_liked.options').length).toBe(5);
      expect(byId.get('q_liked')?.['minSelections']).toBe(1);
      expect(byId.get('q_liked')?.['maxSelections']).toBe(3);

      expect(byId.get('q_delivery')?.['required']).toBeUndefined();
      expect(byId.get('q_delivery')?.['scale']).toEqual({ min: 1, max: 5 });

      expect(byId.get('q_evidence')?.['required']).toBeUndefined();
      expect(byId.get('q_evidence')?.['maxLength']).toBe(1000);
      expect(byId.get('q_evidence')?.['attachments']).toEqual({
        maxFiles: 3,
        acceptedTypes: ['image/png', 'image/jpeg', 'application/pdf'],
        maxSizeBytes: 5242880,
      });

      expect(byId.get('q_comments')?.['maxLength']).toBe(2000);
      expect(byId.get('q_comments')?.['attachments']).toBeUndefined();

      expect(byId.get('q_recommend')?.['required']).toBe(true);
      expect(asArray(byId.get('q_recommend')?.['options'], 'q_recommend.options').length).toBe(3);
    });
  });

  describe('the invalid fixtures', () => {
    it('covers every config failure class the validator owns, F01 to F16', () => {
      expect(INVALID_SURVEY_CONFIG_CASES.map((testCase) => testCase.code)).toEqual([
        'F01',
        'F02',
        'F03',
        'F04',
        'F05',
        'F06',
        'F07',
        'F08',
        'F09',
        'F10',
        'F11',
        'F12',
        'F13',
        'F14',
        'F15',
        'F16',
      ]);
    });

    it('covers every manifest failure class', () => {
      expect(INVALID_MANIFEST_CASES.map((testCase) => testCase.code)).toEqual([
        'F01',
        'F02',
        'F03',
        'F06',
        'F07',
        'F13',
      ]);
    });

    it('is not reachable from the manifest — an invalid fixture is never served', () => {
      const configPaths = MANIFEST_ENTRIES.map((entry) => entry.config);
      expect(configPaths.every((path) => path.startsWith('surveys/'))).toBe(true);
    });

    it.each([...INVALID_SURVEY_CONFIG_CASES, ...INVALID_MANIFEST_CASES])(
      '$name is genuinely unparseable or genuinely an object',
      (testCase) => {
        if (testCase.unparseable === true) {
          expect(typeof testCase.raw).toBe('string');
          expect(() => JSON.parse(testCase.raw as string)).toThrow();
        } else {
          expect(isObject(testCase.raw)).toBe(true);
        }
      },
    );
  });
});

// --- half 2: the validators themselves ---------------------------------------------

describe.skipIf(!VALIDATORS_LIVE)('validated against core/validators', () => {
  let validateSurveyConfig: ConfigValidator;
  let validateSurveyManifest: ManifestValidator;

  beforeAll(async () => {
    // Absolute specifiers, because the modules do not exist until Phase 2C lands and a
    // static import would fail at transform time rather than skip.
    const configModule: Record<string, unknown> = await import(
      /* @vite-ignore */ CONFIG_VALIDATOR_MODULE as string
    );
    const manifestModule: Record<string, unknown> = await import(
      /* @vite-ignore */ MANIFEST_VALIDATOR_MODULE as string
    );
    const config = configModule['validateSurveyConfig'];
    const manifest = manifestModule['validateSurveyManifest'];
    if (typeof config !== 'function' || typeof manifest !== 'function') {
      throw new Error(
        'core/validators exists but does not export validateSurveyConfig and validateSurveyManifest',
      );
    }
    validateSurveyConfig = config as ConfigValidator;
    validateSurveyManifest = manifest as ManifestValidator;
  });

  it('accepts the authored manifest', () => {
    expect(validateSurveyManifest(readJsonFile(MANIFEST_FILE)).outcome).toBe('valid');
  });

  it.each(MANIFEST_ENTRIES)('accepts the $key config served under its own key', (entry) => {
    const result = validateSurveyConfig(readJsonFile(entry.configFile), entry.key);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.outcome).toBe('valid');
  });

  it('normalises the default fixture as contract §5 and §10.1 require', () => {
    const result = validateSurveyConfig(
      readJsonFile(resolve(PUBLIC_DIR, 'surveys/customer-feedback.json')),
      'customer-feedback',
    );
    expect(result.outcome).toBe('valid');
    const survey = asObject(result.survey, 'survey');
    const pages = asArray(survey['pages'], 'pages').map((page, index) =>
      asObject(page, `pages[${index}]`),
    );
    expect(pages).toHaveLength(4);
    expect(pages[1]?.['description']).toBeNull();

    const questions = pages.flatMap((page, index) =>
      asArray(page['questions'], `pages[${index}].questions`).map((question, questionIndex) =>
        asObject(question, `pages[${index}].questions[${questionIndex}]`),
      ),
    );
    expect(questions.map((question) => question['id'])).toEqual([
      'q_name',
      'q_segment',
      'q_satisfaction',
      'q_liked',
      'q_delivery',
      'q_evidence',
      'q_comments',
      'q_recommend',
    ]);

    const byId = new Map(questions.map((question) => [question['id'] as string, question]));
    expect(byId.get('q_name')?.['maxLength']).toBe(80);
    expect(byId.get('q_name')?.['minLength']).toBe(2);
    expect(byId.get('q_delivery')?.['required']).toBe(false);
    expect(byId.get('q_delivery')?.['scale']).toEqual({ min: 1, max: 5 });
    expect(
      asObject(byId.get('q_evidence')?.['attachments'], 'q_evidence.attachments')['maxFiles'],
    ).toBe(3);
    expect(byId.get('q_comments')?.['attachments']).toBeNull();
    expect(byId.get('q_comments')?.['minLength']).toBe(0);
  });

  it.each(INVALID_SURVEY_CONFIG_CASES)('rejects $name at its own path', (testCase) => {
    const result = validateSurveyConfig(testCase.raw, testCase.servedKey);
    expect(result.outcome).toBe('invalid');
    const issues = result.error?.issues ?? [];
    expect(issues.map((issue) => [issue.code, issue.path])).toContainEqual([
      testCase.code,
      testCase.path,
    ]);
  });

  it.each(INVALID_MANIFEST_CASES)('rejects manifest $name at its own path', (testCase) => {
    const result = validateSurveyManifest(testCase.raw);
    expect(result.outcome).toBe('invalid');
    const issues = result.error?.issues ?? [];
    expect(issues.map((issue) => [issue.code, issue.path])).toContainEqual([
      testCase.code,
      testCase.path,
    ]);
  });
});
