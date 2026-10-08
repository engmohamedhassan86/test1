/**
 * Reading `unknown` without reaching for `any` — T021.
 *
 * Every helper returns a discriminated result; none throws and none returns `any`. These
 * are the only functions in the feature that narrow an unvalidated value, which is what
 * makes "a `Survey` cannot exist without passing validation" true of the type system
 * rather than of a convention.
 */

/** A parsed JSON object. Values are still `unknown` — reading one is a second step. */
export type JsonObject = Readonly<Record<string, unknown>>;

export type ReadResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly actual: string };

function failure(value: unknown): { readonly ok: false; readonly actual: string } {
  return { ok: false, actual: describe(value) };
}

/**
 * How an offending value is named in an author-facing message. FR-041 requires the
 * message to name the value, and `JSON.stringify` is what makes `"yes"` distinguishable
 * from `yes` in the F06 example `expected a boolean, got "yes"`.
 */
export function describe(value: unknown): string {
  if (value === undefined) {
    return 'nothing';
  }
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
    return typeof value;
  }
  if (Array.isArray(value)) {
    return 'an array';
  }
  return JSON.stringify(value) ?? String(value);
}

export function requireObject(value: unknown): ReadResult<JsonObject> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure(value);
  }
  return { ok: true, value: value as JsonObject };
}

export function requireString(value: unknown): ReadResult<string> {
  return typeof value === 'string' ? { ok: true, value } : failure(value);
}

export function requireInt(value: unknown): ReadResult<number> {
  return typeof value === 'number' && Number.isInteger(value)
    ? { ok: true, value }
    : failure(value);
}

export function requireBoolean(value: unknown): ReadResult<boolean> {
  return typeof value === 'boolean' ? { ok: true, value } : failure(value);
}

export function requireArray(value: unknown): ReadResult<readonly unknown[]> {
  return Array.isArray(value) ? { ok: true, value } : failure(value);
}

/**
 * The keys present on `object` that are in none of `allowed`, in the order the document
 * lists them, so the first unknown key reported is the first one an author would find.
 */
export function rejectUnknownKeys(
  object: JsonObject,
  allowed: readonly string[],
): readonly string[] {
  return Object.keys(object).filter((key) => !allowed.includes(key));
}

/** The keys in `required` that `object` does not carry, in `required`'s order. */
export function missingKeys(object: JsonObject, required: readonly string[]): readonly string[] {
  return required.filter((key) => object[key] === undefined);
}

/**
 * Contract §2 measures every length on the **trimmed** value in Unicode code points, so
 * an emoji counts as one character rather than the two UTF-16 units `String.length`
 * reports.
 */
export function codePointLength(value: string): number {
  return [...value.trim()].length;
}

/** True when a trimmed string has content. Contract: `title` is non-empty after trimming. */
export function hasContent(value: string): boolean {
  return value.trim().length > 0;
}
