import { describe, expect, it } from 'vitest';

import {
  checkboxQuestion,
  option,
  optionValue,
  radioQuestion,
  ratingQuestion,
  satisfactionQuestion,
  textareaQuestion,
  textboxQuestion,
} from '../models/__fixtures__/survey-builders';
import type { Answer, AtLeastTwo, SatisfactionPoint, SurveyOption } from '../models';
import { validateAnswer } from './answer.validator';

/**
 * `validateAnswer` — T035, covering FR-012 to FR-018 and FR-070.
 *
 * Three things here are worth knowing before reading the cases.
 *
 * 1. **Unanswered is `undefined`, never an empty value** (D4). `setAnswer` deletes an entry
 *    whose trimmed text is empty, and `Answer`'s checkbox variant cannot hold an empty
 *    selection, so this layer never sees `''`, `[]` or `null`. The FR-014 case below passes
 *    `undefined` for `"  "` for exactly that reason, and says so.
 * 2. **Numeric rules are asserted at `boundary − 1`, `boundary` and `boundary + 1`.** An
 *    off-by-one in a `<` versus `<=` is the whole failure mode of this file, and only the
 *    triple catches it.
 * 3. **Some inputs are not representable from a control**, which is the point of testing
 *    them (FR-070, FR-018 fail-closed). Where a case needs one, it is built with a narrow
 *    cast and a comment naming the route that could produce it.
 */

function textboxAnswer(value: string): Answer {
  return { type: 'textbox', value };
}

function textareaAnswer(value: string): Answer {
  return { type: 'textarea', value };
}

function radioAnswer(value: string): Answer {
  return { type: 'radio', value: optionValue(value) };
}

function checkboxAnswer(first: string, ...rest: readonly string[]): Answer {
  return { type: 'checkbox', value: [optionValue(first), ...rest.map((v) => optionValue(v))] };
}

function ratingAnswer(value: number): Answer {
  return { type: 'rating', value };
}

function satisfactionAnswer(value: SatisfactionPoint): Answer {
  return { type: 'satisfaction', value };
}

/** Four options, so a checkbox spec can hold one, two, three or four selections. */
function fourOptions(): AtLeastTwo<SurveyOption> {
  return [option('a', 'A'), option('b', 'B'), option('c', 'C'), option('d', 'D')];
}

describe('validateAnswer — radio (FR-012)', () => {
  it('reports required-radio with the FR-069 wording when a required radio is unanswered', () => {
    const question = radioQuestion({ required: true });

    expect(validateAnswer(question, undefined)).toEqual({
      questionId: question.id,
      rule: 'required-radio',
      message: 'Choose one option',
    });
  });

  it('passes a required radio that holds a value', () => {
    expect(validateAnswer(radioQuestion({ required: true }), radioAnswer('a'))).toBeNull();
  });

  it('passes an optional radio left unanswered', () => {
    expect(validateAnswer(radioQuestion(), undefined)).toBeNull();
  });
});

describe('validateAnswer — checkbox (FR-016, FR-070)', () => {
  it('reports min-selections for a required checkbox left unanswered, at the raised minimum of 1', () => {
    // FR-016: `required` raises a minimum of 0 to 1, and the required and minSelections
    // rules then share one wording — singular `option` at N = 1.
    const question = checkboxQuestion({ required: true, minSelections: 0 });

    expect(validateAnswer(question, undefined)).toEqual({
      questionId: question.id,
      rule: 'min-selections',
      message: 'Select at least 1 option',
    });
  });

  it('passes a required checkbox holding one selection', () => {
    expect(validateAnswer(checkboxQuestion({ required: true }), checkboxAnswer('a'))).toBeNull();
  });

  it('passes an optional checkbox left unanswered', () => {
    expect(validateAnswer(checkboxQuestion(), undefined)).toBeNull();
  });

  describe('minSelections at the boundary', () => {
    const question = checkboxQuestion({
      options: fourOptions(),
      minSelections: 2,
      maxSelections: 4,
    });

    it('fails one below the minimum', () => {
      expect(validateAnswer(question, checkboxAnswer('a'))).toEqual({
        questionId: question.id,
        rule: 'min-selections',
        message: 'Select at least 2 options',
      });
    });

    it('passes at the minimum', () => {
      expect(validateAnswer(question, checkboxAnswer('a', 'b'))).toBeNull();
    });

    it('passes one above the minimum', () => {
      expect(validateAnswer(question, checkboxAnswer('a', 'b', 'c'))).toBeNull();
    });
  });

  describe('maxSelections at the boundary (US2 scenario 13)', () => {
    const question = checkboxQuestion({
      options: fourOptions(),
      minSelections: 0,
      maxSelections: 2,
    });

    it('passes one below the maximum', () => {
      expect(validateAnswer(question, checkboxAnswer('a'))).toBeNull();
    });

    it('passes at the maximum', () => {
      expect(validateAnswer(question, checkboxAnswer('a', 'b'))).toBeNull();
    });

    it('fails one above the maximum, which the control cannot produce (FR-070)', () => {
      // The checkbox control disables unchecked boxes at the limit, so three selections
      // can only arrive from restored state or a future non-UI route. FR-070 makes that a
      // validation error rather than a control-only constraint, so it fails closed.
      expect(validateAnswer(question, checkboxAnswer('a', 'b', 'c'))).toEqual({
        questionId: question.id,
        rule: 'max-selections',
        message: 'Select no more than 2 options',
      });
    });
  });

  it('treats an answer of the wrong variant as holding nothing', () => {
    // Defensive: the maps are keyed by question id, so a mismatched variant means a bug
    // upstream. It must fail closed on a required question rather than pass silently.
    const question = checkboxQuestion({ required: true });

    expect(validateAnswer(question, radioAnswer('a'))).toEqual({
      questionId: question.id,
      rule: 'min-selections',
      message: 'Select at least 1 option',
    });
  });
});

describe('validateAnswer — textbox and textarea (FR-013 to FR-015)', () => {
  it('reports required-text when a required textbox is unanswered', () => {
    const question = textboxQuestion({ required: true });

    expect(validateAnswer(question, undefined)).toEqual({
      questionId: question.id,
      rule: 'required-text',
      message: 'Enter an answer',
    });
  });

  it('reports required-text when a required textarea is unanswered', () => {
    const question = textareaQuestion({ required: true });

    expect(validateAnswer(question, undefined)).toEqual({
      questionId: question.id,
      rule: 'required-text',
      message: 'Enter an answer',
    });
  });

  it('passes a required textbox that holds text', () => {
    expect(validateAnswer(textboxQuestion({ required: true }), textboxAnswer('Ada'))).toBeNull();
  });

  it('passes an optional textbox left unanswered', () => {
    expect(validateAnswer(textboxQuestion(), undefined)).toBeNull();
  });

  it('passes an optional textarea whose value trims to nothing', () => {
    // Not reachable through `setAnswer`, which deletes the entry — but if it ever is, an
    // optional question must still pass.
    expect(validateAnswer(textareaQuestion(), textareaAnswer('   '))).toBeNull();
  });

  it('required beats minLength: "  " on a required minLength 2 textbox says Enter an answer (FR-014, US2 scenario 2)', () => {
    const question = textboxQuestion({ required: true, minLength: 2 });

    // `setAnswer` trims `"  "` to `""` and deletes the entry, so this question arrives here
    // unanswered. That is the mechanism FR-014 relies on: no rule-ordering code is needed.
    const fromSetAnswer = validateAnswer(question, undefined);
    // And the same wording must hold on the route where the value survives as whitespace,
    // because `codePointLength` trims before counting.
    const fromRawWhitespace = validateAnswer(question, textboxAnswer('  '));

    for (const error of [fromSetAnswer, fromRawWhitespace]) {
      expect(error).toEqual({
        questionId: question.id,
        rule: 'required-text',
        message: 'Enter an answer',
      });
      expect(error?.message).not.toBe('Use at least 2 characters');
    }
  });

  describe('minLength at the boundary', () => {
    const question = textboxQuestion({ minLength: 2, maxLength: 80 });

    it('fails one character below the minimum', () => {
      expect(validateAnswer(question, textboxAnswer('a'))).toEqual({
        questionId: question.id,
        rule: 'min-length',
        message: 'Use at least 2 characters',
      });
    });

    it('passes at the minimum', () => {
      expect(validateAnswer(question, textboxAnswer('ab'))).toBeNull();
    });

    it('passes one character above the minimum', () => {
      expect(validateAnswer(question, textboxAnswer('abc'))).toBeNull();
    });
  });

  describe('maxLength at the boundary (US2 scenario 14)', () => {
    const question = textboxQuestion({ minLength: 0, maxLength: 80 });

    it('passes at 79 characters', () => {
      expect(validateAnswer(question, textboxAnswer('x'.repeat(79)))).toBeNull();
    });

    it('passes at exactly 80 characters', () => {
      expect(validateAnswer(question, textboxAnswer('x'.repeat(80)))).toBeNull();
    });

    it('fails at 81 trimmed characters against maxLength 80', () => {
      // Surrounding whitespace is stripped first, so the 81 that fails is 81 of content.
      expect(validateAnswer(question, textboxAnswer(`  ${'x'.repeat(81)}  `))).toEqual({
        questionId: question.id,
        rule: 'max-length',
        message: 'Use at most 80 characters',
      });
    });
  });

  describe('FR-013 counting: trimmed, in code points', () => {
    it('counts the trimmed value, so padding cannot satisfy minLength', () => {
      const question = textboxQuestion({ minLength: 4 });

      expect(validateAnswer(question, textboxAnswer('   ab   '))).toEqual({
        questionId: question.id,
        rule: 'min-length',
        message: 'Use at least 4 characters',
      });
      expect(validateAnswer(question, textboxAnswer('  abcd  '))).toBeNull();
    });

    it('counts an emoji as one character, not as its UTF-16 units', () => {
      // '👍' is one code point stored as a surrogate pair, so `.length` would say 2.
      expect('👍'.length).toBe(2);

      expect(validateAnswer(textboxQuestion({ maxLength: 1 }), textboxAnswer('👍'))).toBeNull();
      expect(validateAnswer(textboxQuestion({ minLength: 2 }), textboxAnswer('👍'))).toEqual({
        questionId: textboxQuestion({ minLength: 2 }).id,
        rule: 'min-length',
        message: 'Use at least 2 characters',
      });
      expect(
        validateAnswer(textboxQuestion({ minLength: 2, maxLength: 2 }), textboxAnswer('👍👍')),
      ).toBeNull();
    });
  });

  it('treats an answer of the wrong variant as empty text', () => {
    const required = textboxQuestion({ required: true });
    const optional = textboxQuestion();

    expect(validateAnswer(required, ratingAnswer(3))).toEqual({
      questionId: required.id,
      rule: 'required-text',
      message: 'Enter an answer',
    });
    expect(validateAnswer(optional, ratingAnswer(3))).toBeNull();
  });

  it('does not apply a textbox rule to a textarea answer, or the reverse', () => {
    // The two variants share their rules but not their discriminant, so a textarea answer
    // on a textbox question is a mismatch and must not be measured as text.
    expect(validateAnswer(textboxQuestion({ minLength: 2 }), textareaAnswer('ab'))).toBeNull();
    expect(validateAnswer(textareaQuestion({ minLength: 2 }), textboxAnswer('ab'))).toBeNull();
  });
});

describe('validateAnswer — rating (FR-018)', () => {
  it('reports required-scale with the configured range when a required rating is unanswered', () => {
    const question = ratingQuestion({ required: true, scale: { min: 1, max: 5 } });

    expect(validateAnswer(question, undefined)).toEqual({
      questionId: question.id,
      rule: 'required-scale',
      message: 'Choose a value between 1 and 5',
    });
  });

  it('passes a required rating that holds a value', () => {
    expect(validateAnswer(ratingQuestion({ required: true }), ratingAnswer(3))).toBeNull();
  });

  it('passes an optional rating left unanswered', () => {
    expect(validateAnswer(ratingQuestion(), undefined)).toBeNull();
  });

  describe('the configured range is inclusive at both ends', () => {
    const question = ratingQuestion({ scale: { min: 2, max: 4 } });
    const expected = {
      questionId: question.id,
      rule: 'scale-range' as const,
      message: 'Choose a value between 2 and 4',
    };

    it('fails one below the minimum', () => {
      expect(validateAnswer(question, ratingAnswer(1))).toEqual(expected);
    });

    it('passes at the minimum', () => {
      expect(validateAnswer(question, ratingAnswer(2))).toBeNull();
    });

    it('passes inside the range', () => {
      expect(validateAnswer(question, ratingAnswer(3))).toBeNull();
    });

    it('passes at the maximum', () => {
      expect(validateAnswer(question, ratingAnswer(4))).toBeNull();
    });

    it('fails one above the maximum', () => {
      expect(validateAnswer(question, ratingAnswer(5))).toEqual(expected);
    });
  });

  it('rejects a non-integer inside the range', () => {
    const question = ratingQuestion({ scale: { min: 1, max: 5 } });

    expect(validateAnswer(question, ratingAnswer(2.5))).toEqual({
      questionId: question.id,
      rule: 'scale-range',
      message: 'Choose a value between 1 and 5',
    });
  });

  it('rejects an answer of the wrong variant, which cannot be a number', () => {
    const question = ratingQuestion();

    expect(validateAnswer(question, textboxAnswer('3'))).toEqual({
      questionId: question.id,
      rule: 'scale-range',
      message: 'Choose a value between 1 and 5',
    });
  });
});

describe('validateAnswer — satisfaction (FR-010, FR-018)', () => {
  it('reports required-scale over the fixed 1 to 5 range when unanswered', () => {
    const question = satisfactionQuestion({ required: true });

    expect(validateAnswer(question, undefined)).toEqual({
      questionId: question.id,
      rule: 'required-scale',
      message: 'Choose a value between 1 and 5',
    });
  });

  it('passes every point the fixed scale offers', () => {
    const question = satisfactionQuestion({ required: true });

    for (const point of [1, 2, 3, 4, 5] as const) {
      expect(validateAnswer(question, satisfactionAnswer(point))).toBeNull();
    }
  });

  it('passes an optional satisfaction question left unanswered', () => {
    expect(validateAnswer(satisfactionQuestion(), undefined)).toBeNull();
  });

  it('rejects a point outside the fixed scale', () => {
    // `SatisfactionPoint` makes 6 unrepresentable, so the cast is the only way to model a
    // value arriving from restored state or a non-UI route. FR-018 must still fail closed.
    const question = satisfactionQuestion();
    const outOfRange = 6 as SatisfactionPoint;

    expect(validateAnswer(question, satisfactionAnswer(outOfRange))).toEqual({
      questionId: question.id,
      rule: 'scale-range',
      message: 'Choose a value between 1 and 5',
    });
  });
});
