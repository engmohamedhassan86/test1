/**
 * T137 — the shell is exactly three things: the skip link, the one live region, and the
 * router outlet.
 *
 * The skip-link assertion deliberately compares the href to the landmark's **own** id
 * rather than to a second hard-coded string. Two literals can agree with the spec and
 * still disagree with each other, which is the only way this control actually breaks: a
 * skip link pointing at an id that no longer exists still renders, still looks right, and
 * silently does nothing for a keyboard user.
 *
 * The live region is asserted to be here, in the shell, rather than in each screen. A
 * region created in the same turn as its message is often not announced, and every
 * announcement in this feature crosses a navigation at some point (`plan.md` §2).
 */

import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  it('renders a skip link whose target is the main landmark', () => {
    const skipLink = host().querySelector<HTMLAnchorElement>('a.sv-skip-link');
    const main = host().querySelector('main');

    expect(skipLink).not.toBeNull();
    expect(main).not.toBeNull();

    // The href and the landmark id must agree, not merely both exist.
    const target = skipLink?.getAttribute('href');
    expect(target).toBe(`#${main?.id}`);
    expect(main?.id).not.toBe('');
  });

  it('gives the skip link visible text, since it is the first thing a keyboard user meets', () => {
    expect(host().querySelector('a.sv-skip-link')?.textContent?.trim()).not.toBe('');
  });

  it('makes the main landmark programmatically focusable so the skip link can land on it', () => {
    // Without tabindex the anchor moves the viewport but not focus in several browsers,
    // so the next Tab resumes from the link rather than from the content.
    expect(host().querySelector('main')?.getAttribute('tabindex')).toBe('-1');
  });

  it('hosts exactly one live region, in the shell rather than per screen', () => {
    expect(host().querySelectorAll('app-live-region')).toHaveLength(1);
  });

  it('renders the router outlet, and holds no survey markup of its own', () => {
    expect(host().querySelector('router-outlet')).not.toBeNull();

    // T077 reduced the shell; the foundation's placeholder card must not come back.
    expect(host().querySelector('main')?.querySelector('h1')).toBeNull();
  });
});
