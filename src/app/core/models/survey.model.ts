/**
 * The survey domain model — `data-model.md` §3.
 *
 * A survey is an ordered list of pages, each an ordered list of questions (FR-001).
 * The arity invariants live in the types: `AtLeastTwo<SurveyOption>` means no component
 * ever defends against a radio with one option, and `NonEmpty<SurveyPage>` means the
 * current-page lookup cannot be out of range on a valid survey.
 */

import type { AtLeastTwo, NonEmpty, OptionValue, PageId, QuestionId, SurveyKey } from './branded';

export const QUESTION_TYPES = [
  'radio',
  'checkbox',
  'textbox',
  'textarea',
  'rating',
  'satisfaction',
] as const;

/** FR-003: exactly these six. Any other `type` value is configuration failure F04. */
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface SurveyOption {
  readonly id: string;
  readonly label: string;
  readonly value: OptionValue;
}

/** A MIME type (`image/png`) or a dotted extension (`.pdf`), both lowercase. */
export type AcceptedFileType = `${string}/${string}` | `.${string}`;

/**
 * FR-021 / contract §3. Present only when the question actually accepts files: both
 * `maxFiles: 0` and an absent `attachments` block normalise to `null` on the question,
 * so `maxFiles` here is always a usable count.
 */
export interface AttachmentPolicy {
  readonly maxFiles: 1 | 2 | 3;
  readonly acceptedTypes: NonEmpty<AcceptedFileType>;
  readonly maxSizeBytes: number;
}

/** Invariant held by the validator: `0 <= min < max <= 10`. */
export interface RatingScale {
  readonly min: number;
  readonly max: number;
}

interface QuestionBase {
  readonly id: QuestionId;
  readonly title: string;
  /** `null`, never `undefined` and never `''` — FR-073 renders nothing in its place. */
  readonly description: string | null;
  readonly required: boolean;
  readonly attachments: AttachmentPolicy | null;
}

export interface RadioQuestion extends QuestionBase {
  readonly type: 'radio';
  readonly options: AtLeastTwo<SurveyOption>;
}

export interface CheckboxQuestion extends QuestionBase {
  readonly type: 'checkbox';
  readonly options: AtLeastTwo<SurveyOption>;
  /** Authoring default 0. The *effective* minimum (FR-016) is derived, not stored. */
  readonly minSelections: number;
  /** Authoring default `options.length`. */
  readonly maxSelections: number;
}

export interface TextboxQuestion extends QuestionBase {
  readonly type: 'textbox';
  readonly minLength: number;
  /** Authoring default 255; contract ceiling 255. */
  readonly maxLength: number;
}

export interface TextareaQuestion extends QuestionBase {
  readonly type: 'textarea';
  readonly minLength: number;
  /** Authoring default 2000; contract ceiling 5000. */
  readonly maxLength: number;
}

export interface RatingQuestion extends QuestionBase {
  readonly type: 'rating';
  /** Authoring default `{ min: 1, max: 5 }`. */
  readonly scale: RatingScale;
}

/**
 * FR-010: the scale is fixed at five labelled points and is not configurable, so this
 * member carries no type-specific field. A `scale` on a `satisfaction` question is
 * configuration failure F05.
 */
export interface SatisfactionQuestion extends QuestionBase {
  readonly type: 'satisfaction';
}

export type Question =
  | RadioQuestion
  | CheckboxQuestion
  | TextboxQuestion
  | TextareaQuestion
  | RatingQuestion
  | SatisfactionQuestion;

/** The two members that own `options`. */
export type ChoiceQuestion = RadioQuestion | CheckboxQuestion;

/** The two members that own `minLength`/`maxLength`. */
export type TextQuestion = TextboxQuestion | TextareaQuestion;

/** The two members answered with an integer on a scale. */
export type ScaleQuestion = RatingQuestion | SatisfactionQuestion;

export interface SurveyPage {
  readonly id: PageId;
  readonly title: string;
  readonly description: string | null;
  /** May be empty: a page with zero questions is valid and always validates. */
  readonly questions: readonly Question[];
}

export interface Survey {
  readonly key: SurveyKey;
  readonly title: string;
  readonly description: string | null;
  /** FR-001, F11: at least one page, in display order. */
  readonly pages: NonEmpty<SurveyPage>;
}

export type SatisfactionPoint = 1 | 2 | 3 | 4 | 5;

export const SATISFACTION_POINTS: NonEmpty<SatisfactionPoint> = [1, 2, 3, 4, 5];

export const SATISFACTION_SCALE: RatingScale = { min: 1, max: 5 };

/** FR-010. Visible text, never an icon or a colour alone. */
export const SATISFACTION_LABELS: Readonly<Record<SatisfactionPoint, string>> = {
  1: 'Very dissatisfied',
  2: 'Dissatisfied',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Very satisfied',
};

/**
 * FR-009: stars when every point is >= 1, a labelled numeric row when the scale starts
 * at 0, because zero stars cannot be told apart from no answer.
 */
export type RatingPresentation = 'stars' | 'numbers';

export function ratingPresentation(question: RatingQuestion): RatingPresentation {
  return question.scale.min >= 1 ? 'stars' : 'numbers';
}

/** The inclusive answer range of either scale question. */
export function scaleOf(question: ScaleQuestion): RatingScale {
  return question.type === 'rating' ? question.scale : SATISFACTION_SCALE;
}

/** FR-016: `required` raises a checkbox minimum of 0 to 1. */
export function effectiveMinSelections(question: CheckboxQuestion): number {
  return question.required ? Math.max(question.minSelections, 1) : question.minSelections;
}

/** The integers a scale question offers, in ascending order. FR-009, FR-010. */
export function scalePoints(question: ScaleQuestion): NonEmpty<number> {
  const { min, max } = scaleOf(question);
  const rest: number[] = [];
  for (let point = min + 1; point <= max; point += 1) {
    rest.push(point);
  }
  // Built as a tuple rather than cast: `min` is always a point, so the type is honest.
  return [min, ...rest];
}
