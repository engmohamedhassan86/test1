/**
 * Deliberately invalid survey configurations — one per config-level failure class
 * in `specs/001-survey-management/contracts/survey-json.md` §4 (F01 to F16).
 *
 * F17, F18 and F19 are not here: they are decided by the fetch layer before the
 * validator is called (contract §9.0), so they have no config file to author.
 *
 * Every export is typed `unknown`, because that is exactly what
 * `validateSurveyConfig(raw: unknown, servedKey: string)` accepts. A fixture must
 * never be typed as a `Survey` — if the compiler accepted it as one, the fixture
 * would have stopped being invalid.
 *
 * `INVALID_SURVEY_CONFIG_CASES` at the bottom is the table the contract test
 * iterates. Adding a failure class means adding one export and one row; it must
 * never mean hand-writing another test.
 */

/**
 * The codes from contract §4. Declared locally rather than imported from
 * `core/models`, because these fixtures are authored by the Survey Content Author
 * against the published contract and must not wait on the model barrel.
 * Swap this for the real `ConfigFailureCode` once `core/models` exports it.
 */
export type ExpectedFailureCode =
  | 'F01'
  | 'F02'
  | 'F03'
  | 'F04'
  | 'F05'
  | 'F06'
  | 'F07'
  | 'F08'
  | 'F09'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'F13'
  | 'F14'
  | 'F15'
  | 'F16';

export interface InvalidConfigCase {
  /** Human-readable name, used as the test title. */
  readonly name: string;
  /** The failure class from contract §4 this fixture is the witness for. */
  readonly code: ExpectedFailureCode;
  /** The `ConfigIssue.path` the validator must report (contract §9). */
  readonly path: string;
  /** The key the config is served under, which F16 deliberately disagrees with. */
  readonly servedKey: string;
  /** The body as the fetch layer would hand it over: parsed, or a raw string for F01. */
  readonly raw: unknown;
  /** True only for F01, whose body is not parseable JSON at all. */
  readonly unparseable?: true;
}

/** F01 — the body is not parseable JSON. Truncated mid-array on purpose. */
export const INVALID_F01_UNPARSEABLE_BODY: unknown =
  '{ "key": "mini-pulse", "title": "Mini Pulse", "pages": [';

/** F02 — `pages[0].questions[1]` has no `title`. */
export const INVALID_F02_MISSING_REQUIRED_FIELD: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [
        { id: 'q_mood', type: 'satisfaction', title: 'How was today?' },
        { id: 'q_why', type: 'textarea' },
      ],
    },
  ],
};

/** F03 — `placeholder` is in no part of the contract. Path `pages[0].questions[0].placeholder`. */
export const INVALID_F03_UNKNOWN_FIELD: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [{ id: 'q_name', type: 'textbox', title: 'Your name', placeholder: 'Dana' }],
    },
  ],
};

/** F04 — `slider` is not one of the six types. Path `pages[1].questions[0].type`. */
export const INVALID_F04_UNKNOWN_QUESTION_TYPE: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    { id: 'p1', title: 'One', questions: [] },
    {
      id: 'p2',
      title: 'Two',
      questions: [{ id: 'q_level', type: 'slider', title: 'How much?' }],
    },
  ],
};

/**
 * F05 — `minLength` is a contract field, but only on `textbox` and `textarea`.
 * The options are deliberately valid so the only defect is the misplaced field.
 * Path `pages[0].questions[0].minLength`.
 */
export const INVALID_F05_FIELD_ON_WRONG_TYPE: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [
        {
          id: 'q_segment',
          type: 'radio',
          title: 'You are…',
          minLength: 2,
          options: [
            { id: 'a', label: 'New here', value: 'new' },
            { id: 'b', label: 'Been here before', value: 'returning' },
          ],
        },
      ],
    },
  ],
};

/** F06 — `required` must be a boolean, not the string `"yes"`. */
export const INVALID_F06_WRONG_JSON_TYPE: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [{ id: 'q_mood', type: 'satisfaction', title: 'How was today?', required: 'yes' }],
    },
  ],
};

/** F07 — two pages share the id `p1`. The path names the second one. */
export const INVALID_F07_DUPLICATE_PAGE_ID: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    { id: 'p1', title: 'One', questions: [] },
    { id: 'p1', title: 'Two', questions: [] },
  ],
};

/**
 * F08 — `q_name` appears on two different pages. Question ids are unique across the
 * whole survey, not merely within a page. Path `pages[1].questions[0].id`.
 */
export const INVALID_F08_DUPLICATE_QUESTION_ID: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'One',
      questions: [{ id: 'q_name', type: 'textbox', title: 'Your name' }],
    },
    {
      id: 'p2',
      title: 'Two',
      questions: [{ id: 'q_name', type: 'textbox', title: 'Your name again' }],
    },
  ],
};

/** F09 — the value `a` is used by options 0 and 2. Path `pages[1].questions[1].options[2].value`. */
export const INVALID_F09_DUPLICATE_OPTION_VALUE: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    { id: 'p1', title: 'One', questions: [] },
    {
      id: 'p2',
      title: 'Two',
      questions: [
        { id: 'q_mood', type: 'satisfaction', title: 'How was today?' },
        {
          id: 'q_choice',
          type: 'radio',
          title: 'Pick one',
          options: [
            { id: 'opt-a', label: 'Apples', value: 'a' },
            { id: 'opt-b', label: 'Bananas', value: 'b' },
            { id: 'opt-c', label: 'Apricots', value: 'a' },
          ],
        },
      ],
    },
  ],
};

/** F10 — a radio question needs at least 2 options. Path `pages[0].questions[0].options`. */
export const INVALID_F10_TOO_FEW_OPTIONS: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [
        {
          id: 'q_segment',
          type: 'radio',
          title: 'You are…',
          options: [{ id: 'a', label: 'New here', value: 'new' }],
        },
      ],
    },
  ],
};

/** F11 — a survey needs at least one page. Path `pages`. */
export const INVALID_F11_NO_PAGES: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [],
};

/**
 * F12 — 3 selections required but only 2 options exist.
 * `maxSelections` is authored at 3 on purpose: contract §10.5 fixes the rule order as
 * R36 before R37, so without an explicit `maxSelections` this config would report
 * R36's F13 instead and F12 would have no witness.
 * Path `pages[1].questions[1].minSelections`.
 */
export const INVALID_F12_UNSATISFIABLE_SELECTION_RULE: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    { id: 'p1', title: 'One', questions: [] },
    {
      id: 'p2',
      title: 'Two',
      questions: [
        { id: 'q_mood', type: 'satisfaction', title: 'How was today?' },
        {
          id: 'q_liked',
          type: 'checkbox',
          title: 'What did you like?',
          minSelections: 3,
          maxSelections: 3,
          options: [
            { id: 'a', label: 'Delivery', value: 'delivery' },
            { id: 'b', label: 'Support', value: 'support' },
          ],
        },
      ],
    },
  ],
};

/** F13 — `maxLength` is below `minLength`. Path `pages[0].questions[0].maxLength`. */
export const INVALID_F13_INVERTED_NUMERIC_RULE: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [
        {
          id: 'q_why',
          type: 'textarea',
          title: 'Anything to add?',
          minLength: 10,
          maxLength: 5,
        },
      ],
    },
  ],
};

/** F14 — a rating scale may not go above 10. Path `pages[0].questions[0].scale.max`. */
export const INVALID_F14_RATING_SCALE_OUT_OF_BOUNDS: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [
        {
          id: 'q_delivery',
          type: 'rating',
          title: 'Rate the delivery',
          scale: { min: 1, max: 11 },
        },
      ],
    },
  ],
};

/** F15 — `maxFiles` must be 0 to 3. Path `pages[0].questions[0].attachments.maxFiles`. */
export const INVALID_F15_ATTACHMENT_POLICY_OUT_OF_RANGE: unknown = {
  key: 'mini-pulse',
  title: 'Mini Pulse',
  pages: [
    {
      id: 'p1',
      title: 'Today',
      questions: [
        {
          id: 'q_evidence',
          type: 'textarea',
          title: 'Anything to show us?',
          attachments: {
            maxFiles: 4,
            acceptedTypes: ['image/png'],
            maxSizeBytes: 1048576,
          },
        },
      ],
    },
  ],
};

/**
 * F16 — the config declares `feedback` but the manifest serves it as
 * `customer-feedback`. This is the one fixture whose `servedKey` is not its own key.
 */
export const INVALID_F16_KEY_MISMATCH: unknown = {
  key: 'feedback',
  title: 'Customer Feedback',
  pages: [{ id: 'p1', title: 'Today', questions: [] }],
};

/** The table the contract test iterates. One row per failure class, F01 to F16. */
export const INVALID_SURVEY_CONFIG_CASES: readonly InvalidConfigCase[] = [
  {
    name: 'F01 body is not parseable JSON',
    code: 'F01',
    path: '',
    servedKey: 'mini-pulse',
    raw: INVALID_F01_UNPARSEABLE_BODY,
    unparseable: true,
  },
  {
    name: 'F02 required field missing',
    code: 'F02',
    path: 'pages[0].questions[1].title',
    servedKey: 'mini-pulse',
    raw: INVALID_F02_MISSING_REQUIRED_FIELD,
  },
  {
    name: 'F03 unknown field present',
    code: 'F03',
    path: 'pages[0].questions[0].placeholder',
    servedKey: 'mini-pulse',
    raw: INVALID_F03_UNKNOWN_FIELD,
  },
  {
    name: 'F04 unknown question type',
    code: 'F04',
    path: 'pages[1].questions[0].type',
    servedKey: 'mini-pulse',
    raw: INVALID_F04_UNKNOWN_QUESTION_TYPE,
  },
  {
    name: 'F05 field not valid for its question type',
    code: 'F05',
    path: 'pages[0].questions[0].minLength',
    servedKey: 'mini-pulse',
    raw: INVALID_F05_FIELD_ON_WRONG_TYPE,
  },
  {
    name: 'F06 wrong JSON type for a field',
    code: 'F06',
    path: 'pages[0].questions[0].required',
    servedKey: 'mini-pulse',
    raw: INVALID_F06_WRONG_JSON_TYPE,
  },
  {
    name: 'F07 duplicate page id',
    code: 'F07',
    path: 'pages[1].id',
    servedKey: 'mini-pulse',
    raw: INVALID_F07_DUPLICATE_PAGE_ID,
  },
  {
    name: 'F08 duplicate question id',
    code: 'F08',
    path: 'pages[1].questions[0].id',
    servedKey: 'mini-pulse',
    raw: INVALID_F08_DUPLICATE_QUESTION_ID,
  },
  {
    name: 'F09 duplicate option value',
    code: 'F09',
    path: 'pages[1].questions[1].options[2].value',
    servedKey: 'mini-pulse',
    raw: INVALID_F09_DUPLICATE_OPTION_VALUE,
  },
  {
    name: 'F10 fewer than 2 options on a radio question',
    code: 'F10',
    path: 'pages[0].questions[0].options',
    servedKey: 'mini-pulse',
    raw: INVALID_F10_TOO_FEW_OPTIONS,
  },
  {
    name: 'F11 pages is empty',
    code: 'F11',
    path: 'pages',
    servedKey: 'mini-pulse',
    raw: INVALID_F11_NO_PAGES,
  },
  {
    name: 'F12 unsatisfiable selection rule',
    code: 'F12',
    path: 'pages[1].questions[1].minSelections',
    servedKey: 'mini-pulse',
    raw: INVALID_F12_UNSATISFIABLE_SELECTION_RULE,
  },
  {
    name: 'F13 inverted numeric rule',
    code: 'F13',
    path: 'pages[0].questions[0].maxLength',
    servedKey: 'mini-pulse',
    raw: INVALID_F13_INVERTED_NUMERIC_RULE,
  },
  {
    name: 'F14 rating scale out of bounds',
    code: 'F14',
    path: 'pages[0].questions[0].scale.max',
    servedKey: 'mini-pulse',
    raw: INVALID_F14_RATING_SCALE_OUT_OF_BOUNDS,
  },
  {
    name: 'F15 attachment policy out of range',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.maxFiles',
    servedKey: 'mini-pulse',
    raw: INVALID_F15_ATTACHMENT_POLICY_OUT_OF_RANGE,
  },
  {
    name: 'F16 config key does not match the key served',
    code: 'F16',
    path: 'key',
    servedKey: 'customer-feedback',
    raw: INVALID_F16_KEY_MISMATCH,
  },
];
