/**
 * The `rating` control — T095, FR-009, FR-060.
 *
 * Two presentations, and **the component picks neither**: `ratingPresentation(question)`
 * in `core/models` returns `'stars'` when every point is at least 1 and `'numbers'` when
 * the scale starts at 0, because zero stars cannot be told apart from no answer. The
 * template branches on that value and decides nothing.
 *
 * `scalePoints(question)` supplies the integers, so the template holds no arithmetic.
 *
 * The Clear action (FR-060) returns the question to **unanswered** — not to the scale's
 * minimum, which would be an answer. It is offered on a required rating too: clearing is
 * allowed, and the required rule then reports at Next, which is US1 scenario 6.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ratingPresentation, scalePoints } from '../../../core/models/survey.model';
import type { RatingQuestion } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';

@Component({
  selector: 'app-rating-question',
  templateUrl: './rating-question.html',
  styleUrl: './scale-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingQuestionComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<RatingQuestion>();
  readonly titleId = input.required<string>();
  readonly describedBy = input.required<string | null>();

  protected readonly invalid = computed(
    () => this.session.errorFor(this.question().id) !== undefined,
  );

  protected readonly locked = this.session.inputsLocked;

  /** FR-009's decision, read from `models` rather than made here. */
  protected readonly presentation = computed(() => ratingPresentation(this.question()));

  protected readonly points = computed(() => scalePoints(this.question()));

  protected readonly selected = computed<number | null>(() => {
    const answer = this.session.answers().get(this.question().id);
    return answer !== undefined && answer.type === 'rating' ? answer.value : null;
  });

  protected choose(point: number): void {
    this.session.setAnswer(this.question(), { kind: 'point', value: point });
  }

  protected clear(): void {
    this.session.clearAnswer(this.question().id);
  }
}
