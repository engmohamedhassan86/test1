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
 * The key is a credential. This script prints its id, tier, type, expiry and
 * character count — enough to recognise a renewal, and to tell an unset secret
 * apart from a wrong one — and never the key itself.
 *
 * On GitHub Actions every failure is also emitted as an `::error::` workflow
 * command. Downloading a job log needs admin rights on the repository, while
 * check-run annotations are readable by anyone, so this is what keeps a red job
 * diagnosable without repository admin.
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
const IN_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

/**
 * Reports a failure. On GitHub Actions the raw step log needs admin rights to
 * read, but check-run annotations are public, so the same message is emitted as
 * a workflow command — that is what makes a red job diagnosable from outside.
 */
function fail(message) {
  console.error(
    message
      .split('\n')
      .map((line, index) => (index === 0 ? `FAIL  ${line}` : `      ${line}`))
      .join('\n'),
  );

  if (IN_ACTIONS) {
    // Actions needs these three characters escaped or the message is truncated.
    const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.log(`::error title=PrimeUI licence::${escaped}`);
  }

  process.exit(1);
}

/**
 * Same precedence as the build wrapper: ambient environment, then local `.env`.
 * Which source won is reported, because "the secret is unset" and "the secret is
 * set to the wrong thing" need different fixes.
 */
function readKey() {
  const fromEnvironment = process.env.PRIMEUI_LICENSE_KEY;

  try {
    process.loadEnvFile('.env');
  } catch {
    // No local .env — the CI case.
  }

  const key = process.env.PRIMEUI_LICENSE_KEY ?? '';
  const source = fromEnvironment ? 'environment' : key === '' ? 'nowhere' : '.env file';

  return { key, source };
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
    fail(`No .js files under ${dir}. Did the build run?`);
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
    fail(
      `The key is not in the built output under ${dir}. The --define substitution in ` +
        'scripts/with-primeui-license.mjs did not take effect.',
    );
  }

  if (withPlaceholder.length > 0) {
    fail(
      `${PLACEHOLDER} survived into ${withPlaceholder.join(', ')}. It should have been ` +
        'substituted at build time.',
    );
  }

  console.log('PASS  The key is inlined in the built output and no placeholder remains.');
}

async function main() {
  const args = process.argv.slice(2);
  const bundleFlag = args.indexOf('--bundle');
  const bundleDir = bundleFlag === -1 ? null : args[bundleFlag + 1];

  if (bundleFlag !== -1 && !bundleDir) {
    fail('--bundle needs a directory, e.g. --bundle dist/survey-viewer/browser');
  }

  const { key, source } = readKey();

  // Only the length, never the value. It is the one fact that separates "the
  // secret is unset" from "the secret is set to something unexpected", and it is
  // the difference between a readable red job and a guessing game.
  console.log(`      key source:             ${source}`);
  console.log(`      key length:             ${key.length} characters`);

  if (key.trim() === '') {
    fail(
      `PRIMEUI_LICENSE_KEY is ${key === '' ? 'unset or empty' : 'blank'}, so this build would ` +
        'show the red "Invalid PrimeUI License" banner.\n' +
        'In CI: add the repository secret PRIMEUI_LICENSE_KEY. A secret scoped to an ' +
        'environment, or stored as a variable rather than a secret, is not visible here.\n' +
        'Locally: copy .env.example to .env and fill it in.\n' +
        'See docs/decisions/0001-primeui-licence-posture.md.',
    );
  }

  const releaseDate = await readPrimeNgReleaseDate();
  const { registerLicense } = await loadVerifier();
  const result = await registerLicense({ primeui: key }).verify('primeui', { releaseDate });

  // Safe to print: the payload is only trustworthy once `valid` is true, and a
  // failure exits before the payload lines below.
  console.log(`      primeng RELEASE_DATE:   ${releaseDate}`);
  console.log(`      status:                 ${result.status}`);

  if (!result.valid || result.status !== 'active') {
    const hint =
      result.status === 'grace'
        ? '\nThe key is inside its 30-day grace period. Renew it now — when the grace period ' +
          'ends the licence banner comes back.'
        : '';

    fail(`${result.message} (status: ${result.status})${hint}`);
  }

  const { id, tier, type, exp } = result.payload;
  console.log(`      key id:                 ${id}`);
  console.log(`      tier / type:            ${tier} / ${type}`);
  console.log(`      covers releases until:  ${new Date(exp * 1000).toISOString().slice(0, 10)}`);
  console.log(`      days until expiry:      ${result.daysUntilExpiry}`);
  console.log('PASS  The PrimeUI licence key is present and active.');

  if (bundleDir) {
    await checkBundle(bundleDir, key);
  }
}

main().catch((error) => fail(error.message));
