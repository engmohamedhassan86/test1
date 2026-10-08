/**
 * T033 — one case per rule R03 to R52, each asserting the `ConfigFailureCode` and the
 * `path` `contracts/survey-json.md` §9 gives it, plus:
 *
 * - the valid `mini-pulse` config from contract §10.1 with **every** normalised default;
 * - the five worked examples in §10.2 to §10.6;
 * - §9.7's ordering rule — an R03 failure yields exactly one issue, and a config with two
 *   bad questions yields two.
 *
 * The table is the test. Adding a rule means adding a row, never hand-writing a case.
 */

import { validateSurveyConfig } from './survey-config.validator';
import type { ConfigFailureCode, SurveyValidation } from '../models/survey-config-error.model';

const SERVED_KEY = 'mini-pulse';

/** A valid document the rows below mutate one field of. */
function validDocument(): Record<string, unknown> {
  return {
    key: SERVED_KEY,
    title: 'Mini Pulse',
    description: 'Two questions about today.',
    pages: [
      {
        id: 'p1',
        title: 'Today',
        questions: [{ id: 'q_mood', type: 'satisfaction', title: 'How was today?' }],
      },
    ],
  };
}

/** A valid document whose single question is of `type`, with its own required fields. */
function documentWithQuestion(question: Record<string, unknown>): Record<string, unknown> {
  return {
    key: SERVED_KEY,
    title: 'Mini Pulse',
    pages: [{ id: 'p1', title: 'Today', questions: [question] }],
  };
}

function radio(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'q_segment',
    type: 'radio',
    title: 'You are…',
    options: [
      { id: 'a', label: 'New here', value: 'new' },
      { id: 'b', label: 'Been here before', value: 'returning' },
    ],
    ...extra,
  };
}

function checkbox(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'q_liked',
    type: 'checkbox',
    title: 'What did you like?',
    options: [
      { id: 'a', label: 'Delivery', value: 'delivery' },
      { id: 'b', label: 'Support', value: 'support' },
    ],
    ...extra,
  };
}

function expectIssue(result: SurveyValidation, code: ConfigFailureCode, path: string): void {
  expect(result.outcome).toBe('invalid');
  if (result.outcome !== 'invalid') {
    return;
  }
  expect(result.error.issues.map((issue) => [issue.code, issue.path])).toContainEqual([code, path]);
}

interface RuleCase {
  readonly rule: string;
  readonly code: ConfigFailureCode;
  readonly path: string;
  readonly raw: unknown;
  readonly servedKey?: string;
}

const RULE_CASES: readonly RuleCase[] = [
  // --- 9.1 document rules -----------------------------------------------------------
  { rule: 'R03 not a JSON object', code: 'F01', path: '', raw: '[]' },
  { rule: 'R03 an array is not a document', code: 'F01', path: '', raw: [] },
  {
    rule: 'R04 unknown document key',
    code: 'F03',
    path: 'version',
    raw: { ...validDocument(), version: 2 },
  },
  { rule: 'R05 key missing', code: 'F02', path: 'key', raw: { title: 'T', pages: [] } },
  {
    rule: 'R05 title missing',
    code: 'F02',
    path: 'title',
    raw: { key: SERVED_KEY, pages: [] },
  },
  {
    rule: 'R05 pages missing',
    code: 'F02',
    path: 'pages',
    raw: { key: SERVED_KEY, title: 'T' },
  },
  {
    rule: 'R06 key is not a string',
    code: 'F06',
    path: 'key',
    raw: { ...validDocument(), key: 7 },
  },
  {
    rule: 'R06 key does not match the pattern',
    code: 'F13',
    path: 'key',
    raw: { ...validDocument(), key: 'Mini Pulse' },
    servedKey: 'Mini Pulse',
  },
  {
    rule: 'R07 key does not equal servedKey',
    code: 'F16',
    path: 'key',
    raw: { ...validDocument(), key: 'other-survey' },
  },
  {
    rule: 'R08 title is not a string',
    code: 'F06',
    path: 'title',
    raw: { ...validDocument(), title: 7 },
  },
  {
    rule: 'R08 title is empty after trimming',
    code: 'F13',
    path: 'title',
    raw: { ...validDocument(), title: '   ' },
  },
  {
    rule: 'R08 title is over 120 code points',
    code: 'F13',
    path: 'title',
    raw: { ...validDocument(), title: 'x'.repeat(121) },
  },
  {
    rule: 'R09 description is not a string',
    code: 'F06',
    path: 'description',
    raw: { ...validDocument(), description: 7 },
  },
  {
    rule: 'R09 description is over 300 code points',
    code: 'F13',
    path: 'description',
    raw: { ...validDocument(), description: 'x'.repeat(301) },
  },
  {
    rule: 'R10 pages is not an array',
    code: 'F06',
    path: 'pages',
    raw: { ...validDocument(), pages: {} },
  },
  {
    rule: 'R10 pages is empty',
    code: 'F11',
    path: 'pages',
    raw: { ...validDocument(), pages: [] },
  },

  // --- 9.2 page rules ---------------------------------------------------------------
  {
    rule: 'R11 a page is not an object',
    code: 'F06',
    path: 'pages[0]',
    raw: { ...validDocument(), pages: ['p1'] },
  },
  {
    rule: 'R12 unknown page key',
    code: 'F03',
    path: 'pages[0].footer',
    raw: {
      ...validDocument(),
      pages: [{ id: 'p1', title: 'Today', questions: [], footer: 'x' }],
    },
  },
  {
    rule: 'R13 page id missing',
    code: 'F02',
    path: 'pages[0].id',
    raw: { ...validDocument(), pages: [{ title: 'Today', questions: [] }] },
  },
  {
    rule: 'R13 page title missing',
    code: 'F02',
    path: 'pages[0].title',
    raw: { ...validDocument(), pages: [{ id: 'p1', questions: [] }] },
  },
  {
    rule: 'R13 page questions missing',
    code: 'F02',
    path: 'pages[0].questions',
    raw: { ...validDocument(), pages: [{ id: 'p1', title: 'Today' }] },
  },
  {
    rule: 'R14 page id is not a string',
    code: 'F06',
    path: 'pages[0].id',
    raw: { ...validDocument(), pages: [{ id: 1, title: 'Today', questions: [] }] },
  },
  {
    rule: 'R14 page id does not match the pattern',
    code: 'F13',
    path: 'pages[0].id',
    raw: { ...validDocument(), pages: [{ id: 'About You', title: 'Today', questions: [] }] },
  },
  {
    rule: 'R15 duplicate page id',
    code: 'F07',
    path: 'pages[1].id',
    raw: {
      ...validDocument(),
      pages: [
        { id: 'p1', title: 'One', questions: [] },
        { id: 'p1', title: 'Two', questions: [] },
      ],
    },
  },
  {
    rule: 'R16 page title is not a string',
    code: 'F06',
    path: 'pages[0].title',
    raw: { ...validDocument(), pages: [{ id: 'p1', title: 7, questions: [] }] },
  },
  {
    rule: 'R16 page title is over 120 code points',
    code: 'F13',
    path: 'pages[0].title',
    raw: { ...validDocument(), pages: [{ id: 'p1', title: 'x'.repeat(121), questions: [] }] },
  },
  {
    rule: 'R17 page description is not a string',
    code: 'F06',
    path: 'pages[0].description',
    raw: {
      ...validDocument(),
      pages: [{ id: 'p1', title: 'Today', description: 7, questions: [] }],
    },
  },
  {
    rule: 'R17 page description is over 300 code points',
    code: 'F13',
    path: 'pages[0].description',
    raw: {
      ...validDocument(),
      pages: [{ id: 'p1', title: 'Today', description: 'x'.repeat(301), questions: [] }],
    },
  },
  {
    rule: 'R18 questions is not an array',
    code: 'F06',
    path: 'pages[0].questions',
    raw: { ...validDocument(), pages: [{ id: 'p1', title: 'Today', questions: {} }] },
  },

  // --- 9.3 question rules -----------------------------------------------------------
  {
    rule: 'R19 a question is not an object',
    code: 'F06',
    path: 'pages[0].questions[0]',
    raw: documentWithQuestion('q_mood' as unknown as Record<string, unknown>),
  },
  {
    rule: 'R20 type missing',
    code: 'F02',
    path: 'pages[0].questions[0].type',
    raw: documentWithQuestion({ id: 'q_mood', title: 'How was today?' }),
  },
  {
    rule: 'R20 type is not a string',
    code: 'F06',
    path: 'pages[0].questions[0].type',
    raw: documentWithQuestion({ id: 'q_mood', type: 4, title: 'How was today?' }),
  },
  {
    rule: 'R21 type is not one of the six',
    code: 'F04',
    path: 'pages[0].questions[0].type',
    raw: documentWithQuestion({ id: 'q_level', type: 'slider', title: 'How much?' }),
  },
  {
    rule: 'R22 a field the contract defines nowhere is F03',
    code: 'F03',
    path: 'pages[0].questions[0].placeholder',
    raw: documentWithQuestion({
      id: 'q_name',
      type: 'textbox',
      title: 'Your name',
      placeholder: 'Dana',
    }),
  },
  {
    rule: 'R22 a contract field belonging to another type is F05',
    code: 'F05',
    path: 'pages[0].questions[0].minLength',
    raw: documentWithQuestion(radio({ minLength: 2 })),
  },
  {
    rule: 'R23 question id missing',
    code: 'F02',
    path: 'pages[0].questions[0].id',
    raw: documentWithQuestion({ type: 'satisfaction', title: 'How was today?' }),
  },
  {
    rule: 'R23 question title missing',
    code: 'F02',
    path: 'pages[0].questions[0].title',
    raw: documentWithQuestion({ id: 'q_mood', type: 'satisfaction' }),
  },
  {
    rule: 'R24 question id is not a string',
    code: 'F06',
    path: 'pages[0].questions[0].id',
    raw: documentWithQuestion({ id: 4, type: 'satisfaction', title: 'How was today?' }),
  },
  {
    rule: 'R24 question id does not match the pattern',
    code: 'F13',
    path: 'pages[0].questions[0].id',
    raw: documentWithQuestion({ id: 'Q Mood', type: 'satisfaction', title: 'How was today?' }),
  },
  {
    rule: 'R25 duplicate question id, across pages not merely within one',
    code: 'F08',
    path: 'pages[1].questions[0].id',
    raw: {
      ...validDocument(),
      pages: [
        {
          id: 'p1',
          title: 'One',
          questions: [{ id: 'q_mood', type: 'satisfaction', title: 'How was today?' }],
        },
        {
          id: 'p2',
          title: 'Two',
          questions: [{ id: 'q_mood', type: 'satisfaction', title: 'And now?' }],
        },
      ],
    },
  },
  {
    rule: 'R26 question title is not a string',
    code: 'F06',
    path: 'pages[0].questions[0].title',
    raw: documentWithQuestion({ id: 'q_mood', type: 'satisfaction', title: 7 }),
  },
  {
    rule: 'R26 question title is over 300 code points',
    code: 'F13',
    path: 'pages[0].questions[0].title',
    raw: documentWithQuestion({ id: 'q_mood', type: 'satisfaction', title: 'x'.repeat(301) }),
  },
  {
    rule: 'R27 question description is not a string',
    code: 'F06',
    path: 'pages[0].questions[0].description',
    raw: documentWithQuestion({
      id: 'q_mood',
      type: 'satisfaction',
      title: 'How was today?',
      description: 7,
    }),
  },
  {
    rule: 'R27 question description is over 500 code points',
    code: 'F13',
    path: 'pages[0].questions[0].description',
    raw: documentWithQuestion({
      id: 'q_mood',
      type: 'satisfaction',
      title: 'How was today?',
      description: 'x'.repeat(501),
    }),
  },
  {
    rule: 'R28 required is not a boolean',
    code: 'F06',
    path: 'pages[0].questions[0].required',
    raw: documentWithQuestion({
      id: 'q_mood',
      type: 'satisfaction',
      title: 'How was today?',
      required: 'yes',
    }),
  },

  // --- 9.4 type-specific rules ------------------------------------------------------
  {
    rule: 'R29 options missing on a radio',
    code: 'F02',
    path: 'pages[0].questions[0].options',
    raw: documentWithQuestion({ id: 'q_segment', type: 'radio', title: 'You are…' }),
  },
  {
    rule: 'R29 options is not an array',
    code: 'F06',
    path: 'pages[0].questions[0].options',
    raw: documentWithQuestion({ id: 'q_segment', type: 'radio', title: 'You are…', options: {} }),
  },
  {
    rule: 'R30 fewer than two options',
    code: 'F10',
    path: 'pages[0].questions[0].options',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [{ id: 'a', label: 'New here', value: 'new' }],
    }),
  },
  {
    rule: 'R31 an option is not an object',
    code: 'F06',
    path: 'pages[0].questions[0].options[1]',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [{ id: 'a', label: 'New here', value: 'new' }, 'returning'],
    }),
  },
  {
    rule: 'R31 an option carries an unknown key',
    code: 'F03',
    path: 'pages[0].questions[0].options[0].hint',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [
        { id: 'a', label: 'New here', value: 'new', hint: 'x' },
        { id: 'b', label: 'Been here', value: 'returning' },
      ],
    }),
  },
  {
    rule: 'R31 an option is missing a required key',
    code: 'F02',
    path: 'pages[0].questions[0].options[0].value',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [
        { id: 'a', label: 'New here' },
        { id: 'b', label: 'Been here', value: 'returning' },
      ],
    }),
  },
  {
    rule: 'R32 an option id does not match the pattern',
    code: 'F13',
    path: 'pages[0].questions[0].options[0].id',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [
        { id: 'A One', label: 'New here', value: 'new' },
        { id: 'b', label: 'Been here', value: 'returning' },
      ],
    }),
  },
  {
    rule: 'R32 an option label is over 200 characters',
    code: 'F13',
    path: 'pages[0].questions[0].options[0].label',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [
        { id: 'a', label: 'x'.repeat(201), value: 'new' },
        { id: 'b', label: 'Been here', value: 'returning' },
      ],
    }),
  },
  {
    rule: 'R32 an option value is over 100 characters',
    code: 'F13',
    path: 'pages[0].questions[0].options[1].value',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [
        { id: 'a', label: 'New here', value: 'new' },
        { id: 'b', label: 'Been here', value: 'x'.repeat(101) },
      ],
    }),
  },
  {
    rule: 'R33 a duplicate option id',
    code: 'F09',
    path: 'pages[0].questions[0].options[1].id',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [
        { id: 'a', label: 'New here', value: 'new' },
        { id: 'a', label: 'Been here', value: 'returning' },
      ],
    }),
  },
  {
    rule: 'R33 a duplicate option value',
    code: 'F09',
    path: 'pages[0].questions[0].options[1].value',
    raw: documentWithQuestion({
      id: 'q_segment',
      type: 'radio',
      title: 'You are…',
      options: [
        { id: 'a', label: 'New here', value: 'new' },
        { id: 'b', label: 'Been here', value: 'new' },
      ],
    }),
  },
  {
    rule: 'R34 minSelections is not an integer',
    code: 'F06',
    path: 'pages[0].questions[0].minSelections',
    raw: documentWithQuestion(checkbox({ minSelections: 1.5 })),
  },
  {
    rule: 'R34 minSelections is negative',
    code: 'F13',
    path: 'pages[0].questions[0].minSelections',
    raw: documentWithQuestion(checkbox({ minSelections: -1 })),
  },
  {
    rule: 'R35 maxSelections is not an integer',
    code: 'F06',
    path: 'pages[0].questions[0].maxSelections',
    raw: documentWithQuestion(checkbox({ maxSelections: '2' })),
  },
  {
    rule: 'R35 maxSelections is below 1',
    code: 'F13',
    path: 'pages[0].questions[0].maxSelections',
    raw: documentWithQuestion(checkbox({ maxSelections: 0 })),
  },
  {
    rule: 'R36 minSelections above maxSelections',
    code: 'F13',
    path: 'pages[0].questions[0].maxSelections',
    raw: documentWithQuestion(checkbox({ minSelections: 2, maxSelections: 1 })),
  },
  {
    rule: 'R37 minSelections above the option count — unsatisfiable',
    code: 'F12',
    path: 'pages[0].questions[0].minSelections',
    raw: documentWithQuestion(checkbox({ minSelections: 3, maxSelections: 3 })),
  },
  {
    rule: 'R38 maxSelections above the option count',
    code: 'F13',
    path: 'pages[0].questions[0].maxSelections',
    raw: documentWithQuestion(checkbox({ maxSelections: 3 })),
  },
  {
    rule: 'R39 minLength is not an integer',
    code: 'F06',
    path: 'pages[0].questions[0].minLength',
    raw: documentWithQuestion({
      id: 'q_name',
      type: 'textbox',
      title: 'Your name',
      minLength: 'two',
    }),
  },
  {
    rule: 'R39 minLength is negative',
    code: 'F13',
    path: 'pages[0].questions[0].minLength',
    raw: documentWithQuestion({ id: 'q_name', type: 'textbox', title: 'Your name', minLength: -1 }),
  },
  {
    rule: 'R40 maxLength is not an integer',
    code: 'F06',
    path: 'pages[0].questions[0].maxLength',
    raw: documentWithQuestion({
      id: 'q_name',
      type: 'textbox',
      title: 'Your name',
      maxLength: 2.5,
    }),
  },
  {
    rule: 'R40 maxLength is below 1',
    code: 'F13',
    path: 'pages[0].questions[0].maxLength',
    raw: documentWithQuestion({ id: 'q_name', type: 'textbox', title: 'Your name', maxLength: 0 }),
  },
  {
    rule: 'R41 maxLength below minLength',
    code: 'F13',
    path: 'pages[0].questions[0].maxLength',
    raw: documentWithQuestion({
      id: 'q_why',
      type: 'textarea',
      title: 'Anything to add?',
      minLength: 10,
      maxLength: 5,
    }),
  },
  {
    rule: 'R42 maxLength above the textbox ceiling of 255',
    code: 'F13',
    path: 'pages[0].questions[0].maxLength',
    raw: documentWithQuestion({
      id: 'q_name',
      type: 'textbox',
      title: 'Your name',
      maxLength: 256,
    }),
  },
  {
    rule: 'R42 maxLength above the textarea ceiling of 5000',
    code: 'F13',
    path: 'pages[0].questions[0].maxLength',
    raw: documentWithQuestion({
      id: 'q_why',
      type: 'textarea',
      title: 'Anything to add?',
      maxLength: 5001,
    }),
  },
  {
    rule: 'R43 scale is not an object',
    code: 'F06',
    path: 'pages[0].questions[0].scale',
    raw: documentWithQuestion({ id: 'q_rate', type: 'rating', title: 'Rate it', scale: 5 }),
  },
  {
    rule: 'R43 scale carries an unknown key',
    code: 'F03',
    path: 'pages[0].questions[0].scale.step',
    raw: documentWithQuestion({
      id: 'q_rate',
      type: 'rating',
      title: 'Rate it',
      scale: { min: 1, max: 5, step: 1 },
    }),
  },
  {
    rule: 'R43 scale is missing max',
    code: 'F02',
    path: 'pages[0].questions[0].scale.max',
    raw: documentWithQuestion({
      id: 'q_rate',
      type: 'rating',
      title: 'Rate it',
      scale: { min: 1 },
    }),
  },
  {
    rule: 'R43 scale min is not an integer',
    code: 'F06',
    path: 'pages[0].questions[0].scale.min',
    raw: documentWithQuestion({
      id: 'q_rate',
      type: 'rating',
      title: 'Rate it',
      scale: { min: 'one', max: 5 },
    }),
  },
  {
    rule: 'R44 scale min below 0',
    code: 'F14',
    path: 'pages[0].questions[0].scale.min',
    raw: documentWithQuestion({
      id: 'q_rate',
      type: 'rating',
      title: 'Rate it',
      scale: { min: -1, max: 5 },
    }),
  },
  {
    rule: 'R44 scale min not below max',
    code: 'F14',
    path: 'pages[0].questions[0].scale.max',
    raw: documentWithQuestion({
      id: 'q_rate',
      type: 'rating',
      title: 'Rate it',
      scale: { min: 5, max: 5 },
    }),
  },
  {
    rule: 'R44 scale max above 10',
    code: 'F14',
    path: 'pages[0].questions[0].scale.max',
    raw: documentWithQuestion({
      id: 'q_rate',
      type: 'rating',
      title: 'Rate it',
      scale: { min: 1, max: 11 },
    }),
  },
  {
    rule: 'R45 a scale on a satisfaction question is F05 by R22',
    code: 'F05',
    path: 'pages[0].questions[0].scale',
    raw: documentWithQuestion({
      id: 'q_mood',
      type: 'satisfaction',
      title: 'How was today?',
      scale: { min: 1, max: 5 },
    }),
  },

  // --- 9.5 attachment-policy rules --------------------------------------------------
  {
    rule: 'R46 attachments carries an unknown key',
    code: 'F03',
    path: 'pages[0].questions[0].attachments.maxTotalBytes',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: {
        maxFiles: 2,
        acceptedTypes: ['image/png'],
        maxSizeBytes: 1024,
        maxTotalBytes: 4096,
      },
    }),
  },
  {
    rule: 'R47 maxFiles missing',
    code: 'F02',
    path: 'pages[0].questions[0].attachments.maxFiles',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { acceptedTypes: ['image/png'], maxSizeBytes: 1024 },
    }),
  },
  {
    rule: 'R47 maxFiles out of the 0 to 3 range',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.maxFiles',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 4, acceptedTypes: ['image/png'], maxSizeBytes: 1024 },
    }),
  },
  {
    rule: 'R48 maxFiles 0 carrying another key',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.acceptedTypes',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 0, acceptedTypes: ['image/png'] },
    }),
  },
  {
    rule: 'R49 acceptedTypes missing above maxFiles 0',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.acceptedTypes',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, maxSizeBytes: 1024 },
    }),
  },
  {
    rule: 'R49 maxSizeBytes missing above maxFiles 0',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.maxSizeBytes',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, acceptedTypes: ['image/png'] },
    }),
  },
  {
    rule: 'R50 acceptedTypes is empty',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.acceptedTypes',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, acceptedTypes: [], maxSizeBytes: 1024 },
    }),
  },
  {
    rule: 'R50 an accepted type is neither a MIME type nor a .extension',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.acceptedTypes[0]',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, acceptedTypes: ['PNG'], maxSizeBytes: 1024 },
    }),
  },
  {
    rule: 'R51 a duplicate accepted type',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.acceptedTypes[1]',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, acceptedTypes: ['image/png', 'image/png'], maxSizeBytes: 1024 },
    }),
  },
  {
    rule: 'R51 a wildcard accepted type',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.acceptedTypes[0]',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, acceptedTypes: ['image/*'], maxSizeBytes: 1024 },
    }),
  },
  {
    rule: 'R52 maxSizeBytes below 1',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.maxSizeBytes',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, acceptedTypes: ['image/png'], maxSizeBytes: 0 },
    }),
  },
  {
    rule: 'R52 maxSizeBytes above the 10 MB ceiling',
    code: 'F15',
    path: 'pages[0].questions[0].attachments.maxSizeBytes',
    raw: documentWithQuestion({
      id: 'q_evidence',
      type: 'textarea',
      title: 'Anything to show us?',
      attachments: { maxFiles: 2, acceptedTypes: ['image/png'], maxSizeBytes: 10_485_761 },
    }),
  },
];

describe('validateSurveyConfig — one case per rule R03 to R52', () => {
  it('covers every rule from R03 to R52', () => {
    const covered = new Set(RULE_CASES.map((testCase) => testCase.rule.slice(0, 3)));
    const expected = Array.from(
      { length: 50 },
      (_unused, index) => `R${String(index + 3).padStart(2, '0')}`,
    );
    expect([...covered].sort()).toEqual(expected);
  });

  it.each(RULE_CASES)('$rule yields $code at $path', (testCase) => {
    const result = validateSurveyConfig(testCase.raw, testCase.servedKey ?? SERVED_KEY);
    expectIssue(result, testCase.code, testCase.path);
  });
});

describe('the valid mini-pulse config from contract §10.1', () => {
  const MINI_PULSE: unknown = {
    key: 'mini-pulse',
    title: 'Mini Pulse',
    description: 'Two questions about today.',
    pages: [
      {
        id: 'p1',
        title: 'Today',
        questions: [
          { id: 'q_mood', type: 'satisfaction', title: 'How was today?', required: true },
          {
            id: 'q_why',
            type: 'textarea',
            title: 'Anything to add?',
            description: 'Optional.',
            maxLength: 500,
            attachments: {
              maxFiles: 2,
              acceptedTypes: ['image/png', '.pdf'],
              maxSizeBytes: 1048576,
            },
          },
        ],
      },
    ],
  };

  it('normalises exactly as §10.1 shows', () => {
    const result = validateSurveyConfig(MINI_PULSE, 'mini-pulse');
    expect(result.outcome).toBe('valid');
    if (result.outcome !== 'valid') {
      return;
    }
    expect(result.survey).toEqual({
      key: 'mini-pulse',
      title: 'Mini Pulse',
      description: 'Two questions about today.',
      pages: [
        {
          id: 'p1',
          title: 'Today',
          // absent -> null
          description: null,
          questions: [
            {
              id: 'q_mood',
              type: 'satisfaction',
              title: 'How was today?',
              description: null,
              required: true,
              // absent -> null
              attachments: null,
            },
            {
              id: 'q_why',
              type: 'textarea',
              title: 'Anything to add?',
              description: 'Optional.',
              // absent -> false
              required: false,
              // absent -> 0
              minLength: 0,
              maxLength: 500,
              attachments: {
                maxFiles: 2,
                acceptedTypes: ['image/png', '.pdf'],
                maxSizeBytes: 1048576,
              },
            },
          ],
        },
      ],
    });
  });
});

describe('every normalised default, applied here and nowhere else (plan §6.1)', () => {
  function firstQuestion(raw: unknown): Record<string, unknown> {
    const result = validateSurveyConfig(raw, SERVED_KEY);
    expect(result.outcome).toBe('valid');
    if (result.outcome !== 'valid') {
      throw new Error('expected a valid config');
    }
    const question = result.survey.pages[0].questions[0];
    if (question === undefined) {
      throw new Error('expected one question');
    }
    return question as unknown as Record<string, unknown>;
  }

  it('defaults minLength to 0', () => {
    expect(
      firstQuestion(documentWithQuestion({ id: 'q_name', type: 'textbox', title: 'Name' }))[
        'minLength'
      ],
    ).toBe(0);
  });

  it('defaults maxLength to 255 on a textbox', () => {
    expect(
      firstQuestion(documentWithQuestion({ id: 'q_name', type: 'textbox', title: 'Name' }))[
        'maxLength'
      ],
    ).toBe(255);
  });

  it('defaults maxLength to 2000 on a textarea', () => {
    expect(
      firstQuestion(documentWithQuestion({ id: 'q_why', type: 'textarea', title: 'Why?' }))[
        'maxLength'
      ],
    ).toBe(2000);
  });

  it('defaults a rating scale to 1 to 5', () => {
    expect(
      firstQuestion(documentWithQuestion({ id: 'q_rate', type: 'rating', title: 'Rate' }))['scale'],
    ).toEqual({ min: 1, max: 5 });
  });

  it('defaults required to false', () => {
    expect(
      firstQuestion(documentWithQuestion({ id: 'q_mood', type: 'satisfaction', title: 'Mood' }))[
        'required'
      ],
    ).toBe(false);
  });

  it('defaults an absent attachments block to null', () => {
    expect(
      firstQuestion(documentWithQuestion({ id: 'q_mood', type: 'satisfaction', title: 'Mood' }))[
        'attachments'
      ],
    ).toBeNull();
  });

  it('normalises maxFiles 0 to a null policy rather than a zero-file one (D5)', () => {
    expect(
      firstQuestion(
        documentWithQuestion({
          id: 'q_why',
          type: 'textarea',
          title: 'Why?',
          attachments: { maxFiles: 0 },
        }),
      )['attachments'],
    ).toBeNull();
  });

  it('defaults minSelections to 0 and maxSelections to the option count', () => {
    const question = firstQuestion(documentWithQuestion(checkbox()));
    expect(question['minSelections']).toBe(0);
    expect(question['maxSelections']).toBe(2);
  });

  it('trims a title and resolves an empty description to null', () => {
    const result = validateSurveyConfig(
      { ...validDocument(), title: '  Mini Pulse  ', description: '   ' },
      SERVED_KEY,
    );
    expect(result.outcome).toBe('valid');
    if (result.outcome !== 'valid') {
      return;
    }
    expect(result.survey.title).toBe('Mini Pulse');
    expect(result.survey.description).toBeNull();
  });

  it('accepts a page with zero questions, which is valid and always validates', () => {
    const result = validateSurveyConfig(
      { ...validDocument(), pages: [{ id: 'p1', title: 'Empty', questions: [] }] },
      SERVED_KEY,
    );
    expect(result.outcome).toBe('valid');
    if (result.outcome !== 'valid') {
      return;
    }
    expect(result.survey.pages[0].questions).toEqual([]);
  });
});

describe('the five worked examples in contract §10.2 to §10.6', () => {
  it('§10.2 — an unknown field is F03, not a warning', () => {
    expectIssue(
      validateSurveyConfig(
        documentWithQuestion({
          id: 'q_name',
          type: 'textbox',
          title: 'Your name',
          placeholder: 'Dana',
        }),
        SERVED_KEY,
      ),
      'F03',
      'pages[0].questions[0].placeholder',
    );
  });

  it('§10.3 — an unknown question type is F04', () => {
    expectIssue(
      validateSurveyConfig(
        documentWithQuestion({ id: 'q_level', type: 'slider', title: 'How much?' }),
        SERVED_KEY,
      ),
      'F04',
      'pages[0].questions[0].type',
    );
  });

  it('§10.4 — a duplicate page id is F07, naming the second page', () => {
    expectIssue(
      validateSurveyConfig(
        {
          ...validDocument(),
          pages: [
            { id: 'p1', title: 'One', questions: [] },
            { id: 'p1', title: 'Two', questions: [] },
          ],
        },
        SERVED_KEY,
      ),
      'F07',
      'pages[1].id',
    );
  });

  it('§10.5 — an unsatisfiable selection rule is F12, with R36 checked before R37', () => {
    // `maxSelections: 3` is what lets F12 be reached: without it R36 would report F13
    // first, which is the ordering §10.5 fixes.
    expectIssue(
      validateSurveyConfig(
        documentWithQuestion(checkbox({ minSelections: 3, maxSelections: 3 })),
        SERVED_KEY,
      ),
      'F12',
      'pages[0].questions[0].minSelections',
    );
  });

  it('§10.6 — a field on the wrong type is F05', () => {
    expectIssue(
      validateSurveyConfig(documentWithQuestion(radio({ minLength: 2 })), SERVED_KEY),
      'F05',
      'pages[0].questions[0].minLength',
    );
  });
});

describe('§9.7 — ordering, and how many issues a failure reports', () => {
  it('yields exactly one issue for an R03 failure, examining no field (US5 scenario 1)', () => {
    const result = validateSurveyConfig('not json at all', SERVED_KEY);
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') {
      return;
    }
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0]).toEqual({
      code: 'F01',
      path: '',
      message: 'mini-pulse: the survey configuration could not be read',
    });
  });

  it('yields two issues for a config with two bad questions — siblings are still checked', () => {
    const result = validateSurveyConfig(
      {
        key: SERVED_KEY,
        title: 'Mini Pulse',
        pages: [
          {
            id: 'p1',
            title: 'Today',
            questions: [
              { id: 'q_one', type: 'slider', title: 'First' },
              { id: 'q_two', type: 'dial', title: 'Second' },
            ],
          },
        ],
      },
      SERVED_KEY,
    );
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') {
      return;
    }
    expect(result.error.issues.map((issue) => issue.path)).toEqual([
      'pages[0].questions[0].type',
      'pages[0].questions[1].type',
    ]);
  });

  it('does not descend into a question that failed R19, but checks its sibling', () => {
    const result = validateSurveyConfig(
      {
        key: SERVED_KEY,
        title: 'Mini Pulse',
        pages: [
          {
            id: 'p1',
            title: 'Today',
            questions: ['not an object', { id: 'q_two', type: 'slider', title: 'Second' }],
          },
        ],
      },
      SERVED_KEY,
    );
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') {
      return;
    }
    expect(result.error.issues.map((issue) => [issue.code, issue.path])).toEqual([
      ['F06', 'pages[0].questions[0]'],
      ['F04', 'pages[0].questions[1].type'],
    ]);
  });

  it('reports two bad pages rather than stopping at the first', () => {
    const result = validateSurveyConfig(
      {
        key: SERVED_KEY,
        title: 'Mini Pulse',
        pages: [
          { id: 'A Page', title: 'One', questions: [] },
          { id: 'B Page', title: 'Two', questions: [] },
        ],
      },
      SERVED_KEY,
    );
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') {
      return;
    }
    expect(result.error.issues.map((issue) => issue.path)).toEqual(['pages[0].id', 'pages[1].id']);
  });
});

describe('the error envelope', () => {
  it('names the survey key as the subject and the survey as the scope', () => {
    const result = validateSurveyConfig({}, 'customer-feedback');
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') {
      return;
    }
    expect(result.error.scope).toBe('survey');
    expect(result.error.subject).toBe('customer-feedback');
  });

  it('names the location and the offending value in every message (FR-041)', () => {
    const result = validateSurveyConfig(
      documentWithQuestion({
        id: 'q_mood',
        type: 'satisfaction',
        title: 'How was today?',
        required: 'yes',
      }),
      SERVED_KEY,
    );
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') {
      return;
    }
    expect(result.error.issues[0].message).toBe(
      'pages[0].questions[0].required: expected a boolean, got "yes"',
    );
  });
});
