import { Component, input, OnInit, signal, inject, computed } from '@angular/core';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

@Component({
  selector: 'app-rating-question',
  standalone: true,
  templateUrl: './rating-question.html',
  styleUrls: ['./rating-question.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingQuestionComponent {
  readonly question = input.required<SurveyQuestion>();
  readonly questionId = input.required<string>();
  readonly answer = input<string | null>();

  private readonly sessionService = inject(SurveySessionService);

  protected readonly scale = computed(() => this.question().scale || { min: 1, max: 5 });
  protected readonly stars = computed(() => {
    const scale = this.scale();
    return Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
  });

  protected readonly currentValue = computed(() => this.answer()!);

  protected getLabel(value: number): string {
    return `Rating: ${value}`;
  }

  protected onValueChange(value: number): void {
    this.sessionService.setAnswer(this.questionId(), value);
  }
}
