/**
 * Feature 002 acceptance verification — `specs/002-toggle-button-question/spec.md`.
 *
 * This is the QA-boundary spec. It does not repeat what
 * `questions/toggle-button-question.spec.ts`, `core/services/survey-response-payload.spec.ts`
 * and `core/validators/survey-config.validator.spec.ts` already assert; it closes the gaps
 * those three leave, each of which is a line in the 002 spec that nothing was proving:
 *
 * 1. **The real file, not the builder.** Every existing render test drives
 *    `customerFeedbackSurvey()`, a hand-written stand-in. If `public/surveys/customer-feedback.json`
 *    lost its `onLabel`, nothing here would fail. This spec reads that file off disk, runs the
 *    real `validateSurveyConfig` over it, and renders the result — so the authored labels, the
 *    authored `defaultValue` and the four-page shape are what reach the switch (US1 1, 2, 7).
 * 2. **The wire type, asserted as JSON.** `toEqual({ value: false })` passes on a `false` of any
 *    provenance; it says nothing about what `JSON.stringify` will put on the wire. The
 *    assertions below serialise the submitted payload and match the literal `"value":false`, so
 *    a `"false"` or a `0` fails (US1 4 and 5, SC-020).
 * 3. **The submit boundary and the validation summary.** `survey-page.validation.spec.ts` says in
 *    its own header that it leaves `toggle_button` out, because the default fixture's toggle is
 *    optional. US2 scenario 5 — a required toggle blocks *Submit*, the summary names it, and no
 *    request crosses the gateway — was therefore unasserted anywhere.
 * 4. **FR-079 reaching the screen.** The validator spec proves each mis-authored toggle is
 *    rejected; `survey-page.config-error.spec.ts` proves the generic failure classes reach the
 *    error screen, but its table carries no toggle case. The link between the two — this
 *    mistake, in this file, produces the error screen with zero controls — is asserted here.
 * 5. **Keyboard reachability.** See the note on the keyboard test for what jsdom can and cannot
 *    settle, and which half belongs to the 375px/1280px smoke gate.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import type { Survey, ToggleButtonQuestion } from '../../core/models/survey.model';
import type { SurveyValidation } from '../../core/models/survey-config-error.model';
import {
  page,
  questionId,
  survey,
  textboxQuestion,
  toggleButtonQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { validateSurveyConfig } from '../../core/validators/survey-config.validator';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

/**
 * Most tests here mount the viewer and walk all four authored pages through the rendered
 * controls, which is a dozen render cycles each; the first one in the file also pays the
 * TestBed compile. The 5s default is not enough for that and fails as a timeout rather
 * than as a real result, so this file asks for more.
 */
vi.setConfig({ testTimeout: 30_000 });

// --- the authored file, read off disk ----------------------------------------------

const SERVED_KEY = 'customer-feedback';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CONFIG_FILE = resolve(REPO_ROOT, 'public/surveys/customer-feedback.json');

type JsonObject = Record<string, unknown>;

/** A fresh deep copy each call, so a mutating case cannot leak into the next one. */
function authoredDocument(): JsonObject {
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as JsonObject;
}

function pagesOf(document: JsonObject): JsonObject[] {
  return document['pages'] as JsonObject[];
}

/** The authored toggle, found by id rather than by index, so a page reorder does not lie. */
function authoredToggle(document: JsonObject): JsonObject {
  for (const sheet of pagesOf(document)) {
    for (const question of sheet['questions'] as JsonObject[]) {
      if (question['id'] === 'q_notifications') {
        return question;
      }
    }
  }
  throw new Error('public/surveys/customer-feedback.json no longer holds q_notifications');
}

function validatedAuthoredSurvey(document: JsonObject = authoredDocument()): Survey {
  const validation = validateSurveyConfig(document, SERVED_KEY);
  if (validation.outcome !== 'valid') {
    throw new Error(
      `the authored config is invalid: ${validation.error.issues.map((i) => i.path).join(', ')}`,
    );
  }
  return validation.survey;
}

// --- driving the viewer ------------------------------------------------------------

async function openAuthored(
  subject: Survey,
  gateway: AcknowledgingSurveyResponseGateway = new AcknowledgingSurveyResponseGateway(),
): Promise<{
  readonly harness: ViewerHarness<SurveyPageComponent>;
  readonly gateway: AcknowledgingSurveyResponseGateway;
}> {
  const harness = await mountViewer(SurveyPageComponent, SERVED_KEY, {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: subject },
    gateway,
  });
  return { harness, gateway };
}

function controls(host: HTMLElement): Element[] {
  return [
    ...host.querySelectorAll('input, textarea, [role="switch"], [role="radiogroup"], fieldset'),
  ];
}

function toggleControl(host: HTMLElement): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>('.sv-toggle');
  if (found === null) {
    throw new Error('expected a toggle control on the rendered page');
  }
  return found;
}

function position(host: HTMLElement): string {
  return host.querySelector('.ds-nav__position')?.textContent?.trim() ?? '';
}

async function clickNth(
  harness: ViewerHarness<SurveyPageComponent>,
  selector: string,
  index: number,
): Promise<void> {
  const target = [...harness.host.querySelectorAll<HTMLElement>(selector)][index];
  if (target === undefined) {
    throw new Error(`expected at least ${index + 1} elements matching ${selector}`);
  }
  target.click();
  await harness.settle();
}

/** Selects an option from a p-select dropdown by index. */
async function selectDropdownOption(
  harness: ViewerHarness<SurveyPageComponent>,
  dropdownIndex: number,
  optionIndex: number,
): Promise<void> {
  const selects = [...harness.host.querySelectorAll<HTMLElement>('p-select')];
  const select = selects[dropdownIndex];
  if (select === undefined) {
    throw new Error(`expected at least ${dropdownIndex + 1} p-select elements`);
  }
  select.click();
  await harness.settle();

  // Try multiple selectors for PrimeNG dropdown items
  let options: HTMLElement[] = [];
  options = [...document.querySelectorAll<HTMLElement>('.p-select-item')];
  if (options.length === 0) {
    options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  }
  if (options.length === 0) {
    options = [...document.querySelectorAll<HTMLElement>('.p-select-item-label')];
  }

  const option = options[optionIndex];
  if (option === undefined) {
    throw new Error(
      `expected at least ${optionIndex + 1} dropdown options, found ${options.length}`,
    );
  }
  option.click();
  await harness.settle();
}

async function type(
  harness: ViewerHarness<SurveyPageComponent>,
  selector: string,
  value: string,
): Promise<void> {
  const field = harness.host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (field === null) {
    throw new Error(`expected a field matching ${selector}`);
  }
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await harness.settle();
}

/** Walks the authored survey's pages 1-3 through the rendered controls onto page 4. */
async function walkToLastPage(harness: ViewerHarness<SurveyPageComponent>): Promise<void> {
  await type(harness, 'input[type="text"]', 'Sam');
  await clickNth(harness, 'input[type="radio"]', 0);
  await clickNth(harness, '.ds-nav__button--primary', 0);

  await clickNth(harness, '.sv-scale__point', 3);
  await selectDropdownOption(harness, 0, 0);
  await clickNth(harness, 'input[type="checkbox"]', 0);
  await clickNth(harness, '.ds-nav__button--primary', 0);

  await clickNth(harness, '.ds-nav__button--primary', 0);
  expect(position(harness.host)).toBe('Page 4 of 4');
  // Page 4's own required radio, so nothing unrelated to the toggle blocks Submit.
  await clickNth(harness, 'input[type="radio"]', 0);
}

function summaryRows(host: HTMLElement): readonly { question: string; message: string }[] {
  return [...host.querySelectorAll<HTMLElement>('.sv-summary__item')].map((item) => ({
    question: item.querySelector('.sv-summary__link')?.textContent?.trim() ?? '',
    message: item.querySelector('.sv-summary__message')?.textContent?.trim() ?? '',
  }));
}

// --- 1. the switch on the authored four-page fixture --------------------------------

describe('toggle_button on the authored customer-feedback fixture (US1)', () => {
  it('is authored on the last page of four and survives validation as a toggle', () => {
    const subject = validatedAuthoredSurvey();

    expect(subject.pages).toHaveLength(4);
    const last = subject.pages[subject.pages.length - 1];
    const authored = last.questions.find((question) => question.id === 'q_notifications');
    expect(authored?.type).toBe('toggle_button');
  });

  it('renders one switch showing the authored off label, with no Clear action (scenario 1)', async () => {
    const { harness } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);

    const control = toggleControl(harness.host);
    expect(harness.host.querySelectorAll('[role="switch"]')).toHaveLength(1);
    expect(control.getAttribute('role')).toBe('switch');
    expect(control.getAttribute('aria-checked')).toBe('false');
    // The authored wording, straight from the file — not a builder's copy of it.
    expect(control.textContent?.trim()).toBe('No news');
    expect(harness.text()).toContain('Would you like news about new toys?');

    // D-001: there is no unanswered state, so there is nothing for a Clear to return to.
    // The other grouped controls on this page do offer one, so an empty page would pass
    // this vacuously — assert against the toggle's own question block.
    const block = control.closest('.sv-question') ?? harness.host;
    expect(block.querySelector('.sv-question__clear')).toBeNull();
    expect(block.textContent).not.toContain('Clear answer');
  });

  it('shows the authored on label after one activation and the off label after two (scenarios 2, 3)', async () => {
    const { harness } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);

    await clickNth(harness, '.sv-toggle', 0);
    expect(toggleControl(harness.host).textContent?.trim()).toBe('Send me news');
    expect(toggleControl(harness.host).getAttribute('aria-checked')).toBe('true');

    await clickNth(harness, '.sv-toggle', 0);
    expect(toggleControl(harness.host).textContent?.trim()).toBe('No news');
    // Back to `false` as a stored answer, not back to unanswered (D-001).
    expect(harness.session.answers().get(questionId('q_notifications'))).toEqual({
      type: 'toggle_button',
      value: false,
    });
  });

  it('keeps the position across a page boundary and back (scenario 6)', async () => {
    const { harness } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);
    await clickNth(harness, '.sv-toggle', 0);

    await clickNth(harness, '.ds-nav__button--secondary', 0);
    expect(position(harness.host)).toBe('Page 3 of 4');
    await clickNth(harness, '.ds-nav__button--primary', 0);

    expect(position(harness.host)).toBe('Page 4 of 4');
    expect(toggleControl(harness.host).textContent?.trim()).toBe('Send me news');
  });

  it('honours an authored defaultValue of true on first render, before any touch (US1, defaults table)', async () => {
    const document = authoredDocument();
    authoredToggle(document)['defaultValue'] = true;

    const { harness } = await openAuthored(validatedAuthoredSurvey(document));
    await walkToLastPage(harness);

    expect(toggleControl(harness.host).getAttribute('aria-checked')).toBe('true');
    expect(toggleControl(harness.host).textContent?.trim()).toBe('Send me news');
    // Rendered from the config, with nothing stored yet.
    expect(harness.session.answers().has(questionId('q_notifications'))).toBe(false);
  });

  it('falls back to Off/On and to false when the file names neither labels nor a default (scenario 7)', async () => {
    const document = authoredDocument();
    const authored = authoredToggle(document);
    delete authored['options'];
    delete authored['defaultValue'];

    const subject = validatedAuthoredSurvey(document);
    const normalised = subject.pages[subject.pages.length - 1].questions.find(
      (question) => question.id === 'q_notifications',
    ) as ToggleButtonQuestion;
    // The defaults are substituted once, at validation, so no component picks wording.
    expect(normalised.options).toEqual({ onLabel: 'On', offLabel: 'Off' });
    expect(normalised.defaultValue).toBe(false);

    const { harness } = await openAuthored(subject);
    await walkToLastPage(harness);

    expect(toggleControl(harness.host).textContent?.trim()).toBe('Off');
    await clickNth(harness, '.sv-toggle', 0);
    expect(toggleControl(harness.host).textContent?.trim()).toBe('On');
  });
});

// --- 2. the submitted payload, asserted as JSON ------------------------------------

describe('the submitted toggle value is a native JSON boolean (SC-020)', () => {
  /** The payload as it would leave the browser: serialised, then read back. */
  function wire(gateway: AcknowledgingSurveyResponseGateway): {
    readonly json: string;
    readonly entry: unknown;
  } {
    const call = gateway.calls[0];
    expect(call).toBeDefined();
    const json = JSON.stringify(call);
    const parsed = JSON.parse(json) as {
      readonly answers: readonly { readonly questionId: string }[];
    };
    const entry = parsed.answers.find((row) => row.questionId === 'q_notifications');
    return { json, entry };
  }

  it('serialises false for an untouched switch, not "false" and not 0 (scenario 4)', async () => {
    const { harness, gateway } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);

    await clickNth(harness, '.ds-nav__button--primary', 0);
    expect(harness.session.state().kind).toBe('submitted');

    const { json, entry } = wire(gateway);
    expect(entry).toEqual({ questionId: 'q_notifications', type: 'toggle_button', value: false });
    expect(typeof (entry as { value: unknown }).value).toBe('boolean');
    // The literal wire bytes: `"value":"false"` and `"value":0` do not match this.
    expect(json).toContain('{"questionId":"q_notifications","type":"toggle_button","value":false}');
    expect(json).not.toContain('"value":"false"');
  });

  it('serialises true after one activation (scenario 5)', async () => {
    const { harness, gateway } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);
    await clickNth(harness, '.sv-toggle', 0);

    await clickNth(harness, '.ds-nav__button--primary', 0);
    expect(harness.session.state().kind).toBe('submitted');

    const { json, entry } = wire(gateway);
    expect(entry).toEqual({ questionId: 'q_notifications', type: 'toggle_button', value: true });
    expect(typeof (entry as { value: unknown }).value).toBe('boolean');
    expect(json).toContain('{"questionId":"q_notifications","type":"toggle_button","value":true}');
    expect(json).not.toContain('"value":"true"');
    expect(json).not.toContain('"value":1');
  });

  it('carries exactly one entry for the toggle, never two and never none', async () => {
    const { harness, gateway } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);
    await clickNth(harness, '.ds-nav__button--primary', 0);

    const rows = gateway.calls[0]?.answers.filter((row) => row.questionId === 'q_notifications');
    expect(rows).toHaveLength(1);
  });
});

// --- 3. required gates Submit, and the summary names it ----------------------------

describe('a required toggle gates the submission boundary (US2 scenario 5, SC-021)', () => {
  function consentSurvey(options: { readonly required: boolean }): Survey {
    return survey([
      page('p1', 'Consent', [
        toggleButtonQuestion({
          id: 'q_consent',
          title: 'Do you accept the terms?',
          required: options.required,
          defaultValue: false,
          options: { onLabel: 'I accept', offLabel: 'I do not accept' },
        }),
      ]),
    ]);
  }

  it('refuses Submit, names the question in the summary, and sends no request', async () => {
    const { harness, gateway } = await openAuthored(consentSurvey({ required: true }));

    await clickNth(harness, '.ds-nav__button--primary', 0);

    expect(harness.session.state().kind).not.toBe('submitted');
    expect(gateway.calls).toHaveLength(0);
    expect(summaryRows(harness.host)).toEqual([
      { question: 'Do you accept the terms?', message: 'Turn on I accept to continue' },
    ]);
    // The error is wired to the control itself, not only to the summary.
    expect(toggleControl(harness.host).getAttribute('aria-invalid')).toBe('true');
    expect(harness.host.querySelector('#sv-q-q_consent-error')?.textContent?.trim()).toBe(
      'Turn on I accept to continue',
    );
  });

  it('submits once the switch is on, and refuses again when it is turned back off (scenarios 2, 3)', async () => {
    const { harness, gateway } = await openAuthored(consentSurvey({ required: true }));

    await clickNth(harness, '.sv-toggle', 0);
    await clickNth(harness, '.ds-nav__button--primary', 0);
    expect(harness.session.state().kind).toBe('submitted');
    expect(gateway.calls).toHaveLength(1);
    expect(JSON.stringify(gateway.calls[0])).toContain('"value":true');
  });

  it('lets an off switch through when the question is optional (scenario 6)', async () => {
    const { harness, gateway } = await openAuthored(consentSurvey({ required: false }));

    await clickNth(harness, '.ds-nav__button--primary', 0);

    expect(harness.session.state().kind).toBe('submitted');
    expect(summaryRows(harness.host)).toHaveLength(0);
    expect(JSON.stringify(gateway.calls[0])).toContain('"value":false');
  });

  it('blocks Submit from the last page for a required toggle left off on an earlier one', async () => {
    const subject = survey([
      page('p1', 'Consent', [
        toggleButtonQuestion({
          id: 'q_consent',
          title: 'Do you accept the terms?',
          required: true,
          defaultValue: true,
          options: { onLabel: 'I accept', offLabel: 'I do not accept' },
        }),
      ]),
      page('p2', 'About you', [textboxQuestion({ id: 'q_name', required: false })]),
    ]);
    const { harness, gateway } = await openAuthored(subject);

    // Page 1 passes untouched, because `defaultValue: true` is already the accepting
    // position (scenario 4).
    await clickNth(harness, '.ds-nav__button--primary', 0);
    expect(position(harness.host)).toBe('Page 2 of 2');

    // Reaching the last page with the page-1 toggle off cannot be done through the UI —
    // Next re-validates page 1 and would refuse. The state is forced here because what
    // US2 scenario 5 is about is Submit's whole-survey re-validation, not how the state
    // arose.
    const consent = subject.pages[0].questions[0] as ToggleButtonQuestion;
    harness.session.setAnswer(consent, { kind: 'boolean', value: false });
    await harness.settle();

    await clickNth(harness, '.ds-nav__button--primary', 0);

    expect(harness.session.state().kind).not.toBe('submitted');
    expect(gateway.calls).toHaveLength(0);
    expect(summaryRows(harness.host)).toEqual([
      { question: 'Do you accept the terms?', message: 'Turn on I accept to continue' },
    ]);
  });
});

// --- 4. keyboard reach and target size --------------------------------------------

describe('the switch is operable from the keyboard (SC-024, FR-058)', () => {
  it('is a native button in the natural tab order, and focus lands on it', async () => {
    const { harness } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);

    const control = toggleControl(harness.host);

    // jsdom computes no layout and does not synthesise activation from key events, so
    // "Space toggles it" cannot be dispatched here. What settles it instead is the
    // element: a native, enabled `button` is activated by both Space and Enter by the
    // user agent, with no key handler to get wrong, and sits in the tab order without a
    // `tabindex`. The rendered box and a real key press are the 375px/1280px smoke gate.
    expect(control.tagName).toBe('BUTTON');
    expect(control.getAttribute('type')).toBe('button');
    expect(control.disabled).toBe(false);
    expect(control.hasAttribute('tabindex')).toBe(false);
    expect(control.tabIndex).toBe(0);

    control.focus();
    expect(document.activeElement).toBe(control);
  });

  it('exposes nothing to the mouse that the keyboard cannot reach on the toggle block', async () => {
    const { harness } = await openAuthored(validatedAuthoredSurvey());
    await walkToLastPage(harness);

    const control = toggleControl(harness.host);
    // The track and the thumb are decorative spans inside the button: no second click
    // target, so there is no mouse-only path to the state.
    expect(control.querySelector('.sv-toggle__track')?.getAttribute('aria-hidden')).toBe('true');
    expect(control.querySelectorAll('button, a, [role="button"]')).toHaveLength(0);
  });

  it('declares a target of at least 44px for the switch', () => {
    const styles = readFileSync(
      resolve(REPO_ROOT, 'src/app/features/survey/questions/toggle-button-question.css'),
      'utf8',
    );
    expect(styles).toMatch(/\.sv-toggle\s*\{[^}]*min-height:\s*44px/s);
    expect(styles).not.toMatch(/\.sv-toggle\s*\{[^}]*max-height/s);
  });
});

// --- 5. FR-079: a mis-authored toggle fails closed to the error screen -------------

describe('a mis-authored toggle reaches the configuration-error screen (US3, FR-079, SC-023)', () => {
  interface Case {
    readonly name: string;
    readonly path: string;
    readonly mutate: (document: JsonObject) => void;
  }

  const CASES: readonly Case[] = [
    {
      name: 'options authored as the radio/checkbox array (scenario 1)',
      path: 'options',
      mutate: (document) => {
        authoredToggle(document)['options'] = [{ id: 'yes', label: 'Yes', value: 'yes' }];
      },
    },
    {
      name: 'a third key inside options (scenario 2)',
      // The offending key's own path, not the block's — which is what US3 scenario 2 asks
      // for: it points the author at `label`, not at the whole object.
      path: 'options.label',
      mutate: (document) => {
        authoredToggle(document)['options'] = {
          onLabel: 'Send me news',
          offLabel: 'No news',
          label: 'News',
        };
      },
    },
    {
      name: 'defaultValue as the string "true" (scenario 3)',
      path: 'defaultValue',
      mutate: (document) => {
        authoredToggle(document)['defaultValue'] = 'true';
      },
    },
    {
      name: 'a blank onLabel (scenario 4)',
      path: 'options.onLabel',
      mutate: (document) => {
        authoredToggle(document)['options'] = { onLabel: '   ', offLabel: 'No news' };
      },
    },
    {
      name: 'a key belonging to another type (scenario 5)',
      path: 'scale',
      mutate: (document) => {
        authoredToggle(document)['scale'] = { min: 1, max: 5 };
      },
    },
    {
      name: 'the toggle options shape on a radio, the trap in reverse (scenario 6)',
      path: 'options',
      mutate: (document) => {
        for (const sheet of pagesOf(document)) {
          for (const question of sheet['questions'] as JsonObject[]) {
            if (question['type'] === 'radio') {
              question['options'] = { onLabel: 'Yes', offLabel: 'No' };
              return;
            }
          }
        }
        throw new Error('the authored fixture no longer holds a radio question');
      },
    },
  ];

  for (const testCase of CASES) {
    it(`renders the error screen and no control for ${testCase.name}`, async () => {
      const document = authoredDocument();
      testCase.mutate(document);

      const validation: SurveyValidation = validateSurveyConfig(document, SERVED_KEY);

      // Half one: it is rejected at all, with the offending path named.
      expect(validation.outcome).toBe('invalid');
      if (validation.outcome !== 'invalid') {
        return;
      }
      expect(validation.error.issues.some((issue) => issue.path.endsWith(testCase.path))).toBe(
        true,
      );

      // Half two: the viewer fails closed on it. A rejection the screen does not render
      // is a half-rendered survey in front of a respondent.
      const harness = await mountViewer(SurveyPageComponent, SERVED_KEY, {
        resolution: { outcome: 'found', entry: manifestEntry() },
        validation,
      });

      expect(harness.host.querySelector('app-configuration-error')).not.toBeNull();
      expect(harness.session.state().kind).toBe('configuration-error');
      expect(controls(harness.host)).toHaveLength(0);
      expect(harness.host.querySelector('.sv-toggle')).toBeNull();
      expect(harness.host.querySelector('.ds-nav')).toBeNull();
    });
  }

  it('leaves no default label behind: the blank onLabel is never silently On', async () => {
    const document = authoredDocument();
    authoredToggle(document)['options'] = { onLabel: '   ', offLabel: 'No news' };

    const validation = validateSurveyConfig(document, SERVED_KEY);
    expect(validation.outcome).toBe('invalid');
    if (validation.outcome !== 'invalid') {
      return;
    }

    const harness = await mountViewer(SurveyPageComponent, SERVED_KEY, {
      resolution: { outcome: 'found', entry: manifestEntry() },
      validation,
    });

    // D-003's mitigation: no fallback wording reaches the screen at all.
    expect(harness.text()).not.toContain('No news');
    expect(harness.host.querySelector('[role="switch"]')).toBeNull();
  });
});
