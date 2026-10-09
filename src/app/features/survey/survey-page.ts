/**
 * The survey viewer — T086 and T100, FR-049, FR-045.
 *
 * It takes `surveyKey` as a **routed input** and drives the load itself: no resolver and no
 * guard (`plan.md` §2), because a resolver would have to decide between the not-found
 * screen and the configuration-error screen before either screen exists, and that decision
 * is FR-066's.
 *
 * The load is load → validate → render, in that order and with no partial render in
 * between:
 *
 * - `resolve` says `not-found` → the not-found screen, which is **not** a viewer state;
 * - `resolve` says `catalog-error` → `openFailed`, so the configuration-error screen
 *   renders and the key is never reported as unknown (FR-066);
 * - `load` says `invalid` → `openFailed` (Principle I: it fails closed);
 * - `load` says `valid` → `open`, and the viewer renders page 1.
 *
 * Because `loading` and `configuration-error` carry **no** `Survey`, a template branch for
 * either cannot read survey data — FR-040 and FR-042 are enforced by the compiler rather
 * than by review.
 *
 * FR-030's focus move is **not** here: it lives in `survey-page-body.ts`, which is the
 * component whose host actually contains the page heading and the question wrappers, so
 * both halves of the rule — the heading after a successful Next, the offending control
 * after a blocked one — are one effect in one file.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { AnnouncerService } from '../../core/services/announcer.service';
import { DocumentTitleService } from '../../core/services/document-title.service';
import { SurveyCatalogService } from '../../core/services/survey-catalog.service';
import { SurveyLoaderService } from '../../core/services/survey-loader.service';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { loadingAnnouncement } from '../../core/validators/messages';
import { ConfigurationErrorComponent } from '../../shared/configuration-error';
import { NotFoundPageComponent } from '../../shared/not-found-page';
import { SubmissionConfirmationComponent } from './submission-confirmation';
import { SubmissionErrorBannerComponent } from './submission-error-banner';
import { SurveyNavigationComponent } from './survey-navigation';
import { SurveyPageBodyComponent } from './survey-page-body';
import { ValidationSummaryComponent } from './validation-summary';

@Component({
  selector: 'app-survey-page',
  imports: [
    ConfigurationErrorComponent,
    NotFoundPageComponent,
    SubmissionConfirmationComponent,
    SubmissionErrorBannerComponent,
    SurveyNavigationComponent,
    SurveyPageBodyComponent,
    ValidationSummaryComponent,
  ],
  templateUrl: './survey-page.html',
  styleUrl: './survey-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyPageComponent {
  private readonly catalog = inject(SurveyCatalogService);
  private readonly loader = inject(SurveyLoaderService);
  private readonly session = inject(SurveySessionService);
  private readonly announcer = inject(AnnouncerService);
  private readonly documentTitle = inject(DocumentTitleService);

  /** Bound from the route by `withComponentInputBinding()`. */
  readonly surveyKey = input.required<string>();

  /**
   * FR-045: the not-found screen belongs to neither machine, so it is a signal here rather
   * than a ninth `ResponseState`.
   */
  private readonly notFoundKey = signal<string | null>(null);

  protected readonly notFound = this.notFoundKey.asReadonly();
  protected readonly state = this.session.state;

  /** Handed to the summary for the question titles its links carry (FR-054). */
  protected readonly currentPage = this.session.currentPage;

  /** The errors still standing, in page order. Live, so FR-020 reaches the summary. */
  protected readonly currentPageErrors = this.session.currentPageErrors;

  protected readonly surveyTitle = computed(() => this.session.survey()?.title ?? '');

  constructor() {
    effect(() => {
      // Re-runs when the route key changes, which is what makes reopening a survey start
      // a fresh session at page 1 rather than resuming the previous one.
      void this.openSurvey(this.surveyKey());
    });

    effect(() => {
      const state = this.state();
      if (state.kind === 'configuration-error') {
        this.documentTitle.apply({ screen: 'configuration-error' });
        return;
      }
      const survey = this.session.survey();
      if (survey !== null && state.kind !== 'submitted') {
        // The `submitted` title is the confirmation component's, per FR-077.
        this.documentTitle.apply({ screen: 'survey', surveyTitle: survey.title });
      }
    });
  }

  private async openSurvey(surveyKey: string): Promise<void> {
    this.notFoundKey.set(null);
    this.announcer.announcePolite(loadingAnnouncement());

    const resolution = await this.catalog.resolve(surveyKey);

    if (resolution.outcome === 'not-found') {
      this.announcer.clearPolite();
      this.notFoundKey.set(resolution.surveyKey);
      return;
    }

    if (resolution.outcome === 'catalog-error') {
      // FR-066: an unresolvable key is never reported as unknown.
      this.announcer.clearPolite();
      this.session.openFailed(resolution.error);
      return;
    }

    const validation = await this.loader.load(resolution.entry);
    this.announcer.clearPolite();

    if (validation.outcome === 'invalid') {
      this.session.openFailed(validation.error);
      return;
    }

    this.session.open(validation.survey);
  }
}
