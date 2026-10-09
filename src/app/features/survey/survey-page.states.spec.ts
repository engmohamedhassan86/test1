/**
 * T101 — the viewer renders each of its eight states, and the not-found screen that is
 * none of them.
 *
 * This spec is organised around what each state must **not** show, because that is where
 * FR-040, FR-042 and FR-045 actually bite. Every one of these states renders a heading and
 * looks plausible; the defects are all "and the survey body was still mounted underneath".
 *
 * `loading` and `configuration-error` carry no `Survey` in the model at all, so a template
 * branch for either *cannot* read survey data — that half is enforced by the compiler
 * (D7). What this spec adds is the rendered consequence: no question control reaches the
 * page in those states.
 *
 * The catalog and loader are stubbed at the service seam rather than at `fetch`, because
 * the subject here is the order load -> validate -> render and the branch taken on each
 * outcome, not how JSON arrives.
 */

import { describe, expect, it } from 'vitest';

import {
  page,
  radioQuestion,
  survey,
  textboxQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { FailingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { configError, manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

const SUBJECT = survey(
  [
    page('p1', 'First', [radioQuestion({ id: 'q1', required: true })]),
    page('p2', 'Second', [textboxQuestion({ id: 'q2' })]),
  ],
  { title: 'Customer Feedback' },
);

/**
 * The same shape with nothing required, for the specs about *where* the viewer is rather
 * than about validation. Page 1 of `SUBJECT` holds a required question, so Next there is
 * correctly refused — which is the subject of its own assertions, not a useful setup step.
 */
const PASSABLE = survey(
  [
    page('p1', 'First', [radioQuestion({ id: 'q1', required: false })]),
    page('p2', 'Second', [textboxQuestion({ id: 'q2' })]),
  ],
  { title: 'Customer Feedback' },
);

/** Everything a respondent could type into, across all six types. */
function controls(host: HTMLElement): Element[] {
  return [...host.querySelectorAll('input, textarea, [role="radiogroup"], fieldset')];
}

function found() {
  return { outcome: 'found', entry: manifestEntry() } as const;
}

function valid() {
  return { outcome: 'valid', survey: SUBJECT } as const;
}

describe('SurveyPageComponent — states', () => {
  it('renders the survey title and page 1 once the config validates (ready)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: valid(),
    });

    expect(harness.host.querySelector('.sv-survey__title')?.textContent?.trim()).toBe(
      'Customer Feedback',
    );
    expect(harness.host.querySelector('app-survey-page-body')).not.toBeNull();
    expect(harness.host.querySelector('app-survey-navigation')).not.toBeNull();
    expect(harness.session.state().kind).toBe('ready');
  });

  it('validates after resolving, and only then renders (load -> validate -> render)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: valid(),
    });

    expect(harness.resolvedKeys()).toEqual(['customer-feedback']);
    expect(harness.loadCalls()).toBe(1);
  });

  it('shows a status message and no survey while loading (FR-040)', async () => {
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: valid(),
      resolveAfter: gate,
    });

    const status = harness.host.querySelector('.sv-survey__status');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('Loading');

    // No question, no control, no error — the state carries no `Survey` to render.
    expect(controls(harness.host)).toHaveLength(0);
    expect(harness.host.querySelector('.sv-survey__title')).toBeNull();
    expect(harness.host.querySelector('app-survey-navigation')).toBeNull();

    release();
    await harness.settle();
    expect(harness.host.querySelector('.sv-survey__status')).toBeNull();
  });

  it('renders the configuration-error screen and none of the survey when the config is invalid (FR-042)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'invalid', error: configError({ subject: 'customer-feedback' }) },
    });

    expect(harness.host.querySelector('app-configuration-error')).not.toBeNull();
    expect(harness.session.state().kind).toBe('configuration-error');

    // Principle I: it fails closed. Not one control reaches the page.
    expect(controls(harness.host)).toHaveLength(0);
    expect(harness.host.querySelector('app-survey-page-body')).toBeNull();
    expect(harness.host.querySelector('app-survey-navigation')).toBeNull();
  });

  it('renders the configuration-error screen for an unreadable manifest, not not-found (FR-066)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: {
        outcome: 'catalog-error',
        error: configError({ scope: 'manifest', subject: 'survey-manifest.json' }),
      },
    });

    // An unresolvable key is never reported as unknown: a manifest that could not be read
    // cannot tell us the key is absent either.
    expect(harness.host.querySelector('app-configuration-error')).not.toBeNull();
    expect(harness.host.querySelector('app-not-found-page')).toBeNull();
    // And the loader is never reached, because there is nothing to load.
    expect(harness.loadCalls()).toBe(0);
  });

  it('renders the not-found screen for an unknown key, which is not a viewer state (FR-045)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'no-such-survey', {
      resolution: { outcome: 'not-found', surveyKey: 'no-such-survey' },
    });

    expect(harness.host.querySelector('app-not-found-page')).not.toBeNull();
    expect(harness.text()).toContain('no-such-survey');
    expect(harness.host.querySelector('app-configuration-error')).toBeNull();
    expect(controls(harness.host)).toHaveLength(0);
    expect(harness.loadCalls()).toBe(0);
  });

  it('reports a blocked Next as an assertive summary beside the survey (validation-error)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: valid(),
    });

    harness.session.next();
    await harness.settle();

    const summary = harness.host.querySelector('.sv-summary');
    expect(summary?.getAttribute('role')).toBe('alert');
    expect(summary?.querySelectorAll('li').length).toBeGreaterThan(0);

    // FR-029: the page the respondent was on is still there, with its controls.
    expect(harness.session.state().kind).toBe('validation-error');
    expect(harness.host.querySelector('app-survey-page-body')).not.toBeNull();
    expect(harness.session.currentPageIndex()).toBe(0);
  });

  it('names every error on the current page in the summary', async () => {
    const twoRequired = survey([
      page('p1', 'First', [
        radioQuestion({ id: 'q1', required: true }),
        textboxQuestion({ id: 'q2', required: true }),
      ]),
      page('p2', 'Second', [textboxQuestion({ id: 'q3' })]),
    ]);

    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: twoRequired },
    });

    harness.session.next();
    await harness.settle();

    // Driven off the session's own error list, so a summary rendering only the first fails.
    expect(harness.host.querySelectorAll('.sv-summary li')).toHaveLength(
      harness.session.currentPageErrors().length,
    );
    expect(harness.session.currentPageErrors()).toHaveLength(2);
  });

  it('marks the Submit control busy while the submission is in flight (submitting)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: survey([page('p1', 'Only', [])]) },
      gateway: new FailingSurveyResponseGateway('never-answers'),
    });

    void harness.session.submit();
    await harness.settle();

    expect(harness.session.state().kind).toBe('submitting');
    const submit = harness.host.querySelector('.sv-nav__button--primary');
    expect(submit?.getAttribute('aria-busy')).toBe('true');
    // No confirmation yet — nothing has been acknowledged.
    expect(harness.host.querySelector('app-submission-confirmation')).toBeNull();
  });

  it('renders the confirmation alone once the submission is acknowledged (submitted)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: survey([page('p1', 'Only', [])]) },
    });

    await harness.session.submit();
    await harness.settle();

    expect(harness.session.state().kind).toBe('submitted');
    expect(harness.host.querySelector('app-submission-confirmation')).not.toBeNull();

    // US1 scenario 4: the confirmation alone, with no control left behind.
    expect(controls(harness.host)).toHaveLength(0);
    expect(harness.host.querySelector('app-survey-page-body')).toBeNull();
    expect(harness.host.querySelector('app-survey-navigation')).toBeNull();
  });

  it('keeps the page and offers Try again when the submission fails (submission-error)', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: survey([page('p1', 'Only', [])]) },
      gateway: new FailingSurveyResponseGateway('transport-error'),
    });

    await harness.session.submit();
    await harness.settle();

    expect(harness.session.state().kind).toBe('submission-error');

    const summary = harness.host.querySelector('.sv-submit-error');
    expect(summary?.getAttribute('role')).toBe('alert');
    expect(harness.host.querySelector('.sv-submit-error__retry')?.textContent?.trim()).toBe(
      'Try again',
    );

    // Principle III: no success screen, and the survey is still on the page.
    expect(harness.host.querySelector('app-submission-confirmation')).toBeNull();
    expect(harness.host.querySelector('app-survey-page-body')).not.toBeNull();
  });

  it('keeps every answer across a failed submission (Principle III)', async () => {
    const oneQuestion = survey([page('p1', 'Only', [textboxQuestion({ id: 'q1' })])]);
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: oneQuestion },
      gateway: new FailingSurveyResponseGateway('server-error'),
    });

    const input = harness.host.querySelector<HTMLInputElement>('input');
    if (input === null) {
      throw new Error('expected a textbox');
    }
    input.value = 'Everything was fine';
    input.dispatchEvent(new Event('input'));
    await harness.settle();

    await harness.session.submit();
    await harness.settle();

    expect(harness.session.answers().size).toBe(1);
    // Still in the DOM, still holding what was typed.
    expect(harness.host.querySelector<HTMLInputElement>('input')?.value).toBe(
      'Everything was fine',
    );
  });

  it('sets the survey document title while the viewer is open (FR-077)', async () => {
    await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: valid(),
    });

    expect(document.title).toBe('Customer Feedback — Survey');
  });

  it('sets the configuration-error document title instead when the config fails (FR-077)', async () => {
    await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'invalid', error: configError() },
    });

    expect(document.title).toBe('Survey not available');
  });

  it('reloads and returns to page 1 when the route key changes', async () => {
    const harness = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: PASSABLE },
    });

    harness.session.next();
    await harness.settle();
    expect(harness.session.currentPageIndex()).toBe(1);

    await harness.navigateTo('product-pulse');

    // The routed input drives the load, so a key change re-resolves and re-opens rather
    // than leaving the previous survey's page position in place.
    expect(harness.resolvedKeys()).toEqual(['customer-feedback', 'product-pulse']);
    expect(harness.loadCalls()).toBe(2);
    expect(harness.session.currentPageIndex()).toBe(0);
  });

  it('opens a freshly mounted viewer at page 1 with no answers (US1 scenario 8)', async () => {
    const first = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: PASSABLE },
    });

    first.session.next();
    await first.settle();
    expect(first.session.currentPageIndex()).toBe(1);

    // Reopening the survey is a route change away and back, which is a new component
    // instance and a new session — not a re-set of the same routed input, which a signal
    // input would not even report as a change.
    const reopened = await mountViewer(SurveyPageComponent, 'customer-feedback', {
      resolution: found(),
      validation: { outcome: 'valid', survey: PASSABLE },
    });

    expect(reopened.session.currentPageIndex()).toBe(0);
    expect(reopened.session.answers().size).toBe(0);
    expect(reopened.session.state().kind).toBe('ready');
  });
});
