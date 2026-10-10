/**
 * The page-level validation summary — T112, FR-030 and FR-034.
 *
 * It renders one assertive region listing every invalid question on the page being shown,
 * in page order, each entry a link to that question's own control. The per-question error
 * text under each control is `question-host`'s (FR-054); this is the second half of
 * FR-030, which asks for both.
 *
 * Three things it deliberately does **not** do:
 *
 * - **It composes no message text.** Each entry's text is the `ValidationError.message`
 *   the FR-069 catalogue produced, and the FR-034 line is `multiplePagesInvalidMessage()`
 *   from `core/validators/messages`. A literal sentence in this template would be a second
 *   copy of respondent-facing wording outside that catalogue.
 * - **It decides nothing about order.** The list it is handed is already in page order,
 *   because `validatePage` walks `page.questions`; re-sorting here would make "first in
 *   page order" a property of two places instead of one.
 * - **It decides nothing about "more than one page".** That is
 *   `hasMoreThanOneInvalidPage(report)` on the report, read only when `scope` is
 *   `'survey'` — a blocked Next validated one page and so can never assert anything about
 *   another one, which is why `scope` gates it rather than the report's contents alone.
 *
 * ## Why each entry is a link *and* a focus request
 *
 * The `href` makes it a real link: reachable by keyboard in the normal tab order, offered
 * by a screen reader's link list, and pointing at the question it names. Activating it
 * then goes through the session's `focusQuestion`, the same `FocusRequest` a blocked Next
 * raises, so focus lands on the first **control** inside the question rather than on the
 * wrapper the fragment names. That keeps one focus rule in one place
 * (`survey-page-body.ts`) instead of two implementations that could disagree.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import type { QuestionId } from '../../core/models/branded';
import type { SurveyPage } from '../../core/models/survey.model';
import type {
  SurveyValidationReport,
  ValidationError,
  ValidationScope,
} from '../../core/models/validation.model';
import { hasMoreThanOneInvalidPage } from '../../core/models/validation.model';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { multiplePagesInvalidMessage } from '../../core/validators/messages';
import { questionWrapperId } from './questions/question-host';

/** One row of the summary: which question, what is wrong, and where its control is. */
interface SummaryEntry {
  readonly questionId: QuestionId;
  /** FR-054's association: the message names no question, so the link does. */
  readonly questionTitle: string;
  readonly message: string;
  readonly target: string;
}

@Component({
  selector: 'app-validation-summary',
  templateUrl: './validation-summary.html',
  styleUrl: './validation-summary.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationSummaryComponent {
  private readonly session = inject(SurveySessionService);

  /** The page being shown. Read for question titles only — never for order. */
  readonly page = input.required<SurveyPage>();

  /**
   * The errors still standing, in page order — `SurveySessionService.currentPageErrors`.
   *
   * **Not** `PageValidationReport.errors`, which T112 named: that list is frozen at the
   * moment the validator ran, so a question whose answer has since been corrected would
   * stay in the summary after its error text had gone from under its control. US2
   * scenario 8 says "removed immediately", and the summary is error text too. The session
   * computes the live list by filtering the report's order through the live error map, so
   * page order still comes from the report rather than from this component.
   */
  readonly errors = input.required<readonly ValidationError[]>();

  /** `'page'` after a blocked Next, `'survey'` after a blocked Submit. */
  readonly scope = input.required<ValidationScope>();

  /** Present only when `scope` is `'survey'`. */
  readonly surveyReport = input<SurveyValidationReport | null>(null);

  protected readonly entries = computed<readonly SummaryEntry[]>(() => {
    const titles = new Map(this.page().questions.map((question) => [question.id, question.title]));
    return this.errors().map((error) => ({
      questionId: error.questionId,
      // A question carrying an error is a question on this page, so the lookup hits. The
      // fallback is the id rather than an empty string: a nameless link is worse than an
      // ugly one, and an empty entry would hide the row from a screen reader's link list.
      questionTitle: titles.get(error.questionId) ?? error.questionId,
      message: error.message,
      target: `#${questionWrapperId(error.questionId)}`,
    }));
  });

  /** FR-034's line, or `null` when this page is the only invalid one. */
  protected readonly multiplePagesMessage = computed<string | null>(() => {
    const report = this.surveyReport();
    if (this.scope() !== 'survey' || report === null || !hasMoreThanOneInvalidPage(report)) {
      return null;
    }
    return multiplePagesInvalidMessage();
  });

  /**
   * Hands the focus move back to the session so the single FR-030 rule applies. Default is
   * prevented because focusing the control scrolls it into view anyway, and letting the
   * fragment land would add a history entry the respondent did not ask for.
   */
  protected activate(event: Event, questionId: QuestionId): void {
    event.preventDefault();
    this.session.focusQuestion(questionId);
  }
}
