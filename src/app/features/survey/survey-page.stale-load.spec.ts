/**
 * S10 HIGH-2 — a load that settles late must not write.
 *
 * The session is root-provided and both `open` and `openFailed` begin with `reset()`, so a
 * stale load does not merely render the wrong survey: it clears the answers, attachments,
 * page index and `submissionId` of whatever session is live when it lands. Each fetch has
 * its own 15s deadline, which on a stalled connection is ample room for the respondent to
 * press Back, open a second survey and answer two questions before the first one settles.
 *
 * This spec needs its own TestBed rather than `mountViewer`, because the shared harness
 * answers every key with one scripted resolution — and what is under test here is precisely
 * two keys in flight at once, the second of which must win.
 *
 * Three cases, one per way the stale load could write:
 *
 * - `open` — survey A validates late and would replace the live survey B;
 * - `openFailed` — survey A is a catalog error and would put the configuration-error screen
 *   on `/surveys/b`, which is FR-042's screen attached to the wrong survey;
 * - destroy — the viewer is gone, so there is no screen for the result to belong to at all.
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import type {
  SurveyKeyResolution,
  SurveyManifestEntry,
} from '../../core/models/survey-manifest.model';
import type { SurveyValidation } from '../../core/models/survey-config-error.model';
import type { Survey } from '../../core/models/survey.model';
import {
  page,
  survey,
  surveyKey,
  textboxQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AttachmentCodecService } from '../../core/services/attachment-codec.service';
import { IdFactoryService } from '../../core/services/id-factory.service';
import { SurveyCatalogService } from '../../core/services/survey-catalog.service';
import { SurveyLoaderService } from '../../core/services/survey-loader.service';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from '../../core/services/survey-timeouts';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { configError, manifestEntry } from './__fixtures__/survey-harness';
import { SurveyPageComponent } from './survey-page';

const TIMEOUTS = { fetchMs: 10_000, submitMs: 15_000 };

const SURVEY_A: Survey = survey([page('a1', 'Page A', [textboxQuestion({ id: 'qa' })])], {
  title: 'Survey A',
});

const SURVEY_B: Survey = survey([page('b1', 'Page B', [textboxQuestion({ id: 'qb' })])], {
  title: 'Survey B',
});

/** What the catalog and the loader answer for one key, and when. */
interface KeyScript {
  readonly resolution: SurveyKeyResolution;
  readonly validation?: SurveyValidation;
  /** Both stubs wait on this before answering, so a key can be left hanging. */
  readonly gate?: Promise<void>;
}

interface StaleHarness {
  readonly fixture: ComponentFixture<SurveyPageComponent>;
  readonly session: SurveySessionService;
  readonly host: HTMLElement;
  readonly announcer: AnnouncerService;
  navigateTo(key: string): Promise<void>;
  settle(): Promise<void>;
}

/**
 * Mounts the viewer over stubs that answer **per key**, so two loads can be in flight with
 * different answers and different timings.
 */
async function mountKeyed(
  scripts: Readonly<Record<string, KeyScript>>,
  initialKey: string,
): Promise<StaleHarness> {
  const scriptFor = (key: string): KeyScript => {
    const found = scripts[key];
    if (found === undefined) {
      throw new Error(`no script for key ${key}`);
    }
    return found;
  };

  const catalog = {
    resolve: async (requested: string): Promise<SurveyKeyResolution> => {
      const script = scriptFor(requested);
      if (script.gate !== undefined) {
        await script.gate;
      }
      return script.resolution;
    },
  };

  const loader = {
    load: async (entry: SurveyManifestEntry): Promise<SurveyValidation> => {
      const script = scriptFor(entry.key);
      if (script.validation === undefined) {
        throw new Error(`no validation for key ${entry.key}`);
      }
      return script.validation;
    },
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SurveyPageComponent],
    providers: [
      provideRouter([]),
      SurveySessionService,
      AnnouncerService,
      AttachmentCodecService,
      IdFactoryService,
      { provide: SURVEY_TIMEOUTS, useValue: TIMEOUTS },
      { provide: SurveyCatalogService, useValue: catalog },
      { provide: SurveyLoaderService, useValue: loader },
      { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
    ],
  });

  const session = TestBed.inject(SurveySessionService);
  const announcer = TestBed.inject(AnnouncerService);
  const fixture = TestBed.createComponent(SurveyPageComponent);
  fixture.componentRef.setInput('surveyKey', initialKey);
  await flush(fixture);

  return {
    fixture,
    session,
    announcer,
    host: fixture.nativeElement as HTMLElement,
    navigateTo: async (key: string) => {
      fixture.componentRef.setInput('surveyKey', key);
      await flush(fixture);
    },
    settle: async () => {
      await flush(fixture);
    },
  };
}

/**
 * The load is a chain of plain promises the scheduler does not track, so the macrotask
 * queue has to drain before a render assertion sees what the load produced. Twice, because
 * the chain is two awaits deep and a released gate starts at the first of them.
 */
async function flush(fixture: ComponentFixture<SurveyPageComponent>): Promise<void> {
  for (let i = 0; i < 2; i += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
  await fixture.whenStable();
}

function openGate(): { readonly gate: Promise<void>; release: () => void } {
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release };
}

/** Types into the single textbox on the rendered page. */
async function answer(harness: StaleHarness, text: string): Promise<void> {
  const input = harness.host.querySelector<HTMLInputElement>('input');
  if (input === null) {
    throw new Error('expected a textbox on the rendered page');
  }
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await harness.settle();
}

describe('SurveyPageComponent — a stale load (S10 HIGH-2)', () => {
  it('does not replace the live survey when an earlier key validates late', async () => {
    const a = openGate();
    const harness = await mountKeyed(
      {
        'survey-a': {
          resolution: { outcome: 'found', entry: manifestEntry({ key: surveyKey('survey-a') }) },
          validation: { outcome: 'valid', survey: SURVEY_A },
          gate: a.gate,
        },
        'survey-b': {
          resolution: { outcome: 'found', entry: manifestEntry({ key: surveyKey('survey-b') }) },
          validation: { outcome: 'valid', survey: SURVEY_B },
        },
      },
      'survey-a',
    );

    // A is still hanging: nothing has opened yet.
    expect(harness.session.survey()).toBeNull();

    // Back, then into B — which opens and gets answered while A is still in flight.
    await harness.navigateTo('survey-b');
    expect(harness.session.survey()?.title).toBe('Survey B');
    await answer(harness, 'Everything was fine');
    expect(harness.session.answers().size).toBe(1);

    // A settles inside its 15s deadline, long after the respondent moved on.
    a.release();
    await harness.settle();

    // Without the epoch guard, `session.open(SURVEY_A)` runs here: `reset()` empties the
    // answers and the viewer renders Survey A at `/surveys/survey-b`.
    expect(harness.session.survey()?.title).toBe('Survey B');
    expect(harness.session.answers().size).toBe(1);
    expect(harness.host.querySelector('.sv-survey__title')?.textContent?.trim()).toBe('Survey B');
    expect(harness.host.querySelector<HTMLInputElement>('input')?.value).toBe(
      'Everything was fine',
    );
  });

  it('does not put the configuration-error screen on a live survey when an earlier key fails late', async () => {
    const a = openGate();
    const harness = await mountKeyed(
      {
        'survey-a': {
          resolution: { outcome: 'catalog-error', error: configError({ subject: 'survey-a' }) },
          gate: a.gate,
        },
        'survey-b': {
          resolution: { outcome: 'found', entry: manifestEntry({ key: surveyKey('survey-b') }) },
          validation: { outcome: 'valid', survey: SURVEY_B },
        },
      },
      'survey-a',
    );

    await harness.navigateTo('survey-b');
    await answer(harness, 'Everything was fine');

    a.release();
    await harness.settle();

    // `openFailed` also resets, so this half of the defect loses the answers *and* shows
    // FR-042's screen for a survey the respondent is no longer on.
    expect(harness.session.state().kind).not.toBe('configuration-error');
    expect(harness.host.querySelector('app-configuration-error')).toBeNull();
    expect(harness.session.answers().size).toBe(1);

    // And the live load, not the stale one, owns the polite region: no stale "Loading".
    expect(harness.announcer.polite()).toBeNull();
  });

  it('does not report an unknown key from a load that settles after a later one', async () => {
    const a = openGate();
    const harness = await mountKeyed(
      {
        'survey-a': { resolution: { outcome: 'not-found', surveyKey: 'survey-a' }, gate: a.gate },
        'survey-b': {
          resolution: { outcome: 'found', entry: manifestEntry({ key: surveyKey('survey-b') }) },
          validation: { outcome: 'valid', survey: SURVEY_B },
        },
      },
      'survey-a',
    );

    await harness.navigateTo('survey-b');
    a.release();
    await harness.settle();

    // FR-045's screen is not a session state, so a late `notFoundKey.set` would hide a
    // perfectly good survey behind "no such survey" without touching the session at all.
    expect(harness.host.querySelector('app-not-found-page')).toBeNull();
    expect(harness.host.querySelector('.sv-survey__title')?.textContent?.trim()).toBe('Survey B');
  });

  it('writes nothing once the viewer is destroyed', async () => {
    const a = openGate();
    const harness = await mountKeyed(
      {
        'survey-a': {
          resolution: { outcome: 'found', entry: manifestEntry({ key: surveyKey('survey-a') }) },
          validation: { outcome: 'valid', survey: SURVEY_A },
          gate: a.gate,
        },
      },
      'survey-a',
    );

    // Only one load was ever started, so the epoch counter alone would still match on the
    // way out — this case is the `DestroyRef` half specifically.
    harness.fixture.destroy();

    // The root-provided session outlives the viewer: this stands in for the next screen
    // that has already put its own survey in place.
    harness.session.open(SURVEY_B);
    const question = SURVEY_B.pages[0].questions[0];
    harness.session.setAnswer(question, { kind: 'text', value: 'Everything was fine' });

    a.release();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(harness.session.survey()?.title).toBe('Survey B');
    expect(harness.session.answers().size).toBe(1);
  });
});
