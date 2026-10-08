/** T020 — all five FR-077 titles, including the two that interpolate the survey title. */

import { documentTitleFor } from './screen-title';
import type { ScreenId } from './screen-title';

describe('documentTitleFor (FR-077)', () => {
  it('titles the catalog Surveys', () => {
    expect(documentTitleFor({ screen: 'catalog' })).toBe('Surveys');
  });

  it('titles the survey viewer with the survey name', () => {
    expect(documentTitleFor({ screen: 'survey', surveyTitle: 'Customer Feedback' })).toBe(
      'Customer Feedback — Survey',
    );
  });

  it('titles the confirmation with the survey name', () => {
    expect(documentTitleFor({ screen: 'confirmation', surveyTitle: 'Customer Feedback' })).toBe(
      'Customer Feedback — Response received',
    );
  });

  it('titles the configuration-error screen Survey not available', () => {
    expect(documentTitleFor({ screen: 'configuration-error' })).toBe('Survey not available');
  });

  it('titles the not-found screen Survey not found', () => {
    expect(documentTitleFor({ screen: 'not-found' })).toBe('Survey not found');
  });

  it('interpolates whatever title the survey carries, so no title is hard-coded', () => {
    expect(documentTitleFor({ screen: 'survey', surveyTitle: 'Product Pulse' })).toBe(
      'Product Pulse — Survey',
    );
  });

  it('throws rather than inventing a title for an unknown screen', () => {
    // The `as` is the point: a sixth screen is a compile error at the switch, and this
    // asserts the runtime half — an unhandled discriminant fails closed, it does not
    // return a wrong title.
    const unknown = { screen: 'dashboard' } as unknown as ScreenId;
    expect(() => documentTitleFor(unknown)).toThrow(/Unhandled discriminant/);
  });
});
