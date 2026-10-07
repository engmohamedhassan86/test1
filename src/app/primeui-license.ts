/**
 * The PrimeUI licence key handed to `providePrimeNG`.
 *
 * PrimeNG 22 is commercially licensed. Without a valid key it mounts a red
 * "Invalid PrimeUI License" banner over the page from a closed shadow root, so a
 * key is required before release — and the licence terms forbid removing the
 * banner instead.
 *
 * The key is a credential, so no tracked file holds its value. It arrives as the
 * build-time constant `__PRIMEUI_LICENSE_KEY__`, replaced from the
 * `PRIMEUI_LICENSE_KEY` environment variable by:
 *
 * - `pnpm start`, `pnpm run build` — `scripts/with-primeui-license.mjs`
 * - `pnpm test`, `pnpm run test:coverage` — `vitest.config.ts`
 * - a bare `ng build` or `ng test` — `angular.json`, which supplies `""`
 *
 * An empty key is deliberately harmless: `providePrimeNG` skips registration for a
 * falsy `license`, so builds and tests behave exactly as they did before the key
 * existed.
 *
 * All three paths above always define the constant, so there is no fallback here
 * — a fallback would be an untestable branch, and the `""` default in
 * `angular.json` is what keeps a bare `ng build` working. Keep that default in
 * place: a build that defines nothing would fail with a `ReferenceError`.
 *
 * The key ends up readable in the browser bundle. That is inherent to PrimeTek's
 * model — verification is an offline Ed25519 signature check with no telemetry —
 * and is recorded in `docs/decisions/0001-primeui-licence-posture.md`.
 */
declare const __PRIMEUI_LICENSE_KEY__: string;

export const primeUiLicenseKey: string = __PRIMEUI_LICENSE_KEY__;
