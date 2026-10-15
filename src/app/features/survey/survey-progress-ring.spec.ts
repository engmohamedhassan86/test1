/**
 * PRI-71 — the dock's ring gauge: an exclusive percent (pages completed *before* the
 * current one, unlike the progress card's inclusive formula — see `survey-progress-ring.ts`
 * for why), folded with the step count into one `role="img"` accessible label so the
 * numeral and the step count are not announced twice.
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
import { SurveyProgressRingComponent } from './survey-progress-ring';

function threePageSurvey() {
  return survey([
    page('p1', 'About You', [radioQuestion({ id: 'q1' })]),
    page('p2', 'Your Order', [radioQuestion({ id: 'q2' })]),
    page('p3', 'Feedback', []),
  ]);
}

describe('SurveyProgressRingComponent', () => {
  it('reads 0% on the first page, exclusive of the current page', async () => {
    const harness = await mountWithSession(SurveyProgressRingComponent, threePageSurvey());

    const ring = harness.host.querySelector('[role="img"]');
    expect(ring?.getAttribute('aria-label')).toBe('Survey progress: 0% complete, Step 1 of 3');
    expect(harness.host.querySelector('.ds-progress-ring__percent')?.textContent?.trim()).toBe(
      '0%',
    );
  });

  it('advances the exclusive percent after Next, independent of the card’s formula', async () => {
    const subject = threePageSurvey();
    const harness = await mountWithSession(SurveyProgressRingComponent, subject);

    harness.session.setAnswer(subject.pages[0].questions[0], {
      kind: 'option',
      value: optionValue('a'),
    });
    harness.session.next();
    await harness.settle();

    // currentPageIndex / pageCount = 1/3 ≈ 33%, not the card's inclusive 67%.
    const ring = harness.host.querySelector('[role="img"]');
    expect(ring?.getAttribute('aria-label')).toBe('Survey progress: 33% complete, Step 2 of 3');
  });

  it('hides the SVG and the duplicate text nodes from the accessibility tree', async () => {
    const harness = await mountWithSession(SurveyProgressRingComponent, threePageSurvey());

    expect(harness.host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(
      harness.host.querySelector('.ds-progress-ring__percent')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(harness.host.querySelector('.ds-progress-ring__step')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('draws a full, unfilled ring at 0%', async () => {
    const harness = await mountWithSession(SurveyProgressRingComponent, threePageSurvey());

    const fill = harness.host.querySelector<SVGCircleElement>('.ds-progress-ring__fill');
    expect(fill?.style.getPropertyValue('stroke-dashoffset')).toBe(
      fill?.style.getPropertyValue('stroke-dasharray'),
    );
  });

  it('reads 0% rather than dividing by zero before a survey is open', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SurveyProgressRingComponent],
      providers: [
        SurveySessionService,
        AnnouncerService,
        AttachmentCodecService,
        IdFactoryService,
        { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
        { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
      ],
    });

    const fixture = TestBed.createComponent(SurveyProgressRingComponent);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ring = host.querySelector('[role="img"]');
    expect(ring?.getAttribute('aria-label')).toBe('Survey progress: 0% complete, Step 1 of 0');
  });
});
