/**
 * T089 — FR-041's named issues, FR-042's "none of the survey", and both scopes.
 *
 * The assertion that earns its place is **every** issue being rendered, driven off the
 * fixture's own length rather than a hard-coded count. FR-041 says each issue is named with
 * its location and its offending value; a template that rendered only the first would read
 * perfectly in a one-issue fixture, which is exactly the fixture a spec reaches for first.
 *
 * Both scopes are exercised because the component serves both and the subject line is the
 * only thing that differs. A spec covering only `survey` would leave the manifest wording
 * — the half an author sees when the catalog itself is broken — unasserted.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import type { NonEmpty } from '../core/models/branded';
import type { ConfigIssue, SurveyConfigError } from '../core/models/survey-config-error.model';
import { MANIFEST_SUBJECT } from '../core/models/survey-config-error.model';
import { configError, configIssue } from '../features/survey/__fixtures__/survey-harness';
import { ConfigurationErrorComponent } from './configuration-error';

async function mount(error: SurveyConfigError) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ConfigurationErrorComponent],
    providers: [provideRouter([])],
  });

  const fixture = TestBed.createComponent(ConfigurationErrorComponent);
  fixture.componentRef.setInput('error', error);
  await fixture.whenStable();

  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, text: () => host.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('ConfigurationErrorComponent', () => {
  it('announces itself as an alert with a heading that names it', async () => {
    const harness = await mount(configError());

    const section = harness.host.querySelector('section');
    expect(section?.getAttribute('role')).toBe('alert');

    // The alert's accessible name comes from the heading it points at.
    const labelledBy = section?.getAttribute('aria-labelledby');
    expect(labelledBy).not.toBeNull();
    expect(harness.host.querySelector(`#${labelledBy}`)?.textContent?.trim()).toBe(
      'This survey is not available',
    );
  });

  it('names the survey as the subject when the scope is a survey', async () => {
    const harness = await mount(configError({ scope: 'survey', subject: 'customer-feedback' }));

    const subject = harness.host.querySelector('.sv-config-error__subject');
    expect(subject?.textContent).toContain('The survey');
    expect(subject?.querySelector('code')?.textContent?.trim()).toBe('customer-feedback');
  });

  it('names the catalog as the subject when the scope is the manifest', async () => {
    const harness = await mount(configError({ scope: 'manifest', subject: MANIFEST_SUBJECT }));

    const subject = harness.host.querySelector('.sv-config-error__subject');
    expect(subject?.textContent).toContain('The survey catalog');
    expect(subject?.querySelector('code')?.textContent?.trim()).toBe(MANIFEST_SUBJECT);
  });

  it('renders every issue, not just the first (FR-041)', async () => {
    const issues: NonEmpty<ConfigIssue> = [
      configIssue({ code: 'F02', path: 'pages[0].title', message: 'title is required.' }),
      configIssue({ code: 'F10', path: 'pages[0].questions[1].options', message: 'needs 2.' }),
      configIssue({ code: 'F14', path: 'pages[1].questions[0].scale', message: 'out of bounds.' }),
    ];
    const harness = await mount(configError({ issues }));

    // Driven off the fixture's length: a template rendering only the first would pass a
    // one-issue fixture and fail here.
    expect(harness.host.querySelectorAll('.sv-config-error__issues li')).toHaveLength(
      issues.length,
    );
    for (const issue of issues) {
      expect(harness.text()).toContain(issue.code);
      expect(harness.text()).toContain(issue.path);
      expect(harness.text()).toContain(issue.message);
    }
  });

  it('gives each issue its code, its location and its message (FR-041)', async () => {
    const harness = await mount(
      configError({
        issues: [
          configIssue({
            code: 'F06',
            path: 'pages[0].questions[0].required',
            message: 'required must be a boolean; found "yes".',
          }),
        ],
      }),
    );

    const item = harness.host.querySelector('.sv-config-error__issues li');
    expect(item?.querySelector('.sv-config-error__code')?.textContent?.trim()).toBe('F06');
    expect(item?.querySelector('.sv-config-error__path')?.textContent?.trim()).toBe(
      'pages[0].questions[0].required',
    );
    // The offending value travels in the message, which `core` composed.
    expect(item?.textContent).toContain('found "yes"');
  });

  it('omits the location element for a document-level issue rather than rendering it empty', async () => {
    const harness = await mount(
      configError({
        issues: [configIssue({ code: 'F01', path: '', message: 'The body is not valid JSON.' })],
      }),
    );

    // `path: ''` means the document as a whole; an empty `<code>` would render as a gap.
    expect(harness.host.querySelector('.sv-config-error__path')).toBeNull();
    expect(harness.text()).toContain('The body is not valid JSON.');
  });

  it('renders none of the survey (FR-042, Principle I)', async () => {
    const harness = await mount(configError());

    expect(harness.host.querySelectorAll('input')).toHaveLength(0);
    expect(harness.host.querySelectorAll('textarea')).toHaveLength(0);
    expect(harness.host.querySelectorAll('button')).toHaveLength(0);
    expect(harness.host.querySelector('app-question-host')).toBeNull();
    expect(harness.host.querySelector('app-survey-navigation')).toBeNull();
  });

  it('links back to the catalog, which is the only way out of a terminal state', async () => {
    const harness = await mount(configError());

    const link = harness.host.querySelector<HTMLAnchorElement>('a');
    // A `routerLink`, so the catalog is reachable without a reload (US5 scenario 6).
    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.textContent?.trim()).toBe('Back to all surveys');
  });
});
