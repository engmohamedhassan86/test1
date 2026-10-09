/**
 * The `textbox` and `textarea` controls — T094, FR-008, FR-015.
 *
 * One component serves both: FR-008's difference between them is one line versus many, not
 * two sets of rules, and the `TextQuestion` union is exactly those two members.
 *
 * **FR-053's single-control form applies here**: the input takes a plain programmatic label
 * — `aria-labelledby` pointing at the title the host rendered — and is **not** wrapped in a
 * `role="radiogroup"` or a `fieldset`. A single input is not a group, and claiming it is
 * would be invalid ARIA (`spec.md` §735, `plan.md` §588).
 *
 * `maxlength` is bound from `session.maxLengthOf(question)` so the browser refuses the
 * excess character, **and** `answer.validator.ts` checks the same `maxLength` again at Next
 * and at Submit. FR-015 requires both: a control constraint alone fails open, because a
 * paste, an autofill or a disabled script bypasses it.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import type { TextQuestion } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';

@Component({
  selector: 'app-text-question',
  templateUrl: './text-question.html',
  styleUrl: './text-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextQuestionComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<TextQuestion>();
  readonly titleId = input.required<string>();
  readonly describedBy = input.required<string | null>();

  /** FR-054's marker, absent rather than `false` on a valid control — see FR-064. */
  protected readonly invalid = computed<true | null>(() =>
    this.session.errorFor(this.question().id) !== undefined ? true : null,
  );

  protected readonly locked = this.session.inputsLocked;

  /** FR-015 at the control. The same ceiling is re-checked in `core` at Next and Submit. */
  protected readonly maxLength = computed(() => this.session.maxLengthOf(this.question()));

  protected readonly value = computed(() => {
    const answer = this.session.answers().get(this.question().id);
    return answer !== undefined && (answer.type === 'textbox' || answer.type === 'textarea')
      ? answer.value
      : '';
  });

  protected write(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }
    // The trim and the delete-when-empty both happen in `setAnswer`, not here.
    this.session.setAnswer(this.question(), { kind: 'text', value: target.value });
  }
}
