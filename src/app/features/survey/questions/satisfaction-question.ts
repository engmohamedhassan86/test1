/**
 * The `satisfaction` control — T096, FR-010, FR-060.
 *
 * **Exactly five** choices, with `SATISFACTION_LABELS` as **visible text** — not an icon
 * and not a colour alone — storing the integers 1 to 5. There is no sixth choice and no
 * zero (US2 scenario 11): the scale is fixed by FR-010 and is not configurable, which is
 * why `SatisfactionQuestion` carries no `scale` field at all and a `scale` on a
 * satisfaction question is configuration failure F05.
 *
 * The five points come from `SATISFACTION_POINTS` in `core/models`, so the count is not a
 * literal in this file either.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { SATISFACTION_LABELS, SATISFACTION_POINTS } from '../../../core/models/survey.model';
import type { SatisfactionPoint, SatisfactionQuestion } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';

/** One of the five fixed points, with its visible label. */
interface PointView {
  readonly point: SatisfactionPoint;
  readonly label: string;
}

@Component({
  selector: 'app-satisfaction-question',
  templateUrl: './satisfaction-question.html',
  styleUrl: './scale-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SatisfactionQuestionComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<SatisfactionQuestion>();
  readonly titleId = input.required<string>();
  readonly describedBy = input.required<string | null>();

  /** FR-054's marker, absent rather than `false` on a valid control — see FR-064. */
  protected readonly invalid = computed<true | null>(() =>
    this.session.errorFor(this.question().id) !== undefined ? true : null,
  );

  protected readonly locked = this.session.inputsLocked;

  protected readonly points: readonly PointView[] = SATISFACTION_POINTS.map((point) => ({
    point,
    label: SATISFACTION_LABELS[point],
  }));

  protected readonly selected = computed<number | null>(() => {
    const answer = this.session.answers().get(this.question().id);
    return answer !== undefined && answer.type === 'satisfaction' ? answer.value : null;
  });

  protected choose(point: SatisfactionPoint): void {
    this.session.setAnswer(this.question(), { kind: 'point', value: point });
  }

  protected clear(): void {
    this.session.clearAnswer(this.question().id);
  }
}
