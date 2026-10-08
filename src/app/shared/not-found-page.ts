/**
 * The not-found screen — T079, FR-050, FR-051.
 *
 * One component reached two ways, rendering one way: an unknown `surveyKey` resolved
 * against a manifest that *was* readable, and the `'**'` route. `surveyKey` is an input
 * with an empty default so the `'**'` route can render it with nothing to name.
 *
 * It is **not** a state of the viewer: FR-045 is explicit that the not-found screen
 * "belongs to neither machine", which is what `SurveyScreen` says in types.
 *
 * `catalog-error` must never arrive here. A manifest that could not be read cannot resolve
 * the key either way, so that case is the configuration-error screen (FR-066).
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocumentTitleService } from '../core/services/document-title.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="sv-not-found">
      <h1>Survey not found</h1>

      @if (surveyKey() !== '') {
        <p>
          There is no survey with the key <code>{{ surveyKey() }}</code> in the catalog.
        </p>
      } @else {
        <p>That address does not match a survey in the catalog.</p>
      }

      <p><a routerLink="/">Back to all surveys</a></p>
    </section>
  `,
  styleUrl: './not-found-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPageComponent {
  /** Empty when the `'**'` route rendered this, which has no key to name. */
  readonly surveyKey = input('');

  constructor() {
    inject(DocumentTitleService).apply({ screen: 'not-found' });
  }
}
