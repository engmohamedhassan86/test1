/**
 * The `radio` control — T092, FR-006.
 *
 * A `role="radiogroup"` labelled by the question's title, one radio per option **in config
 * order** with the option's `label` as visible text and the option's `value` as what is
 * stored, holding at most one value.
 *
 * The "at least two options" rule needs no defence here: `AtLeastTwo<SurveyOption>` on
 * `RadioQuestion` makes a one-option radio unrepresentable (T006).
 *
 * It decides nothing. Selecting an option calls `setAnswer`, and whether that clears an
 * error, flips `dirty` or changes the response state is `SurveySessionService`'s business.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import type { OptionValue } from '../../../core/models/branded';
import type { RadioQuestion } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';

@Component({
  selector: 'app-radio-question',
  templateUrl: './radio-question.html',
  styleUrl: './choice-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioQuestionComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<RadioQuestion>();
  /** The id of the title element the host rendered — FR-053's grouped form. */
  readonly titleId = input.required<string>();
  readonly describedBy = input.required<string | null>();

  protected readonly invalid = computed(
    () => this.session.errorFor(this.question().id) !== undefined,
  );

  protected readonly locked = this.session.inputsLocked;

  protected readonly selected = computed<OptionValue | null>(() => {
    const answer = this.session.answers().get(this.question().id);
    return answer !== undefined && answer.type === 'radio' ? answer.value : null;
  });

  protected choose(value: OptionValue): void {
    this.session.setAnswer(this.question(), { kind: 'option', value });
  }
}
