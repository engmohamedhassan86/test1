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

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { configurationErrorSubject } from '../core/validators/messages';
import type { SurveyConfigError } from '../core/models/survey-config-error.model';

@Component({
  selector: 'app-configuration-error',
  imports: [RouterLink],
  templateUrl: './configuration-error.html',
  styleUrl: './configuration-error.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationErrorComponent {
  readonly error = input.required<SurveyConfigError>();

  /** The scope's noun, from `messages.ts` — the template composes no wording. */
  protected readonly subject = computed(() => configurationErrorSubject(this.error().scope));
}
