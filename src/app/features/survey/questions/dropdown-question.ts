import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

import type { OptionValue } from '../../../core/models/branded';
import type { DropdownQuestion } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';

@Component({
  selector: 'app-dropdown-question',
  templateUrl: './dropdown-question.html',
  styleUrl: './dropdown-question.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Select, FormsModule],
})
export class DropdownQuestionComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<DropdownQuestion>();
  readonly titleId = input.required<string>();
  readonly describedBy = input.required<string | null>();

  protected readonly invalid = computed<true | null>(() =>
    this.session.errorFor(this.question().id) !== undefined ? true : null,
  );

  protected readonly locked = this.session.inputsLocked;

  protected readonly selected = computed<OptionValue | null>(() => {
    const answer = this.session.answers().get(this.question().id);
    return answer !== undefined && answer.type === 'dropdown' ? answer.value : null;
  });

  protected choose(value: OptionValue): void {
    this.session.setAnswer(this.question(), { kind: 'option', value });
  }

  protected clear(): void {
    this.session.clearAnswer(this.question().id);
  }
}
