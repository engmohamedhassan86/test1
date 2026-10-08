/**
 * The configuration-error screen — T078, FR-041, FR-043, Principle I.
 *
 * It serves **both** scopes. A manifest failure and a survey failure read the same to an
 * author because both are "the JSON does not satisfy its contract"; only the subject
 * differs, and the subject is data.
 *
 * Two obligations it must not drift from:
 *
 * - **It renders none of the survey** — no question control, no page title, no Next. The
 *   `configuration-error` state carries no `Survey`, so this is enforced by the type as
 *   well as by this template (FR-040, FR-042).
 * - **Every issue is named, with its location and the offending value** (FR-041). The
 *   messages come from `core`; this component composes none of them.
 *
 * The link to `/` is a `routerLink`, so the catalog is reachable without a reload
 * (US5 scenario 6) — `configuration-error` is a terminal state, and a route change is the
 * only way out of it.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { SurveyConfigError } from '../core/models/survey-config-error.model';

@Component({
  selector: 'app-configuration-error',
  imports: [RouterLink],
  template: `
    <section class="sv-config-error" role="alert" aria-labelledby="sv-config-error-heading">
      <h1 id="sv-config-error-heading">This survey is not available</h1>

      <p class="sv-config-error__subject">
        {{ error().scope === 'manifest' ? 'The survey catalog' : 'The survey' }}
        <code>{{ error().subject }}</code>
        could not be used because its configuration does not satisfy its contract.
      </p>

      <ul class="sv-config-error__issues">
        @for (issue of error().issues; track $index) {
          <li>
            <span class="sv-config-error__code">{{ issue.code }}</span>
            @if (issue.path !== '') {
              <code class="sv-config-error__path">{{ issue.path }}</code>
            }
            <span>{{ issue.message }}</span>
          </li>
        }
      </ul>

      <p><a routerLink="/">Back to all surveys</a></p>
    </section>
  `,
  styleUrl: './configuration-error.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationErrorComponent {
  readonly error = input.required<SurveyConfigError>();
}
