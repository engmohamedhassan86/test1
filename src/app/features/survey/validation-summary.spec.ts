/**
 * T115 — the page-level summary, FR-030 and FR-034.
 *
 * The errors and reports it is handed come from the **real** `validatePage` and
 * `validateSurvey` rather than from hand-written literals. A hand-built error list would
 * let this spec assert an order the validator does not actually produce, which is
 * precisely the claim "in page order" is about.
 *
 * The staleness half — that correcting one answer drops its row immediately — is asserted
 * in `survey-page.validation.spec.ts` (US2 scenario 8), because it is a property of the
 * live list the session computes rather than of this component.
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AnswerMap, AttachmentMap } from '../../core/models/answer.model';
import type { Survey, SurveyPage } from '../../core/models/survey.model';
import type {
  ValidationError,
  SurveyValidationReport,
  ValidationScope,
} from '../../core/models/validation.model';
import {
  checkboxQuestion,
  page,
  radioQuestion,
  satisfactionQuestion,
  survey,
  textboxQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AttachmentCodecService } from '../../core/services/attachment-codec.service';
import { IdFactoryService } from '../../core/services/id-factory.service';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from '../../core/services/survey-timeouts';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { validatePage } from '../../core/validators/page.validator';
import { validateSurvey } from '../../core/validators/survey.validator';
import { ValidationSummaryComponent } from './validation-summary';

const NO_ANSWERS: AnswerMap = new Map();
const NO_ATTACHMENTS: AttachmentMap = new Map();

interface SummaryHarness {
  readonly fixture: ComponentFixture<ValidationSummaryComponent>;
  readonly session: SurveySessionService;
  readonly host: HTMLElement;
  region(): HTMLElement | null;
  links(): readonly HTMLAnchorElement[];
  rows(): readonly SummaryRow[];
  text(): string;
}

/** One rendered row, split into the two halves whose pairing FR-054 is about. */
interface SummaryRow {
  readonly question: string;
  readonly message: string;
}

async function mountSummary(options: {
  readonly subject: Survey;
  readonly subjectPage: SurveyPage;
  readonly errors: readonly ValidationError[];
  readonly scope: ValidationScope;
  readonly surveyReport?: SurveyValidationReport | null;
}): Promise<SummaryHarness> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidationSummaryComponent],
    providers: [
      SurveySessionService,
      AnnouncerService,
      AttachmentCodecService,
      IdFactoryService,
      { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
      { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
    ],
  });

  const session = TestBed.inject(SurveySessionService);
  session.open(options.subject);

  const fixture = TestBed.createComponent(ValidationSummaryComponent);
  fixture.componentRef.setInput('page', options.subjectPage);
  fixture.componentRef.setInput('errors', options.errors);
  fixture.componentRef.setInput('scope', options.scope);
  fixture.componentRef.setInput('surveyReport', options.surveyReport ?? null);
  await fixture.whenStable();

  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    session,
    host,
    region: () => host.querySelector<HTMLElement>('.sv-summary'),
    links: () => [...host.querySelectorAll<HTMLAnchorElement>('.sv-summary__link')],
    rows: () =>
      [...host.querySelectorAll<HTMLElement>('.sv-summary__item')].map((item) => ({
        question: item.querySelector('.sv-summary__link')?.textContent?.trim() ?? '',
        message: item.querySelector('.sv-summary__message')?.textContent?.trim() ?? '',
      })),
    text: () => host.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  };
}

/** Page 1 of the two-page subject: three required questions, all unanswered. */
function threeInvalidQuestions(): SurveyPage {
  return page('p1', 'First', [
    radioQuestion({ id: 'q_segment', title: 'Which of these describes you?', required: true }),
    textboxQuestion({ id: 'q_name', title: 'What should we call you?', required: true }),
    satisfactionQuestion({ id: 'q_satisfaction', title: 'How was today?', required: true }),
  ]);
}

describe('ValidationSummaryComponent (T115)', () => {
  let first: SurveyPage;
  let subject: Survey;

  beforeEach(() => {
    first = threeInvalidQuestions();
    subject = survey([
      first,
      page('p2', 'Second', [checkboxQuestion({ id: 'q_liked', required: true, minSelections: 1 })]),
    ]);
  });

  it('renders one assertive region (FR-030)', async () => {
    const report = validatePage(first, 0, NO_ANSWERS, NO_ATTACHMENTS);
    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: report.errors,
      scope: 'page',
    });

    const region = harness.region();
    expect(region).not.toBeNull();
    // `role="alert"` is the assertive mapping; both are asserted because FR-030 names
    // the behaviour and only one of the two is visible in the markup at a glance.
    expect(region?.getAttribute('role')).toBe('alert');
    expect(region?.getAttribute('aria-live')).toBe('assertive');
    expect(harness.host.querySelectorAll('.sv-summary')).toHaveLength(1);
  });

  it('lists every invalid question in page order (FR-030)', async () => {
    const report = validatePage(first, 0, NO_ANSWERS, NO_ATTACHMENTS);
    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: report.errors,
      scope: 'page',
    });

    // The order asserted is the page's own question order, not the report's — so a
    // summary that happened to re-sort its rows would fail here.
    expect(harness.links().map((link) => link.textContent?.trim())).toEqual([
      'Which of these describes you?',
      'What should we call you?',
      'How was today?',
    ]);
  });

  it("pairs each question's name with that question's own FR-069 message", async () => {
    const report = validatePage(first, 0, NO_ANSWERS, NO_ATTACHMENTS);
    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: report.errors,
      scope: 'page',
    });

    // Asserted as pairs rather than as one joined string: the pairing is the claim, and a
    // summary that listed three correct names and three correct messages in two separate
    // lists — or crossed them over — would pass a text-contains assertion.
    expect(harness.rows()).toEqual([
      { question: 'Which of these describes you?', message: 'Choose one option' },
      { question: 'What should we call you?', message: 'Enter an answer' },
      { question: 'How was today?', message: 'Choose a value between 1 and 5' },
    ]);
  });

  it("gives every row a link to its own question's control", async () => {
    const report = validatePage(first, 0, NO_ANSWERS, NO_ATTACHMENTS);
    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: report.errors,
      scope: 'page',
    });

    expect(harness.links().map((link) => link.getAttribute('href'))).toEqual([
      '#sv-q-q_segment',
      '#sv-q-q_name',
      '#sv-q-q_satisfaction',
    ]);
  });

  it('raises a focus request for the question a link names, and prevents the fragment', async () => {
    const report = validatePage(first, 0, NO_ANSWERS, NO_ATTACHMENTS);
    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: report.errors,
      scope: 'page',
    });

    const second = harness.links()[1];
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    second.dispatchEvent(click);
    await harness.fixture.whenStable();

    expect(harness.session.focusRequest()?.questionId).toBe('q_name');
    // Without `preventDefault` the fragment would also be navigated to, adding a history
    // entry the respondent did not ask for.
    expect(click.defaultPrevented).toBe(true);
  });

  it('issues a new focus request each time the same link is activated (FR-030)', async () => {
    const report = validatePage(first, 0, NO_ANSWERS, NO_ATTACHMENTS);
    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: report.errors,
      scope: 'page',
    });

    harness.links()[0].click();
    await harness.fixture.whenStable();
    const firstToken = harness.session.focusRequest()?.token;

    harness.links()[0].click();
    await harness.fixture.whenStable();
    const secondToken = harness.session.focusRequest()?.token;

    // A repeat request has to be a *new* value or the focus effect would not re-fire.
    expect(firstToken).not.toBeUndefined();
    expect(secondToken).not.toBe(firstToken);
  });

  it('states "more than one page" when more than one page is invalid (FR-034)', async () => {
    const surveyReport = validateSurvey(subject, NO_ANSWERS, NO_ATTACHMENTS);
    expect(surveyReport.invalidPageIndexes).toHaveLength(2);

    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: surveyReport.pages[0].errors,
      scope: 'survey',
      surveyReport,
    });

    expect(harness.text()).toContain('There are answers to fix on more than one page.');
  });

  it('says nothing about other pages when only this page is invalid (FR-034)', async () => {
    const answered = new Map(NO_ANSWERS);
    const onlyFirstInvalid = survey([first, page('p2', 'Second', [textboxQuestion({ id: 'q3' })])]);
    const surveyReport = validateSurvey(onlyFirstInvalid, answered, NO_ATTACHMENTS);
    expect(surveyReport.invalidPageIndexes).toEqual([0]);

    const harness = await mountSummary({
      subject: onlyFirstInvalid,
      subjectPage: first,
      errors: surveyReport.pages[0].errors,
      scope: 'survey',
      surveyReport,
    });

    expect(harness.text()).not.toContain('more than one page');
    // The rows are still there — it is only the scope line that is withheld.
    expect(harness.links()).toHaveLength(3);
  });

  it('says nothing about other pages after a blocked Next, even when others are invalid', async () => {
    const surveyReport = validateSurvey(subject, NO_ANSWERS, NO_ATTACHMENTS);
    expect(surveyReport.invalidPageIndexes).toHaveLength(2);

    const harness = await mountSummary({
      subject,
      subjectPage: first,
      errors: surveyReport.pages[0].errors,
      // `scope: 'page'` is a blocked Next, which validated one page and so knows nothing
      // about any other. FR-034's line belongs to Submit alone.
      scope: 'page',
      surveyReport,
    });

    expect(harness.text()).not.toContain('more than one page');
  });

  it('renders an empty list rather than a stray region when the page is valid', async () => {
    const valid = page('p1', 'First', [textboxQuestion({ id: 'q_optional' })]);
    const report = validatePage(valid, 0, NO_ANSWERS, NO_ATTACHMENTS);
    expect(report.errors).toHaveLength(0);

    const harness = await mountSummary({
      subject: survey([valid]),
      subjectPage: valid,
      errors: report.errors,
      scope: 'page',
    });

    // The viewer only renders the summary in `validation-error`, so this is a guard
    // against the component inventing a row of its own rather than a visible state.
    expect(harness.links()).toHaveLength(0);
    expect(harness.rows()).toHaveLength(0);
  });
});
