import { Component, input, OnInit, signal, inject, computed } from '@angular/core';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

@Component({
  selector: 'app-satisfaction-question',
  standalone: true,
  templateUrl: './satisfaction-question.html',
  styleUrls: ['./satisfaction-question.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SatisfactionQuestionComponent {
  readonly question = input.required<SurveyQuestion>();
  readonly questionId = input.required<string>();
  readonly answer = input<string | null>();

  private readonly sessionService = inject(SurveySessionService);

  protected readonly satisfactionLabels = computed(() => this.question().satisfactionLabels);
  protected readonly satisfactionPoints = computed(() =>
    this.satisfactionLabels().map((label, index) => ({
      value: index + 1,
      label,
    })),
  );

  protected readonly currentValue = computed(() => this.answer()!);

  protected onValueChange(value: number): void {
    this.sessionService.setAnswer(this.questionId(), value);
  }
}
