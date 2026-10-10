/**
 * T073 — all five FR-077 titles reach `document.title`.
 */

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DocumentTitleService } from './document-title.service';

describe('DocumentTitleService', () => {
  let service: DocumentTitleService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [DocumentTitleService] });
    service = TestBed.inject(DocumentTitleService);
  });

  it('writes the catalog title', () => {
    service.apply({ screen: 'catalog' });
    expect(document.title).toBe('Surveys');
  });

  it('writes the survey title with the survey name interpolated', () => {
    service.apply({ screen: 'survey', surveyTitle: 'Customer Feedback' });
    expect(document.title).toBe('Customer Feedback — Survey');
  });

  it('writes a different title for the confirmation than for the survey', () => {
    service.apply({ screen: 'confirmation', surveyTitle: 'Customer Feedback' });
    expect(document.title).toBe('Customer Feedback — Response received');
  });

  it('writes the configuration-error title', () => {
    service.apply({ screen: 'configuration-error' });
    expect(document.title).toBe('Survey not available');
  });

  it('writes the not-found title, which is not the configuration-error one', () => {
    service.apply({ screen: 'not-found' });
    expect(document.title).toBe('Survey not found');
  });
});
