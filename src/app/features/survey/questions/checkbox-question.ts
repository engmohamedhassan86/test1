import { Component, inject, input, computed, output, signal } from '@angular/core';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

@Component({
  selector: 'app-checkbox-question',
  standalone: true,
  templateUrl: './checkbox-question.html',
  styleUrls: ['./checkbox-question.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxQuestionComponent {
  readonly question = input.required<SurveyQuestion>();
  readonly questionId = input.required<string>();
  readonly answer = input<readonly string[] | null>();

  private readonly sessionService = inject(SurveySessionService);

  protected readonly isDisabled = computed(() =>
    this.sessionService.state().isOptionSelectable(this.question(), this.answer()!),
  );

  protected readonly selectedValues = computed(() => this.answer()!);

  protected onOptionToggle(value: string): void {
    const current = this.selectedValues();
    const newValue = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.sessionService.setAnswer(this.questionId(), newValue);
  }
}
