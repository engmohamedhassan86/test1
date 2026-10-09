/**
 * Shared setup for the survey-feature specs: the navigation, the page body, the viewer's
 * state switch, and the confirmation screen.
 *
 * Two different mounts, because the components need two different things.
 *
 * `mountWithSession` gives a component a **real** `SurveySessionService` with a survey
 * already open. Navigation and the page body read nothing but session signals, so a stub
 * session would turn their specs into assertions about the stub: "Submit appears on the
 * last page" is only meaningful if `primaryAction` is the real computed signal deciding it.
 *
 * `mountViewer` additionally stubs the **catalog and loader**, which are the only two
 * boundaries that reach the network. They are stubbed at the service seam rather than at
 * `fetch`, because what the viewer's specs are about is the order load -> validate ->
 * render and the branch it takes on each outcome — not how JSON arrives.
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { Type } from '@angular/core';
import { provideRouter } from '@angular/router';

import type { NonEmpty } from '../../../core/models/branded';
import type {
  ConfigIssue,
  SurveyConfigError,
  SurveyValidation,
} from '../../../core/models/survey-config-error.model';
import type {
  SurveyKeyResolution,
  SurveyManifestEntry,
} from '../../../core/models/survey-manifest.model';
import type { SubmissionReceipt } from '../../../core/models/survey-response.model';
import type { Survey } from '../../../core/models/survey.model';
import { surveyKey } from '../../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../../core/services/announcer.service';
import { AttachmentCodecService } from '../../../core/services/attachment-codec.service';
import { IdFactoryService } from '../../../core/services/id-factory.service';
import { SurveyCatalogService } from '../../../core/services/survey-catalog.service';
import { SurveyLoaderService } from '../../../core/services/survey-loader.service';
import { SurveyResponseGateway } from '../../../core/services/survey-response.gateway';
import { SurveySessionService } from '../../../core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from '../../../core/services/survey-timeouts';
import { AcknowledgingSurveyResponseGateway } from '../../../core/services/testing/failing-survey-response.gateway';

export interface SessionHarness<T> {
  readonly fixture: ComponentFixture<T>;
  readonly session: SurveySessionService;
  readonly host: HTMLElement;
  settle(): Promise<void>;
  text(): string;
}

const TIMEOUTS = { fetchMs: 10_000, submitMs: 15_000 };

/** Mounts `component` over a real session with `subject` already open. */
export async function mountWithSession<T>(
  component: Type<T>,
  subject: Survey,
  options: { readonly gateway?: SurveyResponseGateway } = {},
): Promise<SessionHarness<T>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      SurveySessionService,
      AnnouncerService,
      AttachmentCodecService,
      IdFactoryService,
      { provide: SURVEY_TIMEOUTS, useValue: TIMEOUTS },
      {
        provide: SurveyResponseGateway,
        useValue: options.gateway ?? new AcknowledgingSurveyResponseGateway(),
      },
    ],
  });

  const session = TestBed.inject(SurveySessionService);
  session.open(subject);

  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();

  return harnessOf(fixture, session);
}

/**
 * What the catalog and loader stubs should answer for one run of the viewer.
 *
 * `resolution` and `validation` are separate because the pairing is the point: a
 * `catalog-error` must reach the configuration-error screen *without* the loader being
 * called at all, and that is only observable if the loader is a distinct recorded stub.
 */
export interface ViewerScript {
  readonly resolution: SurveyKeyResolution;
  readonly validation?: SurveyValidation;
  readonly gateway?: SurveyResponseGateway;
  /** Resolves the manifest only once this settles, for the `loading`-state assertions. */
  readonly resolveAfter?: Promise<void>;
}

export interface ViewerHarness<T> extends SessionHarness<T> {
  /** How many times the loader was asked for a config. */
  loadCalls(): number;
  /** The keys the catalog was asked to resolve, in order. */
  resolvedKeys(): readonly string[];
  /** Re-points the routed input, which is how reopening a survey is exercised. */
  navigateTo(key: string): Promise<void>;
}

export async function mountViewer<T>(
  component: Type<T>,
  key: string,
  script: ViewerScript,
): Promise<ViewerHarness<T>> {
  const resolvedKeys: string[] = [];
  let loadCalls = 0;

  const catalog = {
    resolve: async (requested: string): Promise<SurveyKeyResolution> => {
      resolvedKeys.push(requested);
      if (script.resolveAfter !== undefined) {
        await script.resolveAfter;
      }
      return script.resolution;
    },
  };

  const loader = {
    load: async (_entry: SurveyManifestEntry): Promise<SurveyValidation> => {
      loadCalls += 1;
      if (script.validation === undefined) {
        throw new Error('the loader was called, but this script supplied no validation');
      }
      return script.validation;
    },
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      SurveySessionService,
      AnnouncerService,
      AttachmentCodecService,
      IdFactoryService,
      { provide: SURVEY_TIMEOUTS, useValue: TIMEOUTS },
      { provide: SurveyCatalogService, useValue: catalog },
      { provide: SurveyLoaderService, useValue: loader },
      {
        provide: SurveyResponseGateway,
        useValue: script.gateway ?? new AcknowledgingSurveyResponseGateway(),
      },
    ],
  });

  const session = TestBed.inject(SurveySessionService);
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('surveyKey', key);
  await fixture.whenStable();

  const base = harnessOf(fixture, session);

  return {
    ...base,
    loadCalls: () => loadCalls,
    resolvedKeys: () => [...resolvedKeys],
    navigateTo: async (next: string) => {
      fixture.componentRef.setInput('surveyKey', next);
      await fixture.whenStable();
    },
  };
}

function harnessOf<T>(
  fixture: ComponentFixture<T>,
  session: SurveySessionService,
): SessionHarness<T> {
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    session,
    host,
    settle: async () => {
      await fixture.whenStable();
    },
    text: () => host.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  };
}

// --- builders for the two screens that take data rather than a session -------------

export function configIssue(overrides: Partial<ConfigIssue> = {}): ConfigIssue {
  return {
    code: 'F02',
    path: 'pages[0].questions[1].title',
    message: 'pages[0].questions[1].title is required and was missing.',
    ...overrides,
  };
}

export function configError(overrides: Partial<SurveyConfigError> = {}): SurveyConfigError {
  const issues: NonEmpty<ConfigIssue> = overrides.issues ?? [configIssue()];
  return {
    scope: 'survey',
    subject: 'customer-feedback',
    ...overrides,
    issues,
  };
}

export function receipt(overrides: Partial<SubmissionReceipt> = {}): SubmissionReceipt {
  return {
    submissionId: 'sub_01HQ8X3ZV9',
    receivedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  };
}

export function manifestEntry(overrides: Partial<SurveyManifestEntry> = {}): SurveyManifestEntry {
  return {
    key: surveyKey('customer-feedback'),
    title: 'Customer Feedback',
    description: null,
    config: 'surveys/customer-feedback.json',
    ...overrides,
  };
}
