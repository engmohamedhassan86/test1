/**
 * PRI-68 — the topbar's breadcrumb/title, the hamburger's accessible name and
 * `aria-expanded`, and the `focusToggle()` seam `survey-shell` calls on drawer close.
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
import { SurveyTopbarComponent } from './survey-topbar';

function twoPageSurvey() {
  return survey([
    page('p1', 'About You', [radioQuestion({ id: 'q1' })]),
    page('p2', 'Delivery Details', [radioQuestion({ id: 'q2' })]),
  ]);
}

function toggle(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.ds-topbar__toggle');
}

describe('SurveyTopbarComponent', () => {
  it('shows the breadcrumb and the survey title', async () => {
    const harness = await mountWithSession(SurveyTopbarComponent, twoPageSurvey(), {
      inputs: { drawerOpen: false },
    });

    expect(harness.host.querySelector('.ds-topbar__breadcrumb')?.textContent?.trim()).toBe(
      'SURVEY / STEP 1 — About You',
    );
    expect(harness.host.querySelector('.ds-topbar__title')?.textContent?.trim()).toBe(
      twoPageSurvey().title,
    );
  });

  it('advances the breadcrumb as pages change', async () => {
    const harness = await mountWithSession(SurveyTopbarComponent, twoPageSurvey(), {
      inputs: { drawerOpen: false },
    });

    harness.session.next();
    await harness.settle();

    expect(harness.host.querySelector('.ds-topbar__breadcrumb')?.textContent?.trim()).toBe(
      'SURVEY / STEP 2 — Delivery Details',
    );
  });

  it('is a real, keyboard-reachable button that reports aria-expanded', async () => {
    const harness = await mountWithSession(SurveyTopbarComponent, twoPageSurvey(), {
      inputs: { drawerOpen: false },
    });

    const button = toggle(harness.host);
    expect(button?.tagName).toBe('BUTTON');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(harness.host.querySelector('.ds-visually-hidden')?.textContent?.trim()).toBe(
      'Open navigation menu',
    );
  });

  it('names the closing action once the drawer is open', async () => {
    const harness = await mountWithSession(SurveyTopbarComponent, twoPageSurvey(), {
      inputs: { drawerOpen: true },
    });

    expect(toggle(harness.host)?.getAttribute('aria-expanded')).toBe('true');
    expect(harness.host.querySelector('.ds-visually-hidden')?.textContent?.trim()).toBe(
      'Close navigation menu',
    );
  });

  it('emits toggleDrawer on click, deciding nothing about drawer state itself', async () => {
    const harness = await mountWithSession(SurveyTopbarComponent, twoPageSurvey(), {
      inputs: { drawerOpen: false },
    });
    let emitted = 0;
    (harness.fixture.componentInstance as SurveyTopbarComponent).toggleDrawer.subscribe(() => {
      emitted += 1;
    });

    toggle(harness.host)?.click();

    expect(emitted).toBe(1);
  });

  it('moves focus to the toggle button when asked, for the drawer close focus-return', async () => {
    const harness = await mountWithSession(SurveyTopbarComponent, twoPageSurvey(), {
      inputs: { drawerOpen: false },
    });
    document.body.appendChild(harness.host);

    (harness.fixture.componentInstance as SurveyTopbarComponent).focusToggle();

    expect(document.activeElement).toBe(toggle(harness.host));
    harness.host.remove();
  });

  it('shows an empty breadcrumb and title before a survey is open, rather than throwing', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SurveyTopbarComponent],
      providers: [
        SurveySessionService,
        AnnouncerService,
        AttachmentCodecService,
        IdFactoryService,
        { provide: SURVEY_TIMEOUTS, useValue: { fetchMs: 10_000, submitMs: 15_000 } },
        { provide: SurveyResponseGateway, useValue: new AcknowledgingSurveyResponseGateway() },
      ],
    });

    const fixture = TestBed.createComponent(SurveyTopbarComponent);
    fixture.componentRef.setInput('drawerOpen', false);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.ds-topbar__breadcrumb')?.textContent?.trim()).toBe('');
    expect(host.querySelector('.ds-topbar__title')?.textContent?.trim()).toBe('');
  });
});
