/**
 * T084 — the not-found screen, FR-050 and FR-051.
 *
 * One component reached two ways. An unknown `surveyKey` resolved against a manifest that
 * *was* readable names the key it could not find; the `'**'` route has no key to name and
 * renders the general wording instead. Both are the same screen, and both must offer the
 * way back — FR-051 is a link to the catalog, not a dead end.
 *
 * The title assertion is here rather than in `document-title.service.spec.ts` because the
 * service proves the *text*, and this proves the screen actually asks for it on construct.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { NotFoundPageComponent } from './not-found-page';

async function mount(surveyKey?: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [NotFoundPageComponent],
    providers: [provideRouter([])],
  });

  const fixture = TestBed.createComponent(NotFoundPageComponent);
  if (surveyKey !== undefined) {
    fixture.componentRef.setInput('surveyKey', surveyKey);
  }
  await fixture.whenStable();

  const host = fixture.nativeElement as HTMLElement;
  return { host, text: () => host.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('NotFoundPageComponent', () => {
  it('names the key it could not find when the viewer resolved one (FR-050)', async () => {
    const harness = await mount('no-such-survey');

    // Naming the key is what tells the respondent the link was wrong rather than the site
    // being broken — the distinction FR-050 exists to draw.
    expect(harness.host.querySelector('code')?.textContent).toBe('no-such-survey');
    expect(harness.text()).toContain('There is no survey with the key');
  });

  it('renders general wording when the catch-all route has no key to name', async () => {
    const harness = await mount();

    // The `'**'` route matches `/nonsense`, where there is no survey key at all. An empty
    // `<code>` element here would read as "there is no survey with the key ''".
    expect(harness.host.querySelector('code')).toBeNull();
    expect(harness.text()).toContain('That address does not match a survey in the catalog');
  });

  it('is announced as the not-found screen by its heading, in both forms', async () => {
    for (const key of ['no-such-survey', undefined]) {
      const harness = await mount(key);
      const headings = harness.host.querySelectorAll('h1');
      expect(headings).toHaveLength(1);
      expect(headings[0].textContent?.trim()).toBe('Survey not found');
    }
  });

  it('offers a real link back to the catalog (FR-051)', async () => {
    const harness = await mount('no-such-survey');

    // A real `href`, not a click handler: it has to work with the keyboard, in a new tab
    // and from the browser's own context menu.
    const back = harness.host.querySelector<HTMLAnchorElement>('a');
    expect(back?.getAttribute('href')).toBe('/');
    expect(back?.textContent?.trim()).toBe('Back to all surveys');
  });

  it('sets the document title on construct (FR-077)', async () => {
    await mount('no-such-survey');

    expect(document.title).toBe('Survey not found');
  });

  it('renders none of the survey, because this is not a viewer state (FR-045)', async () => {
    const harness = await mount('no-such-survey');

    // FR-045 puts this screen outside both machines. A stray navigation control or
    // question wrapper here would mean it had been built as a viewer state after all.
    expect(harness.host.querySelector('.sv-question')).toBeNull();
    expect(harness.host.querySelector('button')).toBeNull();
  });
});
