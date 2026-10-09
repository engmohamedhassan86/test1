/**
 * The shared setup for the five per-type question specs and the host spec.
 *
 * Each of those specs renders a real `QuestionHostComponent` over a real
 * `SurveySessionService` with a real survey opened, rather than over a stubbed session.
 * The reason is FR-053 and FR-054: the accessible name and `aria-describedby` both point at
 * ids the **host** renders, so a spec that mounted a type component in isolation with a
 * hand-written `titleId` would assert a wiring that does not exist in the application.
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import type { Question, Survey } from '../../../../core/models/survey.model';
import { page, survey } from '../../../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../../../core/services/announcer.service';
import { AttachmentCodecService } from '../../../../core/services/attachment-codec.service';
import { IdFactoryService } from '../../../../core/services/id-factory.service';
import { SurveyResponseGateway } from '../../../../core/services/survey-response.gateway';
import { SurveySessionService } from '../../../../core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from '../../../../core/services/survey-timeouts';
import { AcknowledgingSurveyResponseGateway } from '../../../../core/services/testing/failing-survey-response.gateway';
import { QuestionHostComponent } from '../question-host';

export interface QuestionHarness {
  readonly fixture: ComponentFixture<QuestionHostComponent>;
  readonly session: SurveySessionService;
  readonly host: HTMLElement;
  /** Re-renders and resolves, so an assertion sees the effect of the last command. */
  settle(): Promise<void>;
  /** The accessible name an `aria-labelledby` reference resolves to. */
  accessibleName(element: Element): string;
}

/** Mounts the host over `question`, with a one-page survey already open. */
export async function mountQuestion(
  question: Question,
  options: {
    readonly extraQuestions?: readonly Question[];
    /** Override for the FR-039 assertions, which need a submission still in flight. */
    readonly gateway?: SurveyResponseGateway;
  } = {},
): Promise<QuestionHarness> {
  const subject: Survey = survey([
    page('p1', 'Only page', [question, ...(options.extraQuestions ?? [])]),
  ]);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [QuestionHostComponent],
    providers: [
      SurveySessionService,
      AnnouncerService,
      AttachmentCodecService,
      IdFactoryService,
      { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
      {
        provide: SurveyResponseGateway,
        useValue: options.gateway ?? new AcknowledgingSurveyResponseGateway(),
      },
    ],
  });

  const session = TestBed.inject(SurveySessionService);
  session.open(subject);

  const fixture = TestBed.createComponent(QuestionHostComponent);
  fixture.componentRef.setInput('question', question);
  await fixture.whenStable();

  const host = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    session,
    host,
    settle: async () => {
      await fixture.whenStable();
    },
    accessibleName: (element) => accessibleNameOf(host, element),
  };
}

/**
 * Resolves `aria-labelledby` to the text it names, which is what FR-053 is actually about:
 * "a label is present" and "the label is the question's title" are different assertions,
 * and axe can only see the first (`T129`'s third recorded limit).
 */
export function accessibleNameOf(root: HTMLElement, element: Element): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy !== null) {
    return labelledBy
      .split(/\s+/)
      .map((id) => root.querySelector(`#${id}`)?.textContent?.trim() ?? '')
      .join(' ')
      .trim();
  }

  const legend = element.querySelector('legend');
  if (legend !== null) {
    return legend.textContent?.trim() ?? '';
  }

  const label = element.getAttribute('aria-label');
  return label ?? '';
}
