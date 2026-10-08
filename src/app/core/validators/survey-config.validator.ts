/**
 * `unknown` → `Survey` — T023, implementing `contracts/survey-json.md` §9 rules R03 to
 * R52 one-to-one, in the order the contract gives them.
 *
 * Two properties make this the fail-closed core of the feature (Principle I):
 *
 * - `raw` is `unknown` and a `Survey` cannot be constructed without passing, so FR-042
 *   ("validation completes before any part of the survey renders") is a property of the
 *   type system rather than a rule someone has to remember.
 * - Every normalised default is applied **here and nowhere else** (plan §6.1): `minLength`
 *   0, `maxLength` 255 for `textbox` / 2000 for `textarea`, `scale` `{ min: 1, max: 5 }`,
 *   `required` false, `attachments` `null` when absent or when `maxFiles` is 0.
 *
 * Descent order per §9.7: a structural failure (R03, R11, R19) stops descent into the
 * thing that failed, but sibling elements are still checked, so a config with two bad
 * questions reports two issues.
 */

import { assertNever } from '../models/assert-never';
import { brand, isAtLeastTwo, isNonEmpty } from '../models/branded';
import type {
  AtLeastTwo,
  NonEmpty,
  OptionValue,
  PageId,
  QuestionId,
  SurveyKey,
} from '../models/branded';
import { QUESTION_TYPES } from '../models/survey.model';
import type {
  AcceptedFileType,
  AttachmentPolicy,
  Question,
  QuestionType,
  Survey,
  SurveyOption,
  SurveyPage,
} from '../models/survey.model';
import type {
  ConfigFailureCode,
  ConfigIssue,
  SurveyValidation,
} from '../models/survey-config-error.model';
import {
  codePointLength,
  hasContent,
  missingKeys,
  rejectUnknownKeys,
  requireArray,
  requireBoolean,
  requireInt,
  requireObject,
  requireString,
} from './json-reader';
import type { JsonObject } from './json-reader';

// --- the contract, as constants -----------------------------------------------------

export const SURVEY_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
export const ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,63}$/;

const DOCUMENT_KEYS = ['key', 'title', 'description', 'pages'] as const;
const PAGE_KEYS = ['id', 'title', 'description', 'questions'] as const;
const COMMON_QUESTION_KEYS = [
  'id',
  'type',
  'title',
  'description',
  'required',
  'attachments',
] as const;

/** Contract §2: a question carries only the fields listed for its own type. */
const TYPE_SPECIFIC_KEYS: Readonly<Record<QuestionType, readonly string[]>> = {
  radio: ['options'],
  checkbox: ['options', 'minSelections', 'maxSelections'],
  textbox: ['minLength', 'maxLength'],
  textarea: ['minLength', 'maxLength'],
  rating: ['scale'],
  satisfaction: [],
};

/** Every key the contract defines anywhere on a question, for the R22 F05/F03 split. */
const ALL_QUESTION_KEYS: readonly string[] = [
  ...COMMON_QUESTION_KEYS,
  ...QUESTION_TYPES.flatMap((type) => TYPE_SPECIFIC_KEYS[type]),
];

const OPTION_KEYS = ['id', 'label', 'value'] as const;
const SCALE_KEYS = ['min', 'max'] as const;
const ATTACHMENT_KEYS = ['maxFiles', 'acceptedTypes', 'maxSizeBytes'] as const;

const MAX_LENGTH_DEFAULT: Readonly<Record<'textbox' | 'textarea', number>> = {
  textbox: 255,
  textarea: 2000,
};
const MAX_LENGTH_CEILING: Readonly<Record<'textbox' | 'textarea', number>> = {
  textbox: 255,
  textarea: 5000,
};

const MAX_SIZE_BYTES_CEILING = 10_485_760;
const ACCEPTED_TYPE_PATTERN =
  /^([a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*|\.[a-z0-9]+)$/;

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 300;
const QUESTION_TITLE_MAX = 300;
const QUESTION_DESCRIPTION_MAX = 500;
const OPTION_LABEL_MAX = 200;
const OPTION_VALUE_MAX = 100;

// --- the issue collector ------------------------------------------------------------

/**
 * Collects issues as the walk descends. Separate from the walk so that "stop descending
 * into the thing that failed, keep checking its siblings" is expressed by returning
 * `undefined` from a reader rather than by a flag someone has to thread through.
 */
class IssueLog {
  private readonly issues: ConfigIssue[] = [];

  add(code: ConfigFailureCode, path: string, message: string): undefined {
    this.issues.push({ code, path, message });
    return undefined;
  }

  get all(): readonly ConfigIssue[] {
    return this.issues;
  }
}

/** The F06 wording: `expected a boolean, got "yes"`. */
function wrongType(path: string, expected: string, actual: string): string {
  return `${path}: expected ${expected}, got ${actual}`;
}

// --- shared field readers ------------------------------------------------------------

/** A trimmed optional description: absent or empty becomes `null`. */
function readOptionalDescription(
  log: IssueLog,
  object: JsonObject,
  path: string,
  key: string,
  maxCodePoints: number,
): string | null | undefined {
  const raw = object[key];
  if (raw === undefined) {
    return null;
  }
  const read = requireString(raw);
  if (!read.ok) {
    return log.add('F06', path, wrongType(path, 'a string', read.actual));
  }
  if (codePointLength(read.value) > maxCodePoints) {
    return log.add(
      'F13',
      path,
      `${path}: must be at most ${maxCodePoints} characters, got ${codePointLength(read.value)}`,
    );
  }
  const trimmed = read.value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** A required, non-empty, length-bounded title. F06 / F13. */
function readTitle(
  log: IssueLog,
  object: JsonObject,
  path: string,
  key: string,
  maxCodePoints: number,
): string | undefined {
  const read = requireString(object[key]);
  if (!read.ok) {
    return log.add('F06', path, wrongType(path, 'a string', read.actual));
  }
  if (!hasContent(read.value)) {
    return log.add('F13', path, `${path}: must not be empty`);
  }
  if (codePointLength(read.value) > maxCodePoints) {
    return log.add(
      'F13',
      path,
      `${path}: must be at most ${maxCodePoints} characters, got ${codePointLength(read.value)}`,
    );
  }
  return read.value.trim();
}

/** A required id string matching `pattern`. F06 / F13. */
function readId(
  log: IssueLog,
  object: JsonObject,
  path: string,
  key: string,
  pattern: RegExp,
): string | undefined {
  const read = requireString(object[key]);
  if (!read.ok) {
    return log.add('F06', path, wrongType(path, 'a string', read.actual));
  }
  if (!pattern.test(read.value)) {
    return log.add(
      'F13',
      path,
      `${path}: ${JSON.stringify(read.value)} does not match ${pattern.source}`,
    );
  }
  return read.value;
}

/** An optional integer with a floor. F06 / F13. `undefined` means absent. */
function readOptionalInt(
  log: IssueLog,
  object: JsonObject,
  path: string,
  key: string,
  minimum: number,
): number | null | undefined {
  const raw = object[key];
  if (raw === undefined) {
    return null;
  }
  const read = requireInt(raw);
  if (!read.ok) {
    return log.add('F06', path, wrongType(path, 'an integer', read.actual));
  }
  if (read.value < minimum) {
    return log.add('F13', path, `${path}: must be at least ${minimum}, got ${read.value}`);
  }
  return read.value;
}

// --- R46 to R52: the attachment policy ----------------------------------------------

function readAttachmentPolicy(
  log: IssueLog,
  raw: unknown,
  basePath: string,
): AttachmentPolicy | null | undefined {
  const object = requireObject(raw);
  if (!object.ok) {
    return log.add('F06', basePath, wrongType(basePath, 'an object', object.actual));
  }

  // R46 — only the three contract keys.
  const unknownKeys = rejectUnknownKeys(object.value, ATTACHMENT_KEYS);
  const firstUnknown = unknownKeys[0];
  if (firstUnknown !== undefined) {
    const path = `${basePath}.${firstUnknown}`;
    return log.add('F03', path, `${path}: unknown field`);
  }

  // R47 — `maxFiles` present and an integer in 0 to 3.
  const maxFilesPath = `${basePath}.maxFiles`;
  const rawMaxFiles = object.value['maxFiles'];
  if (rawMaxFiles === undefined) {
    return log.add('F02', maxFilesPath, `${maxFilesPath}: required field is missing`);
  }
  const maxFiles = requireInt(rawMaxFiles);
  if (!maxFiles.ok) {
    return log.add('F15', maxFilesPath, wrongType(maxFilesPath, 'an integer', maxFiles.actual));
  }
  if (maxFiles.value < 0 || maxFiles.value > 3) {
    return log.add(
      'F15',
      maxFilesPath,
      `${maxFilesPath}: must be between 0 and 3, got ${maxFiles.value}`,
    );
  }

  // R48 — `maxFiles: 0` turns attachments off, and carries no other key.
  if (maxFiles.value === 0) {
    const extra = rejectUnknownKeys(object.value, ['maxFiles']);
    const firstExtra = extra[0];
    if (firstExtra !== undefined) {
      const path = `${basePath}.${firstExtra}`;
      return log.add('F15', path, `${path}: not valid when maxFiles is 0`);
    }
    return null;
  }

  // R49 — above 0, both other keys are required.
  const missing = missingKeys(object.value, ['acceptedTypes', 'maxSizeBytes']);
  const firstMissing = missing[0];
  if (firstMissing !== undefined) {
    const path = `${basePath}.${firstMissing}`;
    return log.add('F15', path, `${path}: required when maxFiles is ${maxFiles.value}`);
  }

  // R50, R51 — a non-empty array of lowercase MIME types or extensions, no duplicate,
  // no wildcard.
  const typesPath = `${basePath}.acceptedTypes`;
  const types = requireArray(object.value['acceptedTypes']);
  if (!types.ok) {
    return log.add('F15', typesPath, wrongType(typesPath, 'an array', types.actual));
  }
  if (types.value.length === 0) {
    return log.add('F15', typesPath, `${typesPath}: must list at least one accepted type`);
  }

  const acceptedTypes: AcceptedFileType[] = [];
  for (const [index, entry] of types.value.entries()) {
    const entryPath = `${typesPath}[${index}]`;
    const read = requireString(entry);
    if (!read.ok) {
      return log.add('F15', entryPath, wrongType(entryPath, 'a string', read.actual));
    }
    if (read.value.includes('*')) {
      return log.add('F15', entryPath, `${entryPath}: a wildcard is not an accepted type`);
    }
    if (!ACCEPTED_TYPE_PATTERN.test(read.value)) {
      return log.add(
        'F15',
        entryPath,
        `${entryPath}: ${JSON.stringify(read.value)} is neither a lowercase MIME type nor a .extension`,
      );
    }
    const typed: AcceptedFileType = read.value as AcceptedFileType;
    if (acceptedTypes.includes(typed)) {
      return log.add(
        'F15',
        entryPath,
        `${entryPath}: duplicate accepted type ${JSON.stringify(read.value)}`,
      );
    }
    acceptedTypes.push(typed);
  }
  const [firstType, ...restTypes] = acceptedTypes;
  if (firstType === undefined) {
    // Unreachable: the empty array is refused above and the loop returns on the first bad
    // entry. Narrowed by destructuring rather than by a cast, so the type stays honest.
    throw new Error(`${typesPath}: accepted types narrowed to nothing`);
  }
  const narrowedTypes: NonEmpty<AcceptedFileType> = [firstType, ...restTypes];

  // R52 — `maxSizeBytes` an integer in 1 to 10485760.
  const sizePath = `${basePath}.maxSizeBytes`;
  const size = requireInt(object.value['maxSizeBytes']);
  if (!size.ok) {
    return log.add('F15', sizePath, wrongType(sizePath, 'an integer', size.actual));
  }
  if (size.value < 1 || size.value > MAX_SIZE_BYTES_CEILING) {
    return log.add(
      'F15',
      sizePath,
      `${sizePath}: must be between 1 and ${MAX_SIZE_BYTES_CEILING}, got ${size.value}`,
    );
  }

  const maxFilesNarrowed: 1 | 2 | 3 = maxFiles.value === 1 ? 1 : maxFiles.value === 2 ? 2 : 3;
  return {
    maxFiles: maxFilesNarrowed,
    acceptedTypes: narrowedTypes,
    maxSizeBytes: size.value,
  };
}

// --- R29 to R33: options -------------------------------------------------------------

function readOptions(
  log: IssueLog,
  object: JsonObject,
  basePath: string,
  type: 'radio' | 'checkbox',
): AtLeastTwo<SurveyOption> | undefined {
  const optionsPath = `${basePath}.options`;

  // R29 — present and an array.
  const raw = object['options'];
  if (raw === undefined) {
    return log.add('F02', optionsPath, `${optionsPath}: required field is missing`);
  }
  const array = requireArray(raw);
  if (!array.ok) {
    return log.add('F06', optionsPath, wrongType(optionsPath, 'an array', array.actual));
  }

  // R30 — at least two.
  if (array.value.length < 2) {
    return log.add(
      'F10',
      optionsPath,
      `${optionsPath}: a ${type} question needs at least 2 options, got ${array.value.length}`,
    );
  }

  const parsed: SurveyOption[] = [];
  const seenIds = new Set<string>();
  const seenValues = new Set<string>();
  let failed = false;

  for (const [index, entry] of array.value.entries()) {
    const path = `${optionsPath}[${index}]`;

    // R31 — an object whose only keys are the three, all present.
    const optionObject = requireObject(entry);
    if (!optionObject.ok) {
      log.add('F06', path, wrongType(path, 'an object', optionObject.actual));
      failed = true;
      continue;
    }
    const unknownKeys = rejectUnknownKeys(optionObject.value, OPTION_KEYS);
    const firstUnknown = unknownKeys[0];
    if (firstUnknown !== undefined) {
      const unknownPath = `${path}.${firstUnknown}`;
      log.add('F03', unknownPath, `${unknownPath}: unknown field`);
      failed = true;
      continue;
    }
    const missing = missingKeys(optionObject.value, OPTION_KEYS);
    const firstMissing = missing[0];
    if (firstMissing !== undefined) {
      const missingPath = `${path}.${firstMissing}`;
      log.add('F02', missingPath, `${missingPath}: required field is missing`);
      failed = true;
      continue;
    }

    // R32 — id pattern, label non-empty and bounded, value non-empty and bounded.
    const id = readId(log, optionObject.value, `${path}.id`, 'id', ID_PATTERN);
    const label = readTitle(log, optionObject.value, `${path}.label`, 'label', OPTION_LABEL_MAX);
    const valueRead = requireString(optionObject.value['value']);
    let value: string | undefined;
    if (!valueRead.ok) {
      log.add('F06', `${path}.value`, wrongType(`${path}.value`, 'a string', valueRead.actual));
    } else if (valueRead.value.length === 0) {
      log.add('F13', `${path}.value`, `${path}.value: must not be empty`);
    } else if (valueRead.value.length > OPTION_VALUE_MAX) {
      log.add(
        'F13',
        `${path}.value`,
        `${path}.value: must be at most ${OPTION_VALUE_MAX} characters, got ${valueRead.value.length}`,
      );
    } else {
      value = valueRead.value;
    }

    if (id === undefined || label === undefined || value === undefined) {
      failed = true;
      continue;
    }

    // R33 — no id and no value repeats within the question.
    if (seenIds.has(id)) {
      log.add('F09', `${path}.id`, `${path}.id: duplicate option id ${JSON.stringify(id)}`);
      failed = true;
      continue;
    }
    if (seenValues.has(value)) {
      log.add(
        'F09',
        `${path}.value`,
        `${path}.value: duplicate option value ${JSON.stringify(value)}`,
      );
      failed = true;
      continue;
    }
    seenIds.add(id);
    seenValues.add(value);
    parsed.push({ id, label, value: brand<OptionValue>(value) });
  }

  if (failed || !isAtLeastTwo(parsed)) {
    return undefined;
  }
  return parsed;
}

// --- R19 to R45: one question --------------------------------------------------------

interface QuestionContext {
  readonly log: IssueLog;
  readonly seenQuestionIds: Set<string>;
}

function readQuestion(
  context: QuestionContext,
  raw: unknown,
  basePath: string,
): Question | undefined {
  const { log } = context;

  // R19 — the element is an object. A failure here stops descent into it.
  const object = requireObject(raw);
  if (!object.ok) {
    return log.add('F06', basePath, wrongType(basePath, 'an object', object.actual));
  }

  // R20 — `type` present and a string.
  const typePath = `${basePath}.type`;
  const rawType = object.value['type'];
  if (rawType === undefined) {
    return log.add('F02', typePath, `${typePath}: required field is missing`);
  }
  const typeRead = requireString(rawType);
  if (!typeRead.ok) {
    return log.add('F06', typePath, wrongType(typePath, 'a string', typeRead.actual));
  }

  // R21 — one of the six. Without a known type, no type-specific rule can run.
  const matched = QUESTION_TYPES.find((candidate) => candidate === typeRead.value);
  if (matched === undefined) {
    return log.add(
      'F04',
      typePath,
      `${typePath}: unknown question type ${JSON.stringify(typeRead.value)}`,
    );
  }
  const type: QuestionType = matched;

  // R22 — only the common keys and this type's own keys. A contract field that belongs
  // to another type is F05; a field the contract defines nowhere is F03.
  const allowed = [...COMMON_QUESTION_KEYS, ...TYPE_SPECIFIC_KEYS[type]];
  const unknownKeys = rejectUnknownKeys(object.value, allowed);
  const firstUnknown = unknownKeys[0];
  if (firstUnknown !== undefined) {
    const path = `${basePath}.${firstUnknown}`;
    return ALL_QUESTION_KEYS.includes(firstUnknown)
      ? log.add('F05', path, `${path}: not valid for a ${type} question`)
      : log.add('F03', path, `${path}: unknown field`);
  }

  // R23 — `id` and `title` present.
  const missing = missingKeys(object.value, ['id', 'title']);
  const firstMissing = missing[0];
  if (firstMissing !== undefined) {
    const path = `${basePath}.${firstMissing}`;
    return log.add('F02', path, `${path}: required field is missing`);
  }

  // R24 — `id` pattern.
  const id = readId(log, object.value, `${basePath}.id`, 'id', ID_PATTERN);
  if (id === undefined) {
    return undefined;
  }

  // R25 — unique across the whole survey, not merely within its page.
  if (context.seenQuestionIds.has(id)) {
    const path = `${basePath}.id`;
    return log.add('F08', path, `${path}: duplicate question id ${JSON.stringify(id)}`);
  }
  context.seenQuestionIds.add(id);

  // R26, R27 — title and description.
  const title = readTitle(log, object.value, `${basePath}.title`, 'title', QUESTION_TITLE_MAX);
  const description = readOptionalDescription(
    log,
    object.value,
    `${basePath}.description`,
    'description',
    QUESTION_DESCRIPTION_MAX,
  );

  // R28 — `required`, when present, is a boolean. Absent → false.
  let required = false;
  const rawRequired = object.value['required'];
  if (rawRequired !== undefined) {
    const read = requireBoolean(rawRequired);
    if (!read.ok) {
      const path = `${basePath}.required`;
      log.add('F06', path, wrongType(path, 'a boolean', read.actual));
      return undefined;
    }
    required = read.value;
  }

  // R46–R52 — the attachment policy. Absent → null.
  let attachments: AttachmentPolicy | null = null;
  const rawAttachments = object.value['attachments'];
  if (rawAttachments !== undefined) {
    const policy = readAttachmentPolicy(log, rawAttachments, `${basePath}.attachments`);
    if (policy === undefined) {
      return undefined;
    }
    attachments = policy;
  }

  if (title === undefined || description === undefined) {
    return undefined;
  }

  const common = {
    id: brand<QuestionId>(id),
    title,
    description,
    required,
    attachments,
  };

  switch (type) {
    case 'radio': {
      const options = readOptions(log, object.value, basePath, 'radio');
      return options === undefined ? undefined : { ...common, type: 'radio', options };
    }
    case 'checkbox':
      return readCheckbox(log, object.value, basePath, common);
    case 'textbox':
    case 'textarea':
      return readText(log, object.value, basePath, common, type);
    case 'rating':
      return readRating(log, object.value, basePath, common);
    case 'satisfaction':
      // R45 — no type-specific key exists; `scale` here was already F05 at R22.
      return { ...common, type: 'satisfaction' };
  }
  // No `default` branch: a seventh question type is a build failure here (plan §5.3).
  return assertNever(type);
}

type CommonFields = {
  readonly id: QuestionId;
  readonly title: string;
  readonly description: string | null;
  readonly required: boolean;
  readonly attachments: AttachmentPolicy | null;
};

/** R34 to R38. */
function readCheckbox(
  log: IssueLog,
  object: JsonObject,
  basePath: string,
  common: CommonFields,
): Question | undefined {
  const options = readOptions(log, object, basePath, 'checkbox');
  if (options === undefined) {
    return undefined;
  }

  const minRead = readOptionalInt(log, object, `${basePath}.minSelections`, 'minSelections', 0);
  if (minRead === undefined) {
    return undefined;
  }
  const maxRead = readOptionalInt(log, object, `${basePath}.maxSelections`, 'maxSelections', 1);
  if (maxRead === undefined) {
    return undefined;
  }

  const minSelections = minRead ?? 0;
  const maxSelections = maxRead ?? options.length;

  // R36 — before R37, per contract §10.5's worked example.
  if (minSelections > maxSelections) {
    const path = `${basePath}.maxSelections`;
    return log.add(
      'F13',
      path,
      `${path}: must be at least minSelections (${minSelections}), got ${maxSelections}`,
    );
  }
  // R37 — unsatisfiable: more selections required than options exist.
  if (minSelections > options.length) {
    const path = `${basePath}.minSelections`;
    return log.add(
      'F12',
      path,
      `${path}: ${minSelections} selections required but only ${options.length} options exist`,
    );
  }
  // R38.
  if (maxSelections > options.length) {
    const path = `${basePath}.maxSelections`;
    return log.add(
      'F13',
      path,
      `${path}: must be at most the option count (${options.length}), got ${maxSelections}`,
    );
  }

  return { ...common, type: 'checkbox', options, minSelections, maxSelections };
}

/** R39 to R42. */
function readText(
  log: IssueLog,
  object: JsonObject,
  basePath: string,
  common: CommonFields,
  type: 'textbox' | 'textarea',
): Question | undefined {
  const minRead = readOptionalInt(log, object, `${basePath}.minLength`, 'minLength', 0);
  if (minRead === undefined) {
    return undefined;
  }
  const maxRead = readOptionalInt(log, object, `${basePath}.maxLength`, 'maxLength', 1);
  if (maxRead === undefined) {
    return undefined;
  }

  const minLength = minRead ?? 0;
  const maxLength = maxRead ?? MAX_LENGTH_DEFAULT[type];

  // R41 — inverted rule.
  if (maxLength < minLength) {
    const path = `${basePath}.maxLength`;
    return log.add('F13', path, `${path}: must be at least minLength (${minLength})`);
  }
  // R42 — the per-type ceiling.
  if (maxLength > MAX_LENGTH_CEILING[type]) {
    const path = `${basePath}.maxLength`;
    return log.add(
      'F13',
      path,
      `${path}: must be at most ${MAX_LENGTH_CEILING[type]} for a ${type} question, got ${maxLength}`,
    );
  }

  return { ...common, type, minLength, maxLength };
}

/** R43 and R44. */
function readRating(
  log: IssueLog,
  object: JsonObject,
  basePath: string,
  common: CommonFields,
): Question | undefined {
  const scalePath = `${basePath}.scale`;
  const raw = object['scale'];
  if (raw === undefined) {
    return { ...common, type: 'rating', scale: { min: 1, max: 5 } };
  }

  // R43 — an object whose only keys are `min` and `max`, both present integers.
  const scaleObject = requireObject(raw);
  if (!scaleObject.ok) {
    return log.add('F06', scalePath, wrongType(scalePath, 'an object', scaleObject.actual));
  }
  const unknownKeys = rejectUnknownKeys(scaleObject.value, SCALE_KEYS);
  const firstUnknown = unknownKeys[0];
  if (firstUnknown !== undefined) {
    const path = `${scalePath}.${firstUnknown}`;
    return log.add('F03', path, `${path}: unknown field`);
  }
  const missing = missingKeys(scaleObject.value, SCALE_KEYS);
  const firstMissing = missing[0];
  if (firstMissing !== undefined) {
    const path = `${scalePath}.${firstMissing}`;
    return log.add('F02', path, `${path}: required field is missing`);
  }
  const min = requireInt(scaleObject.value['min']);
  if (!min.ok) {
    return log.add(
      'F06',
      `${scalePath}.min`,
      wrongType(`${scalePath}.min`, 'an integer', min.actual),
    );
  }
  const max = requireInt(scaleObject.value['max']);
  if (!max.ok) {
    return log.add(
      'F06',
      `${scalePath}.max`,
      wrongType(`${scalePath}.max`, 'an integer', max.actual),
    );
  }

  // R44 — `0 <= min < max <= 10`.
  if (min.value < 0) {
    return log.add(
      'F14',
      `${scalePath}.min`,
      `${scalePath}.min: must be at least 0, got ${min.value}`,
    );
  }
  if (min.value >= max.value) {
    return log.add(
      'F14',
      `${scalePath}.max`,
      `${scalePath}.max: must be greater than min (${min.value}), got ${max.value}`,
    );
  }
  if (max.value > 10) {
    return log.add(
      'F14',
      `${scalePath}.max`,
      `${scalePath}.max: must be at most 10, got ${max.value}`,
    );
  }

  return { ...common, type: 'rating', scale: { min: min.value, max: max.value } };
}

// --- R11 to R18: one page ------------------------------------------------------------

function readPage(
  context: QuestionContext,
  raw: unknown,
  index: number,
  seenPageIds: Set<string>,
): SurveyPage | undefined {
  const { log } = context;
  const basePath = `pages[${index}]`;

  // R11 — the element is an object. A failure stops descent into it.
  const object = requireObject(raw);
  if (!object.ok) {
    return log.add('F06', basePath, wrongType(basePath, 'an object', object.actual));
  }

  // R12 — only the four contract keys.
  const unknownKeys = rejectUnknownKeys(object.value, PAGE_KEYS);
  const firstUnknown = unknownKeys[0];
  if (firstUnknown !== undefined) {
    const path = `${basePath}.${firstUnknown}`;
    return log.add('F03', path, `${path}: unknown field`);
  }

  // R13 — `id`, `title`, `questions` present.
  const missing = missingKeys(object.value, ['id', 'title', 'questions']);
  const firstMissing = missing[0];
  if (firstMissing !== undefined) {
    const path = `${basePath}.${firstMissing}`;
    return log.add('F02', path, `${path}: required field is missing`);
  }

  // R14 — `id` pattern.
  const id = readId(log, object.value, `${basePath}.id`, 'id', ID_PATTERN);
  if (id === undefined) {
    return undefined;
  }

  // R15 — not seen on an earlier page.
  if (seenPageIds.has(id)) {
    const path = `${basePath}.id`;
    return log.add('F07', path, `${path}: duplicate page id ${JSON.stringify(id)}`);
  }
  seenPageIds.add(id);

  // R16, R17 — title and description.
  const title = readTitle(log, object.value, `${basePath}.title`, 'title', TITLE_MAX);
  const description = readOptionalDescription(
    log,
    object.value,
    `${basePath}.description`,
    'description',
    DESCRIPTION_MAX,
  );

  // R18 — `questions` is an array, which **may** be empty.
  const questionsPath = `${basePath}.questions`;
  const questions = requireArray(object.value['questions']);
  if (!questions.ok) {
    log.add('F06', questionsPath, wrongType(questionsPath, 'an array', questions.actual));
    return undefined;
  }

  // Sibling questions are still checked after one of them fails (§9.7).
  const parsed: Question[] = [];
  let anyQuestionFailed = false;
  for (const [questionIndex, rawQuestion] of questions.value.entries()) {
    const question = readQuestion(context, rawQuestion, `${questionsPath}[${questionIndex}]`);
    if (question === undefined) {
      anyQuestionFailed = true;
      continue;
    }
    parsed.push(question);
  }

  if (title === undefined || description === undefined || anyQuestionFailed) {
    return undefined;
  }
  return { id: brand<PageId>(id), title, description, questions: parsed };
}

// --- R03 to R10: the document --------------------------------------------------------

/**
 * Validates one survey config against `contracts/survey-json.md`, normalising every
 * optional field to its default on the way through.
 *
 * `servedKey` is the key the manifest served the file under; R07 refuses a config that
 * disagrees with it (F16), because a survey that answers to two names cannot be reasoned
 * about at the submission boundary.
 */
export function validateSurveyConfig(raw: unknown, servedKey: string): SurveyValidation {
  const log = new IssueLog();
  const subject = servedKey;

  const invalid = (): SurveyValidation => {
    const [first, ...rest] = log.all;
    if (first === undefined) {
      // Unreachable by construction: every path that returns `invalid()` logs its issue
      // first. Throwing rather than inventing an issue is what keeps
      // `NonEmpty<ConfigIssue>` honest — an error with nothing wrong stays
      // unconstructible, and a future refactor that forgets to log fails loudly.
      throw new Error(`${subject}: validation failed with no issue recorded`);
    }
    const issues: NonEmpty<ConfigIssue> = [first, ...rest];
    return { outcome: 'invalid', error: { scope: 'survey', subject, issues } };
  };

  // R03 — a JSON object, not an array, string, number, boolean or null. Exactly one issue
  // and no field examined (§9.7), which is what US5 scenario 1 asserts.
  const object = requireObject(raw);
  if (!object.ok) {
    log.add('F01', '', `${subject}: the survey configuration could not be read`);
    return invalid();
  }

  // R04 — only the four document keys.
  const unknownKeys = rejectUnknownKeys(object.value, DOCUMENT_KEYS);
  const firstUnknown = unknownKeys[0];
  if (firstUnknown !== undefined) {
    log.add('F03', firstUnknown, `${firstUnknown}: unknown field`);
    return invalid();
  }

  // R05 — `key`, `title`, `pages` present.
  const missing = missingKeys(object.value, ['key', 'title', 'pages']);
  const firstMissing = missing[0];
  if (firstMissing !== undefined) {
    log.add('F02', firstMissing, `${firstMissing}: required field is missing`);
    return invalid();
  }

  // R06 — `key` is a string matching the survey-key pattern.
  const key = readId(log, object.value, 'key', 'key', SURVEY_KEY_PATTERN);
  if (key === undefined) {
    return invalid();
  }

  // R07 — `key` equals `servedKey`.
  if (key !== servedKey) {
    log.add(
      'F16',
      'key',
      `key: config declares ${JSON.stringify(key)} but is served as ${JSON.stringify(servedKey)}`,
    );
    return invalid();
  }

  // R08, R09 — title and description.
  const title = readTitle(log, object.value, 'title', 'title', TITLE_MAX);
  const description = readOptionalDescription(
    log,
    object.value,
    'description',
    'description',
    DESCRIPTION_MAX,
  );

  // R10 — `pages` is an array with at least one element.
  const pages = requireArray(object.value['pages']);
  if (!pages.ok) {
    log.add('F06', 'pages', wrongType('pages', 'an array', pages.actual));
    return invalid();
  }
  if (pages.value.length === 0) {
    log.add('F11', 'pages', 'pages: a survey needs at least one page');
    return invalid();
  }

  const context: QuestionContext = { log, seenQuestionIds: new Set<string>() };
  const seenPageIds = new Set<string>();
  const parsedPages: SurveyPage[] = [];
  let anyPageFailed = false;
  for (const [index, rawPage] of pages.value.entries()) {
    const page = readPage(context, rawPage, index, seenPageIds);
    if (page === undefined) {
      anyPageFailed = true;
      continue;
    }
    parsedPages.push(page);
  }

  if (
    title === undefined ||
    description === undefined ||
    anyPageFailed ||
    !isNonEmpty(parsedPages)
  ) {
    return invalid();
  }

  const survey: Survey = {
    key: brand<SurveyKey>(key),
    title,
    description,
    pages: parsedPages,
  };
  return { outcome: 'valid', survey };
}
