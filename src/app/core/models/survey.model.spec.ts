/**
 * T017 — `ratingPresentation`, `effectiveMinSelections`, the FR-010 labels and the FR-003
 * type tuple.
 */

import {
  QUESTION_TYPES,
  SATISFACTION_LABELS,
  SATISFACTION_POINTS,
  SATISFACTION_SCALE,
  effectiveMinSelections,
  ratingPresentation,
  scaleOf,
  scalePoints,
} from './survey.model';
import {
  checkboxQuestion,
  ratingQuestion,
  satisfactionQuestion,
} from './__fixtures__/survey-builders';

describe('QUESTION_TYPES', () => {
  it('holds exactly the six FR-003 values, in contract order', () => {
    expect(QUESTION_TYPES).toEqual([
      'radio',
      'checkbox',
      'textbox',
      'textarea',
      'rating',
      'satisfaction',
    ]);
  });

  it('has no seventh member', () => {
    expect(QUESTION_TYPES).toHaveLength(6);
  });
});

describe('ratingPresentation (FR-009)', () => {
  it('renders stars when every point is at least 1', () => {
    expect(ratingPresentation(ratingQuestion({ scale: { min: 1, max: 5 } }))).toBe('stars');
  });

  it('renders a numeric row when the scale starts at 0', () => {
    // Zero stars cannot be told apart from no answer, which is why the shape changes.
    expect(ratingPresentation(ratingQuestion({ scale: { min: 0, max: 10 } }))).toBe('numbers');
  });

  it('renders stars for a scale that starts above 1', () => {
    expect(ratingPresentation(ratingQuestion({ scale: { min: 2, max: 6 } }))).toBe('stars');
  });
});

describe('effectiveMinSelections (FR-016)', () => {
  it('raises a required minimum of 0 to 1', () => {
    expect(effectiveMinSelections(checkboxQuestion({ required: true, minSelections: 0 }))).toBe(1);
  });

  it('leaves a required minimum of 2 alone', () => {
    expect(effectiveMinSelections(checkboxQuestion({ required: true, minSelections: 2 }))).toBe(2);
  });

  it('leaves an optional minimum of 0 at 0', () => {
    expect(effectiveMinSelections(checkboxQuestion({ required: false, minSelections: 0 }))).toBe(0);
  });

  it('leaves an optional minimum of 2 at 2', () => {
    expect(effectiveMinSelections(checkboxQuestion({ required: false, minSelections: 2 }))).toBe(2);
  });
});

describe('SATISFACTION_LABELS (FR-010)', () => {
  it('is exactly the five FR-010 strings in point order', () => {
    expect(SATISFACTION_POINTS.map((point) => SATISFACTION_LABELS[point])).toEqual([
      'Very dissatisfied',
      'Dissatisfied',
      'Neutral',
      'Satisfied',
      'Very satisfied',
    ]);
  });

  it('offers five points, with no zero and no sixth', () => {
    expect(SATISFACTION_POINTS).toEqual([1, 2, 3, 4, 5]);
    expect(SATISFACTION_SCALE).toEqual({ min: 1, max: 5 });
  });
});

describe('scaleOf', () => {
  it('reads a rating question own scale', () => {
    expect(scaleOf(ratingQuestion({ scale: { min: 0, max: 4 } }))).toEqual({ min: 0, max: 4 });
  });

  it('returns the fixed five-point scale for satisfaction, which carries none', () => {
    expect(scaleOf(satisfactionQuestion())).toEqual({ min: 1, max: 5 });
  });
});

describe('scalePoints', () => {
  it('lists every integer in the inclusive range', () => {
    expect(scalePoints(ratingQuestion({ scale: { min: 1, max: 5 } }))).toEqual([1, 2, 3, 4, 5]);
  });

  it('includes 0 for a scale that starts at 0', () => {
    expect(scalePoints(ratingQuestion({ scale: { min: 0, max: 3 } }))).toEqual([0, 1, 2, 3]);
  });

  it('lists the five satisfaction points', () => {
    expect(scalePoints(satisfactionQuestion())).toEqual([1, 2, 3, 4, 5]);
  });
});
