/**
 * The `toggle_button` control — one on/off switch, FR-003, FR-053, FR-060.
 *
 * It is a single `button` with `role="switch"` and `aria-checked`, not a pair of radios
 * and not a checkbox: `switch` is the role whose two states a screen reader reads as
 * on/off, which is what the configured `onLabel`/`offLabel` say visually. A checkbox would
 * announce "not checked" for a deliberate off, and a radio pair would need an unanswered
 * third state this type does not have.
 *
 * ## Why there is no Clear answer button
 *
 * The other grouped controls offer one (FR-060) because they have an unanswered state to
 * return to. A switch does not — it always shows a position — so "clear" would mean
 * "return to `defaultValue`", which the respondent can already do by flipping it back.
 *
 * The rendered position comes from `toggleValue` in `core/models`, so the control, the
 * answer validator and the payload builder all read the same fallback rule rather than
 * three copies of `answer ?? defaultValue`.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { toggleLabel, toggleValue } from '../../../core/models/survey.model';
import type { ToggleButtonQuestion } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';

@Component({
  selector: 'app-toggle-button-question',
  templateUrl: './toggle-button-question.html',
  styleUrl: './toggle-button-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleButtonQuestionComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<ToggleButtonQuestion>();
  readonly titleId = input.required<string>();
  readonly describedBy = input.required<string | null>();

  /** FR-054's marker, absent rather than `false` on a valid control — see FR-064. */
  protected readonly invalid = computed<true | null>(() =>
    this.session.errorFor(this.question().id) !== undefined ? true : null,
  );

  protected readonly locked = this.session.inputsLocked;

  /** The position the switch shows: the stored answer, or `defaultValue` until there is one. */
  protected readonly checked = computed(() => {
    const question = this.question();
    const answer = this.session.answers().get(question.id);
    return toggleValue(question, answer?.type === 'toggle_button' ? answer.value : undefined);
  });

  /** The visible word on the control, which changes with the position. */
  protected readonly label = computed(() => toggleLabel(this.question(), this.checked()));

  protected flip(): void {
    this.session.setAnswer(this.question(), { kind: 'boolean', value: !this.checked() });
  }
}
