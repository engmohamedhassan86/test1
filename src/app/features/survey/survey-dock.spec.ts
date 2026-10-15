/**
 * PRI-68 R1 — the dock renders every page's title and question count, and distinguishes
 * current/complete/upcoming without colour alone (each state carries its own marker glyph
 * and a visually-hidden status text, asserted below rather than assumed from a class name).
 */

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { page, radioQuestion, survey } from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { AttachmentCodecService } from '../../core/services/attachment-codec.service';
import { IdFactoryService } from '../../core/services/id-factory.service';
import { SurveyResponseGateway } from '../../core/services/survey-response.gateway';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { SURVEY_TIMEOUTS } from '../../core/services/survey-timeouts';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { mountWithSession } from './__fixtures__/survey-harness';
import { SurveyDockComponent } from './survey-dock';

function threePageSurvey() {
  return survey([
    page('p1', 'About You', [radioQuestion({ id: 'q1' }), radioQuestion({ id: 'q2' })]),
    page('p2', 'Your Order', [radioQuestion({ id: 'q3' })]),
    page('p3', 'Feedback', []),
  ]);
}

function steps(host: HTMLElement): HTMLLIElement[] {
  return [...host.querySelectorAll<HTMLLIElement>('.ds-dock__step')];
}

describe('SurveyDockComponent', () => {
  it('gives the dock an accessible name of its own', async () => {
    const harness = await mountWithSession(SurveyDockComponent, threePageSurvey());

    expect(harness.host.querySelector('nav')?.getAttribute('aria-label')).toBe('Survey progress');
  });

  it('renders every page title and question count (R1)', async () => {
    const harness = await mountWithSession(SurveyDockComponent, threePageSurvey());

    const labels = steps(harness.host).map((step) =>
      step.querySelector('.ds-dock__step-label')?.textContent?.trim(),
    );
    const meta = steps(harness.host).map((step) =>
      step.querySelector('.ds-dock__step-meta')?.textContent?.trim(),
    );

    expect(labels).toEqual(['About You', 'Your Order', 'Feedback']);
    expect(meta).toEqual(['2 questions', '1 question', '0 questions']);
  });

  it('marks the current step distinctly from the others, with a non-colour cue', async () => {
    const harness = await mountWithSession(SurveyDockComponent, threePageSurvey());

    const [first, second, third] = steps(harness.host);
    expect(first.classList.contains('ds-dock__step--current')).toBe(true);
    expect(first.getAttribute('aria-current')).toBe('step');
    expect(first.querySelector('.ds-visually-hidden')?.textContent?.trim()).toBe('Current step.');

    expect(second.classList.contains('ds-dock__step--upcoming')).toBe(true);
    expect(second.getAttribute('aria-current')).toBeNull();
    expect(second.querySelector('.ds-visually-hidden')?.textContent?.trim()).toBe(
      'Not yet reached.',
    );
    expect(third.classList.contains('ds-dock__step--upcoming')).toBe(true);
  });

  it('marks a passed step complete with a check glyph, not colour alone', async () => {
    const harness = await mountWithSession(SurveyDockComponent, threePageSurvey());

    harness.session.next();
    await harness.settle();

    const [first, second] = steps(harness.host);
    expect(first.classList.contains('ds-dock__step--complete')).toBe(true);
    expect(first.querySelector('.ds-dock__step-marker')?.textContent?.trim()).toBe('✓');
    expect(first.querySelector('.ds-visually-hidden')?.textContent?.trim()).toBe('Completed.');

    expect(second.classList.contains('ds-dock__step--current')).toBe(true);
    expect(second.querySelector('.ds-dock__step-marker')?.textContent?.trim()).toBe('2');
  });

  it('renders no step as a link or button — a progress display, not jump-nav', async () => {
    const harness = await mountWithSession(SurveyDockComponent, threePageSurvey());

    for (const step of steps(harness.host)) {
      expect(step.querySelector('a, button')).toBeNull();
    }
  });

  it('mounts the progress ring in a footer after the step list (PRI-71)', async () => {
    const harness = await mountWithSession(SurveyDockComponent, threePageSurvey());

    expect(harness.host.querySelector('.ds-dock__footer app-survey-progress-ring')).not.toBeNull();
  });

  it('renders no steps before a survey is open, rather than throwing', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SurveyDockComponent],
      providers: [
        SurveySessionService,
        AnnouncerService,
        AttachmentCodecService,
        IdFactoryService,
        { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
        { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
      ],
    });

    const fixture = TestBed.createComponent(SurveyDockComponent);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(steps(host)).toHaveLength(0);
    expect(host.querySelector('.ds-dock__footer')).toBeNull();
  });
});
