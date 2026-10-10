/** T019 — FR-071's four bands and FR-072's label mapping. */

import { formatAcceptedTypes, formatFileSize } from './display-format';
import type { AcceptedFileType } from './survey.model';

describe('formatFileSize (FR-071)', () => {
  it.each([
    [800, '800 bytes'],
    [240_000, '234.4 KB'],
    [1_048_576, '1 MB'],
    [5_242_880, '5 MB'],
  ])('renders %i as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it('renders 0 bytes rather than a unit the respondent has to interpret', () => {
    expect(formatFileSize(0)).toBe('0 bytes');
  });

  it('switches to kilobytes at exactly 1024 and not before', () => {
    expect(formatFileSize(1023)).toBe('1023 bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('switches to megabytes at exactly 1048576 and not before', () => {
    expect(formatFileSize(1_048_575)).toBe('1024 KB');
    expect(formatFileSize(1_048_576)).toBe('1 MB');
  });

  it('drops a trailing .0 rather than showing 5.0 MB', () => {
    expect(formatFileSize(2 * 1_048_576)).toBe('2 MB');
    expect(formatFileSize(2048)).toBe('2 KB');
  });

  it('keeps one decimal place when there is one to keep', () => {
    expect(formatFileSize(6_291_456)).toBe('6 MB');
    expect(formatFileSize(1_572_864)).toBe('1.5 MB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('formatAcceptedTypes (FR-072)', () => {
  it('renders the default fixture policy as PNG, JPEG, PDF', () => {
    const types: readonly AcceptedFileType[] = ['image/png', 'image/jpeg', 'application/pdf'];
    expect(formatAcceptedTypes(types)).toBe('PNG, JPEG, PDF');
  });

  it('renders an extension entry without its dot', () => {
    expect(formatAcceptedTypes(['.pdf'])).toBe('PDF');
  });

  it('collapses duplicate labels reached by two different contract spellings', () => {
    // `application/pdf` and `.pdf` both render PDF; the respondent should see it once.
    expect(formatAcceptedTypes(['application/pdf', '.pdf'])).toBe('PDF');
  });

  it('keeps config order rather than sorting', () => {
    expect(formatAcceptedTypes(['application/pdf', 'image/png'])).toBe('PDF, PNG');
  });

  it('renders a single MIME entry as its subtype alone', () => {
    expect(formatAcceptedTypes(['image/png'])).toBe('PNG');
  });
});
