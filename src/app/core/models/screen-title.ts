/**
 * Document titles — FR-077. The `lang="en"` half of FR-077 is satisfied by
 * `src/index.html`, so no code is needed for it.
 */

import { assertNever } from './assert-never';

/**
 * The five screens FR-077 names a title for. `survey` and `confirmation` interpolate the
 * survey title, so they carry it; the other three do not.
 */
export type ScreenId =
  | { readonly screen: 'catalog' }
  | { readonly screen: 'survey'; readonly surveyTitle: string }
  | { readonly screen: 'confirmation'; readonly surveyTitle: string }
  | { readonly screen: 'configuration-error' }
  | { readonly screen: 'not-found' };

/** FR-077's five titles, exactly. */
export function documentTitleFor(screen: ScreenId): string {
  switch (screen.screen) {
    case 'catalog':
      return 'Surveys';
    case 'survey':
      return `${screen.surveyTitle} — Survey`;
    case 'confirmation':
      return `${screen.surveyTitle} — Response received`;
    case 'configuration-error':
      return 'Survey not available';
    case 'not-found':
      return 'Survey not found';
  }
  // No `default` branch: a sixth screen is a build failure here (plan §5.3).
  return assertNever(screen);
}
