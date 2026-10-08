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
 * The one piece of behaviour here is FR-030's focus move: a `focusRequest` naming a
 * question focuses the first focusable control inside that question's wrapper. It is an
 * `effect` because the control does not exist until the error state has rendered, and the
 * `token` on `FocusRequest` is what lets a second Next on the same question move focus
 * again.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
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
import { questionWrapperId } from './questions/question-host';
import { SubmissionConfirmationComponent } from './submission-confirmation';
import { SurveyNavigationComponent } from './survey-navigation';
import { SurveyPageBodyComponent } from './survey-page-body';

@Component({
  selector: 'app-survey-page',
  imports: [
    ConfigurationErrorComponent,
    NotFoundPageComponent,
    SubmissionConfirmationComponent,
    SurveyNavigationComponent,
    SurveyPageBodyComponent,
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Bound from the route by `withComponentInputBinding()`. */
  readonly surveyKey = input.required<string>();

  /**
   * FR-045: the not-found screen belongs to neither machine, so it is a signal here rather
   * than a ninth `ResponseState`.
   */
  private readonly notFoundKey = signal<string | null>(null);

  protected readonly notFound = this.notFoundKey.asReadonly();
  protected readonly state = this.session.state;
  protected readonly currentPageErrors = this.session.currentPageErrors;
  protected readonly multiplePagesInvalid = this.session.multiplePagesInvalid;

  protected readonly surveyTitle = computed(() => this.session.survey()?.title ?? '');

  constructor() {
    effect(() => {
      // Re-runs when the route key changes, which is what makes reopening a survey start
      // a fresh session at page 1 rather than resuming the previous one.
      void this.openSurvey(this.surveyKey());
    });

    effect(() => {
      const request = this.session.focusRequest();
      if (request === null || request.questionId === null) {
        return;
      }
      focusFirstControlIn(this.host.nativeElement, questionWrapperId(request.questionId));
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

  protected retry(): void {
    void this.session.retry();
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

/**
 * FR-030's focus move. Focusing the first focusable descendant rather than the wrapper
 * itself is what lets one rule serve all six types: a `role="radiogroup"` div is not
 * focusable, and giving every group a `tabindex` to make it so would put a non-control in
 * the tab order.
 */
function focusFirstControlIn(host: HTMLElement, wrapperId: string): void {
  const wrapper = host.querySelector(`#${wrapperId}`);
  const control = wrapper?.querySelector<HTMLElement>(
    'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]',
  );
  control?.focus();
}
