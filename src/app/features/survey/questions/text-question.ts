import { Component, input, OnInit, signal, inject, computed } from '@angular/core';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

@Component({
  selector: 'app-text-question',
  standalone: true,
  templateUrl: './text-question.html',
  styleUrls: ['./text-question.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextQuestionComponent {
  readonly question = input.required<SurveyQuestion>();
  readonly questionId = input.required<string>();
  readonly answer = input<string | null>();

  private readonly sessionService = inject(SurveySessionService);

  protected readonly maxLength = computed(() => this.sessionService.maxLengthOf(this.question()));

  protected readonly currentValue = computed(() => this.answer()!);

  protected onValueChange(value: string): void {
    this.sessionService.setAnswer(this.questionId(), value);
  }
}
