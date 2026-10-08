import { Component, inject, input, computed, output, signal } from '@angular/core';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';
import { SurveyOption } from '../core/models/survey.model';

@Component({
  selector: 'app-radio-question',
  standalone: true,
  templateUrl: './radio-question.html',
  styleUrls: ['./radio-question.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioQuestionComponent {
  readonly question = input.required<SurveyQuestion>();
  readonly questionId = input.required<string>();
  readonly answer = input<string | null>();

  private readonly sessionService = inject(SurveySessionService);

  protected readonly isDisabled = computed(() =>
    this.sessionService.state().isOptionSelectable(this.question(), this.answer()!),
  );

  protected readonly selectedValue = computed(() => this.answer()!);

  protected onOptionSelect(value: string): void {
    if (value === this.answer()) {
      return;
    }
    this.sessionService.setAnswer(this.questionId(), value);
  }
}
