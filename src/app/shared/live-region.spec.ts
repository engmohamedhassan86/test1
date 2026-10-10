/**
 * T085 — the shell's two live regions.
 *
 * The load-bearing assertion is the first one: **both regions exist and are empty from
 * first render**. A region inserted into the DOM together with its message is frequently
 * not announced at all, because assistive technology watches a region it already knows
 * about for changes. So "renders two empty divs" is the requirement, not a side effect of
 * having nothing to say yet — and a component that rendered a region only when it had a
 * message would pass every text assertion below while announcing nothing in a real
 * screen reader.
 *
 * The two are separate because politeness is not a property of the message: validation
 * failures interrupt (FR-030, assertive) and a load in progress does not (assertive would
 * talk over whatever the respondent was reading).
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AnnouncerService } from '../core/services/announcer.service';
import { LiveRegionComponent } from './live-region';

async function mount() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [LiveRegionComponent] });

  const fixture: ComponentFixture<LiveRegionComponent> =
    TestBed.createComponent(LiveRegionComponent);
  await fixture.whenStable();

  const host = fixture.nativeElement as HTMLElement;
  const region = (politeness: 'polite' | 'assertive') =>
    host.querySelector<HTMLElement>(`[data-testid="${politeness}"]`);

  return {
    fixture,
    host,
    region,
    announcer: TestBed.inject(AnnouncerService),
    settle: async () => {
      await fixture.whenStable();
    },
  };
}

describe('LiveRegionComponent', () => {
  it('renders both regions, empty, before anything is announced', async () => {
    const harness = await mount();

    // The whole point of the component. A region created alongside its text is routinely
    // not announced, so these two have to be in the DOM from first render with nothing in
    // them, waiting to change.
    expect(harness.region('polite')).not.toBeNull();
    expect(harness.region('assertive')).not.toBeNull();
    expect(harness.region('polite')?.textContent?.trim()).toBe('');
    expect(harness.region('assertive')?.textContent?.trim()).toBe('');
  });

  it('marks one region polite and the other assertive, both atomic', async () => {
    const harness = await mount();

    expect(harness.region('polite')?.getAttribute('aria-live')).toBe('polite');
    expect(harness.region('assertive')?.getAttribute('aria-live')).toBe('assertive');
    // `aria-atomic` so a changed message is read whole. Without it, a region that went
    // from "2 questions need an answer" to "1 question needs an answer" could be read as
    // just the changed word.
    expect(harness.region('polite')?.getAttribute('aria-atomic')).toBe('true');
    expect(harness.region('assertive')?.getAttribute('aria-atomic')).toBe('true');
  });

  it('keeps both regions off-screen rather than hidden', async () => {
    const harness = await mount();

    // `display: none` or `aria-hidden` would stop the announcement entirely, so these are
    // visually hidden by class instead.
    for (const politeness of ['polite', 'assertive'] as const) {
      expect(harness.region(politeness)?.classList.contains('sv-visually-hidden')).toBe(true);
      expect(harness.region(politeness)?.hasAttribute('aria-hidden')).toBe(false);
    }
  });

  it('shows a polite announcement in the polite region only', async () => {
    const harness = await mount();

    harness.announcer.announcePolite('Loading the survey');
    await harness.settle();

    expect(harness.region('polite')?.textContent?.trim()).toBe('Loading the survey');
    // Cross-posting would make every message interrupt, which is the thing politeness is
    // for avoiding.
    expect(harness.region('assertive')?.textContent?.trim()).toBe('');
  });

  it('shows an assertive announcement in the assertive region only (FR-030)', async () => {
    const harness = await mount();

    harness.announcer.announceAssertive('2 questions need an answer');
    await harness.settle();

    expect(harness.region('assertive')?.textContent?.trim()).toBe('2 questions need an answer');
    expect(harness.region('polite')?.textContent?.trim()).toBe('');
  });

  it('empties a region when its message is cleared, leaving the region in place', async () => {
    const harness = await mount();

    harness.announcer.announcePolite('Loading the survey');
    await harness.settle();
    harness.announcer.clearPolite();
    await harness.settle();

    expect(harness.region('polite')?.textContent?.trim()).toBe('');
    // Still there, or the next announcement is the un-announced first-render case again.
    expect(harness.region('polite')).not.toBeNull();
  });

  it('carries no text of its own — every word comes from core', async () => {
    const harness = await mount();

    // FR-069 keeps announcement wording in `core/validators/messages.ts`. A label or
    // heading added here would be user-facing text a component had composed.
    expect(harness.host.textContent?.trim()).toBe('');
  });
});
