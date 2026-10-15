#!/usr/bin/env node
/**
 * Runs the Angular CLI with the PrimeUI licence key injected as the build-time
 * constant `__PRIMEUI_LICENSE_KEY__`.
 *
 * `angular.json` cannot do this on its own: its `define` option takes literal
 * strings, and the Angular 22 application builder does not substitute environment
 * variables into them. So the key is read here and passed through `--define`,
 * which overrides the `""` default in `angular.json`.
 *
 * The key is a credential and never reaches a tracked file. Sources, in order:
 *
 * 1. `PRIMEUI_LICENSE_KEY` already in the environment (CI secret, Vercel or
 *    Cloudflare project variable, Paperclip secret).
 * 2. A local, untracked `.env` file — see `.env.example`.
 *
 * With no key the constant becomes `""`, which `providePrimeNG` ignores: the build
 * still succeeds and PrimeNG reports the licence as unconfigured.
 *
 * Usage: node scripts/with-primeui-license.mjs build --configuration production
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Throws when the file is absent, which is the normal case in CI.
try {
  process.loadEnvFile('.env');
} catch {
  // No local .env — fall back to the ambient environment.
}

const licenseKey = process.env.PRIMEUI_LICENSE_KEY ?? '';
const ngBin = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));

const child = spawn(
  process.execPath,
  [
    ngBin,
    ...process.argv.slice(2),
    '--define',
    // JSON.stringify supplies the quotes esbuild needs around a string value.
    `__PRIMEUI_LICENSE_KEY__=${JSON.stringify(licenseKey)}`,
  ],
  { stdio: 'inherit' },
);

child.on('error', (error) => {
  console.error(`Could not start the Angular CLI: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  // Re-raise the signal so Ctrl-C on `pnpm start` looks like Ctrl-C on `ng serve`.
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
