/**
 * T110 — US1 scenario 4 and SC-005: the confirmation renders the reference and a way back,
 * and **no question control**.
 *
 * The "no control" assertion is the one with teeth. The screen is reached by a state
 * transition, so a template that left the survey body mounted underneath would still show
 * the right heading and the right reference while quietly keeping an editable form on the
 * page. Asserting the absence is the only way that shows up.
 *
 * FR-077's document title is asserted here rather than in the viewer's spec, because the
 * confirmation owns it: `survey-page.ts` deliberately skips the `submitted` state so this
 * component can set a different title.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import type { SubmissionReceipt } from '../../core/models/survey-response.model';
import { receipt } from './__fixtures__/survey-harness';
import { SubmissionConfirmationComponent } from './submission-confirmation';

async function mount(options: { title?: string; receipt?: SubmissionReceipt } = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SubmissionConfirmationComponent],
    providers: [provideRouter([])],
  });

  const fixture = TestBed.createComponent(SubmissionConfirmationComponent);
  fixture.componentRef.setInput('surveyTitle', options.title ?? 'Customer Feedback');
  fixture.componentRef.setInput('receipt', options.receipt ?? receipt());
  await fixture.whenStable();

  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, text: () => host.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('SubmissionConfirmationComponent', () => {
  it('names the survey it confirms', async () => {
    const harness = await mount({ title: 'Customer Feedback' });

    expect(harness.host.querySelector('h1')?.textContent?.trim()).toBe('Customer Feedback');
  });

  it('states that the response was received', async () => {
    const harness = await mount();

    expect(harness.host.querySelector('.sv-confirmation__received')?.textContent).toContain(
      'has been received',
    );
  });

  it("renders the submission id as the respondent's reference (US1 scenario 4)", async () => {
    const harness = await mount({ receipt: receipt({ submissionId: 'sub_7Q2X' }) });

    expect(harness.host.querySelector('.sv-confirmation__reference')?.textContent).toContain(
      'sub_7Q2X',
    );
  });

  it('renders the reference as selectable text, not an image', async () => {
    const harness = await mount({ receipt: receipt({ submissionId: 'sub_7Q2X' }) });

    // It is the respondent's only handle on the submission, so it has to be copyable.
    const code = harness.host.querySelector('.sv-confirmation__reference code');
    expect(code?.textContent?.trim()).toBe('sub_7Q2X');
    expect(harness.host.querySelectorAll('img')).toHaveLength(0);
  });

  it('offers a link back to the catalog', async () => {
    const harness = await mount();

    const link = harness.host.querySelector<HTMLAnchorElement>('a');
    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.textContent?.trim()).toBe('Back to all surveys');
  });

  it('renders no question control and no navigation (SC-005)', async () => {
    const harness = await mount();

    // A template that left the survey body mounted underneath would still look correct.
    expect(harness.host.querySelectorAll('input')).toHaveLength(0);
    expect(harness.host.querySelectorAll('textarea')).toHaveLength(0);
    expect(harness.host.querySelectorAll('button')).toHaveLength(0);
    expect(harness.host.querySelector('app-question-host')).toBeNull();
    expect(harness.host.querySelector('app-survey-navigation')).toBeNull();
  });

  it('sets the confirmation document title, which is not the survey title (FR-077)', async () => {
    await mount({ title: 'Customer Feedback' });

    expect(document.title).toContain('Response received');
  });

  it('re-titles when the survey title changes', async () => {
    const harness = await mount({ title: 'Customer Feedback' });

    harness.fixture.componentRef.setInput('surveyTitle', 'Product Pulse');
    await harness.fixture.whenStable();

    expect(document.title).toContain('Product Pulse');
    expect(document.title).toContain('Response received');
  });
});
