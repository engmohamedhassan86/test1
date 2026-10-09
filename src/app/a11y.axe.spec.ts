/**
 * T129 — `axe-core` over each of the seven screens SC-009 names, in jsdom.
 *
 * The seven: catalog, survey viewer, validation-error, submission-error, confirmation,
 * configuration-error, not-found.
 *
 * The **survey viewer** is swept as all four pages of `customer-feedback`, one page at a
 * time, not page 1 alone. The viewer renders a single page per route and the fixture
 * spreads the six question types across four pages:
 *
 * ```
 * page 1  textbox, radio          page 3  textarea (with an attachment policy)
 * page 2  satisfaction, checkbox, rating   page 4  textarea, radio
 * ```
 *
 * So a page-1-only sweep never sees four of the six types — `satisfaction`, `checkbox`,
 * `rating` and `textarea`. Sweeping pages 1 and 2 is not enough either: `textarea` appears
 * only on pages 3 and 4. Only all four pages reach all six.
 *
 * ## Three limits on what this check can see
 *
 * These are statements about the tool, not relaxations of any requirement.
 *
 * 1. **jsdom computes no layout**, so FR-057 (colour contrast) is not covered here. Every
 *    contrast result comes back `incomplete` rather than `pass` or `violation`, because axe
 *    cannot resolve a computed colour against a background it cannot paint.
 * 2. **jsdom has no viewport**, so FR-058 (reflow at 375px and the 44x44 target size) is
 *    not covered either. Both remain gate 5's, the browser smoke test at 375px and 1280px.
 * 3. **axe detects a missing accessible name, never a wrong one.** A control named
 *    "Question" passes every axe rule and violates FR-053. So this sweep is *not* evidence
 *    for FR-053 — the per-type assertions in T103-T107 own that, and they assert the name's
 *    text by resolving `aria-labelledby` to the content it points at.
 *
 * ## Why violations are reported rather than counted
 *
 * `expect(violations).toEqual([])` prints the whole object and buries the useful line. The
 * assertion compares a list of `rule: target` strings instead, so a failure names the rule
 * and the element it fired on in one readable line.
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SurveyConfigError } from './core/models/survey-config-error.model';
import { customerFeedbackSurvey } from './core/models/__fixtures__/survey-builders';
import { AnnouncerService } from './core/services/announcer.service';
import { AttachmentCodecService } from './core/services/attachment-codec.service';
import { IdFactoryService } from './core/services/id-factory.service';
import { SurveyCatalogService } from './core/services/survey-catalog.service';
import { SurveyLoaderService } from './core/services/survey-loader.service';
import { SurveyResponseGateway } from './core/services/survey-response.gateway';
import { SurveySessionService } from './core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from './core/services/survey-timeouts';
import { stubFetchJson } from './core/services/__fixtures__/fetch-stub';
import {
  AcknowledgingSurveyResponseGateway,
  FailingSurveyResponseGateway,
} from './core/services/testing/failing-survey-response.gateway';
import { CatalogPageComponent } from './features/catalog/catalog-page';
import { manifestEntry } from './features/survey/__fixtures__/survey-harness';
import { SurveyPageComponent } from './features/survey/survey-page';
import { ConfigurationErrorComponent } from './shared/configuration-error';
import { NotFoundPageComponent } from './shared/not-found-page';

const SUBJECT = customerFeedbackSurvey();

/**
 * The rules axe cannot evaluate without layout, excluded so their `incomplete` results do
 * not read as passes.
 *
 * This is **not** a relaxation: `colour-contrast` is FR-057 and lives in gate 5, which
 * measures it in a real browser at both viewports. Naming it here is what makes the
 * omission visible instead of silent — an unexcluded `incomplete` would look like the rule
 * had been checked and found nothing.
 */
const NO_LAYOUT_RULES = ['color-contrast', 'target-size'] as const;

/** Two entries, one of them without a `description`, so both catalog branches render. */
const CATALOG_MANIFEST = {
  surveys: [
    {
      key: 'customer-feedback',
      title: 'Customer Feedback',
      description: 'Four short pages about your recent order.',
      config: 'surveys/customer-feedback.json',
    },
    { key: 'product-pulse', title: 'Product Pulse', config: 'surveys/product-pulse.json' },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

interface Sweep {
  readonly violations: readonly string[];
  readonly ran: number;
}

/** Runs axe over one rendered screen and summarises it. */
async function sweep(host: HTMLElement): Promise<Sweep> {
  const result = await axe.run(host, {
    resultTypes: ['violations'],
    rules: Object.fromEntries(NO_LAYOUT_RULES.map((rule) => [rule, { enabled: false }])),
  });

  return {
    violations: result.violations.flatMap((violation) =>
      violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
    ),
    // Guards against a configuration that silently runs nothing at all, which would make
    // every assertion below vacuous.
    ran: result.passes.length + result.violations.length + result.incomplete.length,
  };
}

/** Asserts a screen is clean, and that axe actually evaluated something on it. */
async function expectClean(host: HTMLElement, screen: string): Promise<void> {
  const result = await sweep(host);
  expect(result.violations, `axe violations on the ${screen} screen`).toEqual([]);
  expect(result.ran, `axe evaluated no rule at all on the ${screen} screen`).toBeGreaterThan(0);
}

// --- mounting the seven screens -------------------------------------------------------

const TIMEOUTS = { fetchMs: 10_000, submitMs: 15_000 };

function sessionProviders(gateway: SurveyResponseGateway) {
  return [
    SurveySessionService,
    AnnouncerService,
    AttachmentCodecService,
    IdFactoryService,
    { provide: SURVEY_TIMEOUTS, useValue: TIMEOUTS },
    { provide: SurveyResponseGateway, useValue: gateway },
  ];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let turn = 0; turn < 3; turn += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    await fixture.whenStable();
  }
}

/** Mounts the viewer with the catalog and loader stubbed at the service seam. */
async function mountViewerScreen(
  options: {
    readonly notFound?: boolean;
    readonly invalid?: SurveyConfigError;
    readonly gateway?: SurveyResponseGateway;
  } = {},
): Promise<{
  readonly host: HTMLElement;
  readonly session: SurveySessionService;
  readonly fixture: ComponentFixture<SurveyPageComponent>;
}> {
  const catalog = {
    resolve: async () =>
      options.notFound === true
        ? ({ outcome: 'not-found', surveyKey: 'nope' } as const)
        : ({ outcome: 'found', entry: manifestEntry() } as const),
  };
  const loader = {
    load: async () =>
      options.invalid === undefined
        ? ({ outcome: 'valid', survey: SUBJECT } as const)
        : ({ outcome: 'invalid', error: options.invalid } as const),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SurveyPageComponent],
    providers: [
      provideRouter([]),
      ...sessionProviders(options.gateway ?? new AcknowledgingSurveyResponseGateway()),
      { provide: SurveyCatalogService, useValue: catalog },
      { provide: SurveyLoaderService, useValue: loader },
    ],
  });

  const session = TestBed.inject(SurveySessionService);
  const fixture = TestBed.createComponent(SurveyPageComponent);
  fixture.componentRef.setInput('surveyKey', 'customer-feedback');
  await settle(fixture);

  return { host: fixture.nativeElement as HTMLElement, session, fixture };
}

/** Mounts a screen that takes data rather than a session. */
async function mountStandalone<T>(
  component: Type<T>,
  inputs: Readonly<Record<string, unknown>>,
): Promise<HTMLElement> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideRouter([])],
  });

  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const CONFIG_ERROR: SurveyConfigError = {
  scope: 'survey',
  subject: 'customer-feedback',
  issues: [
    {
      code: 'F02',
      path: 'pages[0].questions[1].title',
      message: 'pages[0].questions[1].title is required and was missing.',
    },
  ],
};

/** Answers one page fully so Next is accepted, by question type. */
async function answerCurrentPage(
  session: SurveySessionService,
  fixture: ComponentFixture<SurveyPageComponent>,
): Promise<void> {
  const page = session.currentPage();
  if (page === null) {
    throw new Error('expected a page to be open');
  }
  for (const question of page.questions) {
    switch (question.type) {
      case 'textbox':
      case 'textarea':
        session.setAnswer(question, { kind: 'text', value: 'A sufficiently long answer' });
        break;
      case 'radio':
        session.setAnswer(question, { kind: 'option', value: question.options[0].value });
        break;
      case 'checkbox':
        session.setAnswer(question, { kind: 'options', values: [question.options[0].value] });
        break;
      case 'rating':
        session.setAnswer(question, { kind: 'point', value: question.scale.min });
        break;
      case 'satisfaction':
        session.setAnswer(question, { kind: 'point', value: 3 });
        break;
    }
  }
  await settle(fixture);
}

describe('accessibility — axe over the seven SC-009 screens', () => {
  it('sweeps the catalog screen', async () => {
    // The real `SurveyCatalogService` over a stubbed `fetch`, rather than a hand-written
    // double. The component reads `catalog.state` as a signal and calls `catalog.load()`;
    // a double has to reproduce both or the screen renders nothing and the sweep passes
    // vacuously on an empty host.
    stubFetchJson(CATALOG_MANIFEST);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [provideRouter([]), { provide: SURVEY_TIMEOUTS, useValue: TIMEOUTS }],
    });
    const fixture = TestBed.createComponent(CatalogPageComponent);
    await settle(fixture);

    const host = fixture.nativeElement as HTMLElement;
    // The ready state, not the loading or error one — those are swept separately, and an
    // unrendered list is the failure mode this guards.
    expect(host.querySelectorAll('.sv-catalog__link')).toHaveLength(2);

    await expectClean(host, 'catalog');
  });

  it('sweeps all four pages of the survey viewer, one page at a time', async () => {
    const { host, session, fixture } = await mountViewerScreen();

    // Page 1 before anything is answered, then each later page in turn. Walking rather
    // than jumping, because Next validates: a page reached by setting the index directly
    // would not be a page the respondent can actually arrive at.
    for (let pageIndex = 0; pageIndex < SUBJECT.pages.length; pageIndex += 1) {
      expect(session.currentPageIndex()).toBe(pageIndex);
      await expectClean(host, `survey viewer page ${pageIndex + 1}`);

      if (pageIndex < SUBJECT.pages.length - 1) {
        await answerCurrentPage(session, fixture);
        session.next();
        await settle(fixture);
      }
    }

    // The walk really did reach the last page — otherwise the loop above could have swept
    // page 1 four times and still passed.
    expect(session.currentPageIndex()).toBe(SUBJECT.pages.length - 1);
  });

  it('reaches every one of the six question types during the viewer sweep', async () => {
    // The guard that makes the sweep above mean what T129 says it means. If the fixture
    // ever stops spreading the six types over the four pages, this fails here rather than
    // leaving the sweep quietly checking fewer types than it claims.
    const swept = new Set(SUBJECT.pages.flatMap((page) => page.questions.map((q) => q.type)));
    expect([...swept].sort()).toEqual([
      'checkbox',
      'radio',
      'rating',
      'satisfaction',
      'textarea',
      'textbox',
    ]);
  });

  it('sweeps the validation-error screen', async () => {
    const { host, session, fixture } = await mountViewerScreen();

    // A blocked Next: page 1's required questions are unanswered, so the summary and the
    // per-question errors both render.
    session.next();
    await settle(fixture);
    expect(session.state().kind).toBe('validation-error');
    expect(host.querySelector('.sv-summary')).not.toBeNull();

    await expectClean(host, 'validation-error');
  });

  it('sweeps the validation-error screen with the survey-wide scope', async () => {
    const { host, session, fixture } = await mountViewerScreen();

    // The FR-034 variant, which renders an extra line the page-scope one does not. Swept
    // separately because it is different markup, not a different value in the same markup.
    await answerCurrentPage(session, fixture);
    session.next();
    await settle(fixture);
    session.clearAnswer(SUBJECT.pages[0].questions[0].id);
    await settle(fixture);
    await session.submit();
    await settle(fixture);

    expect(session.state().kind).toBe('validation-error');
    await expectClean(host, 'validation-error (survey scope)');
  });

  it('sweeps the submission-error screen', async () => {
    const { host, session, fixture } = await mountViewerScreen({
      gateway: new FailingSurveyResponseGateway('transport-error'),
    });

    for (let pageIndex = 0; pageIndex < SUBJECT.pages.length - 1; pageIndex += 1) {
      await answerCurrentPage(session, fixture);
      session.next();
      await settle(fixture);
    }
    await answerCurrentPage(session, fixture);
    await session.submit();
    await settle(fixture);

    expect(session.state().kind).toBe('submission-error');
    expect(host.querySelector('.sv-submit-error')).not.toBeNull();

    await expectClean(host, 'submission-error');
  });

  it('sweeps the confirmation screen', async () => {
    const { host, session, fixture } = await mountViewerScreen({
      gateway: new AcknowledgingSurveyResponseGateway('sub_axe', '2026-05-05T00:00:00.000Z'),
    });

    for (let pageIndex = 0; pageIndex < SUBJECT.pages.length - 1; pageIndex += 1) {
      await answerCurrentPage(session, fixture);
      session.next();
      await settle(fixture);
    }
    await answerCurrentPage(session, fixture);
    await session.submit();
    await settle(fixture);

    expect(session.state().kind).toBe('submitted');
    expect(host.querySelector('app-submission-confirmation')).not.toBeNull();

    await expectClean(host, 'confirmation');
  });

  it('sweeps the configuration-error screen', async () => {
    const { host, session } = await mountViewerScreen({ invalid: CONFIG_ERROR });

    expect(session.state().kind).toBe('configuration-error');
    await expectClean(host, 'configuration-error (through the viewer)');

    // And the component on its own with a manifest-scope error, which renders different
    // wording from the survey-scope one above.
    const manifestScope = await mountStandalone(ConfigurationErrorComponent, {
      error: { ...CONFIG_ERROR, scope: 'manifest', subject: 'survey-manifest.json' },
    });
    await expectClean(manifestScope, 'configuration-error (manifest scope)');
  });

  it('sweeps the not-found screen', async () => {
    const { host } = await mountViewerScreen({ notFound: true });

    expect(host.querySelector('app-not-found-page')).not.toBeNull();
    await expectClean(host, 'not-found (through the viewer)');

    const standalone = await mountStandalone(NotFoundPageComponent, { surveyKey: 'nope' });
    await expectClean(standalone, 'not-found');
  });

  it('would report a violation if one existed, so the sweeps are not vacuous', async () => {
    // The positive control for the whole file. Every assertion above is an absence, and an
    // `axe.run` that silently evaluated nothing — a wrong selector, a host detached from
    // the document, a rule set excluded to nothing — would satisfy all of them. This plants
    // a real violation and checks the harness reports it.
    const broken = document.createElement('div');
    broken.innerHTML = '<img src="x.png">'; // no alt: `image-alt`
    document.body.appendChild(broken);
    try {
      const result = await sweep(broken);
      expect(result.violations.some((entry) => entry.startsWith('image-alt'))).toBe(true);
    } finally {
      broken.remove();
    }
  });
});
