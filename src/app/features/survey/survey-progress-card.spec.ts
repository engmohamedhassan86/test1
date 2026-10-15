/**
 * PRI-71 R3 — the progress card's pill, percent, bar fill and per-page answered count, all
 * read from `SurveySessionService` rather than decided here.
 */

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import {
  optionValue,
  page,
  radioQuestion,
  survey,
} from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AttachmentCodecService } from '../../core/services/attachment-codec.service';
import { IdFactoryService } from '../../core/services/id-factory.service';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from '../../core/services/survey-timeouts';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { mountWithSession } from './__fixtures__/survey-harness';
import { SurveyProgressCardComponent } from './survey-progress-card';

function threePageSurvey() {
  return survey([
    page('p1', 'About You', [radioQuestion({ id: 'q1' }), radioQuestion({ id: 'q2' })]),
    page('p2', 'Your Order', [radioQuestion({ id: 'q3' })]),
    page('p3', 'Feedback', []),
  ]);
}

describe('SurveyProgressCardComponent', () => {
  it('shows the page pill, the inclusive percent, and the answered count for page 1', async () => {
    const harness = await mountWithSession(SurveyProgressCardComponent, threePageSurvey());

    expect(harness.text()).toContain('PAGE 1 OF 3');
    expect(harness.text()).toContain('33% Completed');
    expect(harness.text()).toContain('0 of 2 answered');
  });

  it('sets --progress-fill-percent inline on .ds-progress__bar per the documented contract', async () => {
    const harness = await mountWithSession(SurveyProgressCardComponent, threePageSurvey());

    const bar = harness.host.querySelector<HTMLElement>('.ds-progress__bar');
    expect(bar?.style.getPropertyValue('--progress-fill-percent')).toBe('33');
  });

  it('advances the pill, percent and answered count after Next (PRI-71)', async () => {
    const subject = threePageSurvey();
    const harness = await mountWithSession(SurveyProgressCardComponent, subject);

    harness.session.setAnswer(subject.pages[0].questions[0], {
      kind: 'option',
      value: optionValue('a'),
    });
    harness.session.next();
    await harness.settle();

    expect(harness.text()).toContain('PAGE 2 OF 3');
    expect(harness.text()).toContain('67% Completed');
    expect(harness.text()).toContain('0 of 1 answered');
  });

  it('counts an answered question on the current page toward the answered total', async () => {
    const subject = threePageSurvey();
    const harness = await mountWithSession(SurveyProgressCardComponent, subject);

    harness.session.setAnswer(subject.pages[0].questions[0], {
      kind: 'option',
      value: optionValue('a'),
    });
    await harness.settle();

    expect(harness.text()).toContain('1 of 2 answered');
  });

  it('reads 100% Completed on the last page of a single-page survey', async () => {
    const onePage = survey([page('p1', 'Only', [radioQuestion({ id: 'q1' })])]);
    const harness = await mountWithSession(SurveyProgressCardComponent, onePage);

    expect(harness.text()).toContain('PAGE 1 OF 1');
    expect(harness.text()).toContain('100% Completed');
  });

  it('reads 0% rather than dividing by zero before a survey is open', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SurveyProgressCardComponent],
      providers: [
        SurveySessionService,
        AnnouncerService,
        AttachmentCodecService,
        IdFactoryService,
        { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
        { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
      ],
    });

    const fixture = TestBed.createComponent(SurveyProgressCardComponent);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('0% Completed');
    expect(host.textContent).toContain('PAGE 1 OF 0');
  });
});
