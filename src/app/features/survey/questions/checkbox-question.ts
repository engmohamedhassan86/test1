/**
 * The `checkbox` control — T093, FR-007, FR-017.
 *
 * A labelled group, one checkbox per option in config order, holding a set of selected
 * values. Two things are deliberately **not** decided here:
 *
 * - **whether an option can still be selected.** `session.isOptionSelectable(question,
 *   value)` is a computed signal in `core`; the template binds its result and nothing
 *   more. That is what makes FR-017's "selectable again after a de-selection" (US2
 *   scenario 5) a property of the predicate rather than of a component flag.
 * - **the order the selection is stored in.** `setAnswer` normalises to the question's
 *   option order (`data-model.md` §6.1), so the payload's `value` array is in config order
 *   whatever order the respondent ticked in.
 *
 * The selectability signals are built once per question rather than called from the
 * template, because a call per change-detection pass would create a new `computed` each
 * time.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';

import type { OptionValue } from '../../../core/models/branded';
import type { CheckboxQuestion, SurveyOption } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';
import { selectionHintMessage } from '../../../core/validators/messages';

/** One option, with everything the template needs already derived. */
interface OptionView {
  readonly option: SurveyOption;
  readonly selected: Signal<boolean>;
  readonly selectable: Signal<boolean>;
}

@Component({
  selector: 'app-checkbox-question',
  templateUrl: './checkbox-question.html',
  styleUrl: './choice-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxQuestionComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<CheckboxQuestion>();
  readonly titleId = input.required<string>();
  readonly describedBy = input.required<string | null>();

  /** FR-054's marker, absent rather than `false` on a valid control — see FR-064. */
  protected readonly invalid = computed<true | null>(() =>
    this.session.errorFor(this.question().id) !== undefined ? true : null,
  );

  protected readonly locked = this.session.inputsLocked;

  /** US2 scenario 5's `Select up to N options`. The wording lives in `core`. */
  protected readonly hint = computed(() => selectionHintMessage(this.question()));

  protected readonly options = computed<readonly OptionView[]>(() =>
    this.question().options.map((option) => ({
      option,
      selected: computed(() => this.selectedValues().includes(option.value)),
      selectable: this.session.isOptionSelectable(this.question(), option.value),
    })),
  );

  private readonly selectedValues = computed<readonly OptionValue[]>(() => {
    const answer = this.session.answers().get(this.question().id);
    return answer !== undefined && answer.type === 'checkbox' ? answer.value : [];
  });

  /**
   * Reads the `checked` flag off the event target and forwards it. The narrowing is here
   * rather than `$any` in the template, so the compiler still checks this path; the
   * add-or-remove itself is `session.toggleOption`, because transforming the answer is
   * `core`'s and not this component's (plan §6.2).
   */
  protected toggle(value: OptionValue, event: Event): void {
    const target = event.target;
    const checked = target instanceof HTMLInputElement && target.checked;
    this.session.toggleOption(this.question(), value, checked);
  }
}
