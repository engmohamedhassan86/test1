/**
 * PRI-68 — the shell's own responsibility: open/close wiring between the topbar and the
 * drawer, the two announcements, and the focus-return contract (R2: closing returns focus
 * to the toggle). Projected content is asserted separately, since `<ng-content>` itself
 * carries no logic to test.
 */

import { Component } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { page, radioQuestion, survey } from '../../core/models/__fixtures__/survey-builders';
import { AnnouncerService } from '../../core/services/announcer.service';
import { mountWithSession } from './__fixtures__/survey-harness';
import { SurveyShellComponent } from './survey-shell';

function onePageSurvey() {
  return survey([page('p1', 'About You', [radioQuestion({ id: 'q1' })])]);
}

@Component({
  selector: 'app-host',
  imports: [SurveyShellComponent],
  template: '<app-survey-shell><p class="host-marker">projected</p></app-survey-shell>',
})
class HostComponent {}

function toggle(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.ds-topbar__toggle');
}

function closeButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.ds-drawer__close');
}

describe('SurveyShellComponent', () => {
  it('projects the wrapped content unchanged', async () => {
    const harness = await mountWithSession(HostComponent, onePageSurvey());

    expect(harness.host.querySelector('.host-marker')?.textContent?.trim()).toBe('projected');
  });

  it('starts with the drawer closed', async () => {
    const harness = await mountWithSession(HostComponent, onePageSurvey());

    expect(harness.host.querySelector('.ds-drawer')?.classList.contains('ds-drawer--open')).toBe(
      false,
    );
  });

  it('opens the drawer when the topbar toggle fires, and moves focus to its close button', async () => {
    const harness = await mountWithSession(HostComponent, onePageSurvey());
    document.body.appendChild(harness.host);

    toggle(harness.host)?.click();
    await harness.settle();

    expect(harness.host.querySelector('.ds-drawer')?.classList.contains('ds-drawer--open')).toBe(
      true,
    );
    expect(document.activeElement).toBe(closeButton(harness.host));
    harness.host.remove();
  });

  it('closes the drawer from the close button, and returns focus to the toggle (R2)', async () => {
    const harness = await mountWithSession(HostComponent, onePageSurvey());
    document.body.appendChild(harness.host);

    toggle(harness.host)?.click();
    await harness.settle();
    closeButton(harness.host)?.click();
    await harness.settle();

    expect(harness.host.querySelector('.ds-drawer')?.classList.contains('ds-drawer--open')).toBe(
      false,
    );
    expect(document.activeElement).toBe(toggle(harness.host));
    harness.host.remove();
  });

  it('closes the drawer from the scrim too, and still returns focus to the toggle (R2)', async () => {
    const harness = await mountWithSession(HostComponent, onePageSurvey());
    document.body.appendChild(harness.host);

    toggle(harness.host)?.click();
    await harness.settle();
    harness.host.querySelector<HTMLElement>('.ds-drawer__scrim')?.click();
    await harness.settle();

    expect(harness.host.querySelector('.ds-drawer')?.classList.contains('ds-drawer--open')).toBe(
      false,
    );
    expect(document.activeElement).toBe(toggle(harness.host));
    harness.host.remove();
  });

  it('announces the drawer opening and closing politely', async () => {
    const harness = await mountWithSession(HostComponent, onePageSurvey());
    const announcer = harness.fixture.debugElement.injector.get(AnnouncerService);

    toggle(harness.host)?.click();
    await harness.settle();
    expect(announcer.polite()).toBe('Navigation menu opened');

    closeButton(harness.host)?.click();
    await harness.settle();
    expect(announcer.polite()).toBe('Navigation menu closed');
  });
});
