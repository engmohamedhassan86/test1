/**
 * Exhaustiveness helper — `plan.md` §5.3.
 *
 * Every `switch` on a discriminant in this feature ends here and carries no `default`
 * branch, so adding a question type, a state kind or a failure kind is a build failure
 * at every place that must handle it.
 *
 * **Addition to `plan.md` §1.2**: §5.3 requires the helper and names no file.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant: ${JSON.stringify(value)}`);
}
