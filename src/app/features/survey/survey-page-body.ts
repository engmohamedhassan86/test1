/**
 * One page of a survey — T097 and T113, FR-073, FR-029, FR-030.
 *
 * Order is fixed by FR-073: the survey's optional `description` **above** the current page
 * title, the page's optional `description` **below** it, and **nothing rendered in place of
 * either when absent** — no empty paragraph, no `&nbsp;`, no reserved line (US1 scenario
 * 7). The `@if` guards in the template are what make "no empty element left behind" true
 * rather than merely intended.
 *
 * ## The focus rule, both halves
 *
 * This component's host is the one element that contains both the page heading and every
 * question wrapper, so both halves of the focus move live here in a single effect:
 *
 * - `questionId: null` — a successful Next. Focus goes to the new page's heading (FR-029).
 * - `questionId` named — a blocked Next, a blocked Submit, or a summary link. Focus goes to
 *   the **first focusable control inside that question's wrapper** (FR-030).
 *
 * It is an `effect` rather than a call inside `next()` because neither target exists until
 * the new state has rendered. The `token` on `FocusRequest` is what makes a repeated
 * request for the same question a new value, so re-pressing Next on a still-invalid
 * question moves focus again instead of the effect seeing an unchanged signal.
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
import { QuestionHostComponent, questionWrapperId } from './questions/question-host';

@Component({
  selector: 'app-survey-page-body',
  imports: [QuestionHostComponent],
  templateUrl: './survey-page-body.html',
  styleUrl: './survey-page-body.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyPageBodyComponent {
  private readonly session = inject(SurveySessionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly heading = viewChild<ElementRef<HTMLElement>>('pageHeading');

  protected readonly survey = this.session.survey;
  protected readonly page = this.session.currentPage;

  constructor() {
    effect(() => {
      const request = this.session.focusRequest();
      if (request === null) {
        return;
      }
      if (request.questionId === null) {
        this.heading()?.nativeElement.focus();
        return;
      }
      focusFirstControlIn(this.host.nativeElement, questionWrapperId(request.questionId));
    });
  }
}

/**
 * FR-030's focus target. Focusing the first focusable descendant rather than the wrapper
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
