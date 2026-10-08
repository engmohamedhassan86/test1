/**
 * T016 — the branded types are not interchangeable, and the arity types reject a shorter
 * literal. Every assertion that matters here is a compile-time one, so `@ts-expect-error`
 * is the assertion: the test fails to compile if the type stops rejecting the value.
 */

import { brand, isAtLeastTwo, isNonEmpty } from './branded';
import type { AtLeastTwo, NonEmpty, OptionValue, PageId, QuestionId, SurveyKey } from './branded';

describe('branded ids', () => {
  const questionId = brand<QuestionId>('q_name');
  const pageId = brand<PageId>('about-you');

  it('is assignable to string, so a brand never needs unwrapping to be read', () => {
    const asString: string = questionId;
    expect(asString).toBe('q_name');
  });

  it('refuses a plain string where a branded id is required', () => {
    // @ts-expect-error a plain string is not a QuestionId
    const rejected: QuestionId = 'q_name';
    expect(rejected).toBe('q_name');
  });

  it('refuses one brand where another is required', () => {
    // @ts-expect-error a PageId is not a QuestionId
    const rejected: QuestionId = pageId;
    expect(rejected).toBe('about-you');
  });

  it('keeps the four string brands mutually exclusive', () => {
    const surveyKey = brand<SurveyKey>('customer-feedback');
    const optionValue = brand<OptionValue>('returning');

    // @ts-expect-error a SurveyKey is not an OptionValue
    const first: OptionValue = surveyKey;
    // @ts-expect-error an OptionValue is not a SurveyKey
    const second: SurveyKey = optionValue;

    expect([first, second]).toEqual(['customer-feedback', 'returning']);
  });
});

describe('NonEmpty', () => {
  it('accepts a one-element literal', () => {
    const ok: NonEmpty<string> = ['only'];
    expect(ok).toHaveLength(1);
  });

  it('rejects an empty literal', () => {
    // @ts-expect-error NonEmpty cannot be empty
    const rejected: NonEmpty<string> = [];
    expect(rejected).toHaveLength(0);
  });

  it('narrows a plain array at runtime', () => {
    const values: readonly string[] = ['a'];
    expect(isNonEmpty(values)).toBe(true);
    expect(isNonEmpty([])).toBe(false);
  });
});

describe('AtLeastTwo', () => {
  it('accepts a two-element literal', () => {
    const ok: AtLeastTwo<number> = [1, 2];
    expect(ok).toHaveLength(2);
  });

  it('rejects a one-element literal', () => {
    // @ts-expect-error AtLeastTwo needs a second element
    const rejected: AtLeastTwo<number> = [1];
    expect(rejected).toHaveLength(1);
  });

  it('rejects an empty literal', () => {
    // @ts-expect-error AtLeastTwo cannot be empty
    const rejected: AtLeastTwo<number> = [];
    expect(rejected).toHaveLength(0);
  });

  it('narrows a plain array at runtime', () => {
    expect(isAtLeastTwo([1, 2])).toBe(true);
    expect(isAtLeastTwo([1])).toBe(false);
    expect(isAtLeastTwo([])).toBe(false);
  });
});
