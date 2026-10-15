/**
 * PRI-68 R2 — the drawer is hidden by default, opens as an overlay with a scrim, closes
 * from the scrim, the explicit close button, or Escape, and exposes `focusClose()` for
 * `survey-shell`'s open-focus move. It renders the same `survey-dock` the desktop sidebar
 * does, so R1's step list is never a second, divergent copy.
 */

import { describe, expect, it } from 'vitest';

import { page, radioQuestion, survey } from '../../core/models/__fixtures__/survey-builders';
import { mountWithSession } from './__fixtures__/survey-harness';
import { SurveyDrawerComponent } from './survey-drawer';

function onePageSurvey() {
  return survey([page('p1', 'About You', [radioQuestion({ id: 'q1' })])]);
}

describe('SurveyDrawerComponent', () => {
  it('is hidden from the accessibility tree by default (R2)', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: false },
    });

    const root = harness.host.querySelector('.ds-drawer');
    expect(root?.classList.contains('ds-drawer--open')).toBe(false);
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('becomes visible once opened', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: true },
    });

    const root = harness.host.querySelector('.ds-drawer');
    expect(root?.classList.contains('ds-drawer--open')).toBe(true);
    expect(root?.getAttribute('aria-hidden')).toBe('false');
  });

  it('renders the dock step list inside the panel', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: true },
    });

    expect(harness.host.querySelector('.ds-drawer__panel app-survey-dock')).not.toBeNull();
    expect(harness.host.querySelector('.ds-dock__step-label')?.textContent?.trim()).toBe(
      'About You',
    );
  });

  it('has a real, labelled close button', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: true },
    });

    const close = harness.host.querySelector<HTMLButtonElement>('.ds-drawer__close');
    expect(close?.tagName).toBe('BUTTON');
    expect(close?.querySelector('.ds-visually-hidden')?.textContent?.trim()).toBe(
      'Close navigation menu',
    );
  });

  it('emits closeDrawer when the close button is activated', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: true },
    });
    let emitted = 0;
    (harness.fixture.componentInstance as SurveyDrawerComponent).closeDrawer.subscribe(() => {
      emitted += 1;
    });

    harness.host.querySelector<HTMLButtonElement>('.ds-drawer__close')?.click();

    expect(emitted).toBe(1);
  });

  it('emits closeDrawer when the scrim is activated', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: true },
    });
    let emitted = 0;
    (harness.fixture.componentInstance as SurveyDrawerComponent).closeDrawer.subscribe(() => {
      emitted += 1;
    });

    harness.host.querySelector<HTMLElement>('.ds-drawer__scrim')?.click();

    expect(emitted).toBe(1);
  });

  it('emits closeDrawer on Escape', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: true },
    });
    let emitted = 0;
    (harness.fixture.componentInstance as SurveyDrawerComponent).closeDrawer.subscribe(() => {
      emitted += 1;
    });

    harness.host
      .querySelector('.ds-drawer')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(emitted).toBe(1);
  });

  it('moves focus to the close button when asked, for the drawer-open focus move', async () => {
    const harness = await mountWithSession(SurveyDrawerComponent, onePageSurvey(), {
      inputs: { open: true },
    });
    document.body.appendChild(harness.host);

    (harness.fixture.componentInstance as SurveyDrawerComponent).focusClose();

    expect(document.activeElement).toBe(
      harness.host.querySelector<HTMLButtonElement>('.ds-drawer__close'),
    );
    harness.host.remove();
  });
});
