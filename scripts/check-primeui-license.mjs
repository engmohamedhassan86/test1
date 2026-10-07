#!/usr/bin/env node
/**
 * Proves that a usable PrimeUI licence key reached this build.
 *
 * `scripts/with-primeui-license.mjs` deliberately tolerates a missing key: the
 * build still succeeds and the constant becomes `""`. That is the right default
 * for a local checkout, but it means a CI job with an unset secret produces a
 * green build and an artefact that paints the red "Invalid PrimeUI License"
 * banner. This script is the gate that catches that.
 *
 * Two checks, both optional to each other:
 *
 * 1. Always — the key in the environment is run through PrimeNG's own verifier
 *    (`@primeui/license-manager`, an offline Ed25519 signature check) using the
 *    same `RELEASE_DATE` that `providePrimeNG` passes in. Exit 1 unless the
 *    result is `active`.
 * 2. With `--bundle <dir>` — the built JavaScript in `<dir>` is searched for the
 *    key, and for a surviving `__PRIMEUI_LICENSE_KEY__` placeholder. This is
 *    what turns "the key was in the environment" into "the key is in the
 *    artefact we would ship".
 *
 * The key is a credential. This script prints its id, tier, type and expiry —
 * enough to recognise a renewal — and never the key itself.
 *
 * Usage:
 *   node scripts/check-primeui-license.mjs
 *   node scripts/check-primeui-license.mjs --bundle dist/survey-viewer/browser
 */
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLACEHOLDER = '__PRIMEUI_LICENSE_KEY__';

/** Same precedence as the build wrapper: ambient environment, then local .env. */
function readKey() {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No local .env — the CI case.
  }

  return process.env.PRIMEUI_LICENSE_KEY ?? '';
}

/**
 * The release date PrimeNG checks the key against, read out of the installed
 * package rather than copied here, so a PrimeNG upgrade cannot leave this gate
 * validating against a stale date.
 */
async function readPrimeNgReleaseDate() {
  // `primeng` does not export this subpath, so go via its package.json, which it
  // does export, and walk to the file from there.
  const require = createRequire(import.meta.url);
  const configPath = join(
    dirname(require.resolve('primeng/package.json')),
    'fesm2022',
    'primeng-config.mjs',
  );
  const source = await readFile(configPath, 'utf8');
  const match = source.match(/RELEASE_DATE\s*=\s*["']([\d-]+)["']/);

  if (!match) {
    throw new Error(
      `Could not find RELEASE_DATE in ${configPath}. PrimeNG may have changed how it ` +
        'verifies licences; re-check this script against the new version.',
    );
  }

  return match[1];
}

/**
 * `@primeui/license-manager` is a transitive dependency of `primeng`, so under
 * pnpm's strict layout it is not resolvable from the project root. Resolve it
 * the way PrimeNG does, from PrimeNG's own location, which also guarantees we
 * verify with the exact copy the app uses.
 */
async function loadVerifier() {
  const fromRoot = createRequire(import.meta.url);
  const fromPrimeNg = createRequire(fromRoot.resolve('primeng/package.json'));

  return import(pathToFileURL(fromPrimeNg.resolve('@primeui/license-manager')).href);
}

/** Collects every `.js` file under `dir`, recursively. */
async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => join(entry.parentPath, entry.name));
}

async function checkBundle(dir, key) {
  const files = await collectJsFiles(dir);

  if (files.length === 0) {
    console.error(`FAIL  No .js files under ${dir}. Did the build run?`);
    return false;
  }

  const withKey = [];
  const withPlaceholder = [];

  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    if (contents.includes(key)) withKey.push(file);
    if (contents.includes(PLACEHOLDER)) withPlaceholder.push(file);
  }

  console.log(`      bundle files scanned:   ${files.length}`);
  console.log(`      files holding the key:  ${withKey.length}`);
  console.log(`      placeholder left over:  ${withPlaceholder.length}`);

  if (withKey.length === 0) {
    console.error(
      `FAIL  The key is not in the built output under ${dir}. The --define substitution in ` +
        'scripts/with-primeui-license.mjs did not take effect.',
    );
    return false;
  }

  if (withPlaceholder.length > 0) {
    console.error(
      `FAIL  ${PLACEHOLDER} survived into ${withPlaceholder.join(', ')}. It should have been ` +
        'substituted at build time.',
    );
    return false;
  }

  console.log('PASS  The key is inlined in the built output and no placeholder remains.');
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const bundleFlag = args.indexOf('--bundle');
  const bundleDir = bundleFlag === -1 ? null : args[bundleFlag + 1];

  if (bundleFlag !== -1 && !bundleDir) {
    console.error('FAIL  --bundle needs a directory, e.g. --bundle dist/survey-viewer/browser');
    process.exit(1);
  }

  const key = readKey();

  if (key === '') {
    console.error(
      'FAIL  PRIMEUI_LICENSE_KEY is empty or unset, so this build would show the red\n' +
        '      "Invalid PrimeUI License" banner.\n' +
        '      In CI: add the repository secret PRIMEUI_LICENSE_KEY.\n' +
        '      Locally: copy .env.example to .env and fill it in.\n' +
        '      See docs/decisions/0001-primeui-licence-posture.md.',
    );
    process.exit(1);
  }

  const releaseDate = await readPrimeNgReleaseDate();
  const { registerLicense } = await loadVerifier();
  const result = await registerLicense({ primeui: key }).verify('primeui', { releaseDate });

  // Safe to print: the payload is only trustworthy once `valid` is true, and a
  // failure exits before these lines.
  console.log(`      primeng RELEASE_DATE:   ${releaseDate}`);
  console.log(`      status:                 ${result.status}`);

  if (!result.valid || result.status !== 'active') {
    console.error(`FAIL  ${result.message}`);
    if (result.status === 'grace') {
      console.error(
        '      The key is inside its 30-day grace period. Renew it now — when the grace\n' +
          '      period ends the licence banner comes back.',
      );
    }
    process.exit(1);
  }

  const { id, tier, type, exp } = result.payload;
  console.log(`      key id:                 ${id}`);
  console.log(`      tier / type:            ${tier} / ${type}`);
  console.log(`      covers releases until:  ${new Date(exp * 1000).toISOString().slice(0, 10)}`);
  console.log(`      days until expiry:      ${result.daysUntilExpiry}`);
  console.log('PASS  The PrimeUI licence key is present and active.');

  if (bundleDir && !(await checkBundle(bundleDir, key))) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  process.exit(1);
});
