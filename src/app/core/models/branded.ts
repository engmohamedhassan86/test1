/**
 * Branded id types — `data-model.md` §2.
 *
 * Brands are minted in exactly one layer, the validators. Nothing else casts, so an
 * id that exists in the application has been through a rule that proved it.
 */

declare const BRAND: unique symbol;

/**
 * Nominal string type. A `Brand<string, 'QuestionId'>` is assignable to `string`,
 * but a plain `string` is not assignable to it — so a page id, an option id and a
 * question id cannot be used in each other's place.
 */
export type Brand<TValue, TBrand extends string> = TValue & { readonly [BRAND]: TBrand };

export type SurveyKey = Brand<string, 'SurveyKey'>;
export type PageId = Brand<string, 'PageId'>;
export type QuestionId = Brand<string, 'QuestionId'>;
export type OptionValue = Brand<string, 'OptionValue'>;
export type ClientSubmissionId = Brand<string, 'ClientSubmissionId'>;
export type AttachmentId = Brand<string, 'AttachmentId'>;

/** A `readonly` array guaranteed to hold at least one element. */
export type NonEmpty<T> = readonly [T, ...T[]];

/** A `readonly` array guaranteed to hold at least two elements. */
export type AtLeastTwo<T> = readonly [T, T, ...T[]];

/**
 * The one place a brand is applied. Validators call this after the rule that proves
 * the value; no other layer may, which is why it takes the brand as a type argument
 * rather than being six separate casts spread through the codebase.
 */
export function brand<TBranded extends Brand<string, string>>(value: string): TBranded {
  return value as TBranded;
}

/** True when the array holds at least one element, narrowing it to `NonEmpty`. */
export function isNonEmpty<T>(values: readonly T[]): values is NonEmpty<T> {
  return values.length >= 1;
}

/** True when the array holds at least two elements, narrowing it to `AtLeastTwo`. */
export function isAtLeastTwo<T>(values: readonly T[]): values is AtLeastTwo<T> {
  return values.length >= 2;
}
