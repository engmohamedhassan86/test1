/**
 * T102 — Principle I at the viewer: invalid configuration renders the configuration-error
 * screen and **none** of the survey, for every failure class the contract defines.
 *
 * The per-class block is driven off `INVALID_SURVEY_CONFIG_CASES` — the same table the
 * Survey Content Author's contract test uses — and runs the **real**
 * `validateSurveyConfig` over each fixture before handing the result to the viewer. Four
 * hand-written cases, which is what this spec held before, cannot tell you that F09 or F15
 * reaches the screen; and a hand-built `SurveyConfigError` would prove only that the
 * screen renders an object this spec made up, not one the validator can actually produce.
 *
 * The invariant asserted for every class is the same, because it is the one Principle I
 * cares about: the error screen is present, and no control is. A viewer that rendered the
 * error banner *above* a live form would satisfy a "shows the error" assertion and violate
 * the principle outright.
 */

import { describe, expect, it } from 'vitest';

import { MANIFEST_SUBJECT } from '../../core/models/survey-config-error.model';
import { INVALID_MANIFEST_CASES } from '../../core/validators/__fixtures__/invalid-manifests';
import { INVALID_SURVEY_CONFIG_CASES } from '../../core/validators/__fixtures__/invalid-survey-configs';
import { validateSurveyConfig } from '../../core/validators/survey-config.validator';
import { validateSurveyManifest } from '../../core/validators/survey-manifest.validator';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

/** Everything a respondent could type into, across all six types. */
function controls(host: HTMLElement): Element[] {
  return [...host.querySelectorAll('input, textarea, [role="radiogroup"], fieldset')];
}

describe('SurveyPageComponent — configuration errors', () => {
  describe('every survey-config failure class reaches the error screen (Principle I)', () => {
    it('covers the whole contract table, so a new class cannot be added without a case', () => {
      // Guards the loop below against silently shrinking.
      expect(INVALID_SURVEY_CONFIG_CASES.length).toBeGreaterThanOrEqual(16);
    });

    for (const testCase of INVALID_SURVEY_CONFIG_CASES) {
      it(`renders the error screen and no survey for ${testCase.name}`, async () => {
        // `raw` is the body as the fetch layer would hand it over: parsed, except for F01
        // whose body never parsed and so travels as the raw string.
        const validation = validateSurveyConfig(testCase.raw, testCase.servedKey);

        // The fixture must really be rejected; otherwise the assertion below is vacuous.
        expect(validation.outcome).toBe('invalid');
        if (validation.outcome !== 'invalid') {
          return;
        }

        const harness = await mountViewer(SurveyPageComponent, testCase.servedKey, {
          resolution: { outcome: 'found', entry: manifestEntry() },
          validation,
        });

        expect(harness.host.querySelector('app-configuration-error')).not.toBeNull();
        expect(harness.session.state().kind).toBe('configuration-error');

        // Fails closed: the survey is not rendered alongside the error.
        expect(controls(harness.host)).toHaveLength(0);
        expect(harness.host.querySelector('app-survey-page-body')).toBeNull();
        expect(harness.host.querySelector('app-survey-navigation')).toBeNull();
        expect(harness.host.querySelector('app-submission-confirmation')).toBeNull();

        // FR-041: the class and its location are on the page for the author.
        expect(harness.text()).toContain(testCase.code);
        if (testCase.path !== '') {
          expect(harness.text()).toContain(testCase.path);
        }
      });
    }
  });

  describe('manifest failures render the same screen against the catalog (FR-066)', () => {
    for (const testCase of INVALID_MANIFEST_CASES) {
      it(`renders the error screen and never not-found for ${testCase.name}`, async () => {
        const validation = validateSurveyManifest(testCase.raw);

        expect(validation.outcome).toBe('invalid');
        if (validation.outcome !== 'invalid') {
          return;
        }

        const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
          resolution: { outcome: 'catalog-error', error: validation.error },
        });

        expect(harness.host.querySelector('app-configuration-error')).not.toBeNull();
        // A manifest that could not be read cannot tell us a key is absent, so reporting
        // the key as unknown would be a lie the respondent cannot act on.
        expect(harness.host.querySelector('app-not-found-page')).toBeNull();
        expect(controls(harness.host)).toHaveLength(0);
        // Nothing was loaded, because there was nothing to load from.
        expect(harness.loadCalls()).toBe(0);
      });
    }
  });

  it('reports the manifest as the subject, not the requested survey key', async () => {
    const validation = validateSurveyManifest({ surveys: 'not an array' });
    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      return;
    }

    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: { outcome: 'catalog-error', error: validation.error },
    });

    // The author's problem is the catalog, so naming `customer-feedback` would send them
    // to the wrong file.
    expect(harness.text()).toContain(MANIFEST_SUBJECT);
    expect(harness.host.querySelector('.sv-config-error__subject')?.textContent).toContain(
      'The survey catalog',
    );
  });

  it('reports the survey as the subject when the survey config is the broken one', async () => {
    const validation = validateSurveyConfig(
      { key: 'customer-feedback', title: 'Customer Feedback', pages: [] },
      'customer-feedback',
    );
    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      return;
    }

    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: { outcome: 'found', entry: manifestEntry() },
      validation,
    });

    expect(harness.host.querySelector('.sv-config-error__subject')?.textContent).toContain(
      'The survey',
    );
    expect(harness.text()).toContain('customer-feedback');
  });

  it('is terminal: the only way out is the link to the catalog (US5 scenario 6)', async () => {
    const validation = validateSurveyConfig(
      { key: 'customer-feedback', title: 'Customer Feedback', pages: [] },
      'customer-feedback',
    );
    if (validation.outcome !== 'invalid') {
      throw new Error('expected the empty-pages fixture to be rejected');
    }

    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: { outcome: 'found', entry: manifestEntry() },
      validation,
    });

    // `configuration-error` has no outgoing transition, so a route change is the only exit
    // and the screen has to offer one.
    const links = [...harness.host.querySelectorAll<HTMLAnchorElement>('a')];
    expect(links.map((link) => link.getAttribute('href'))).toContain('/');
    expect(harness.host.querySelectorAll('button')).toHaveLength(0);
  });
});
