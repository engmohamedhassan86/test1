/**
 * One page of a survey — T097, FR-073, FR-029.
 *
 * Order is fixed by FR-073: the survey's optional `description` **above** the current page
 * title, the page's optional `description` **below** it, and **nothing rendered in place of
 * either when absent** — no empty paragraph, no `&nbsp;`, no reserved line (US1 scenario
 * 7). The `@if` guards in the template are what make "no empty element left behind" true
 * rather than merely intended.
 *
 * The one piece of behaviour it owns is the focus move: after a successful Next,
 * `focusRequest` carries `questionId: null`, which means the new page's heading (FR-029).
 * It is an `effect` rather than a call inside `next()` because the heading does not exist
 * until the new page has rendered. The `token` on `FocusRequest` is what makes a repeated
 * request a new value, so the effect fires again.
 */

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

import { SurveySessionService } from '../../core/services/survey-session.service';
import { QuestionHostComponent } from './questions/question-host';

@Component({
  selector: 'app-survey-page-body',
  imports: [QuestionHostComponent],
  templateUrl: './survey-page-body.html',
  styleUrl: './survey-page-body.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyPageBodyComponent {
  private readonly session = inject(SurveySessionService);

  private readonly heading = viewChild<ElementRef<HTMLElement>>('pageHeading');

  protected readonly survey = this.session.survey;
  protected readonly page = this.session.currentPage;

  constructor() {
    effect(() => {
      const request = this.session.focusRequest();
      // A request naming a question belongs to that question's control, not to the
      // heading; `survey-page.ts` owns that half.
      if (request === null || request.questionId !== null) {
        return;
      }
      this.heading()?.nativeElement.focus();
    });
  }
}
