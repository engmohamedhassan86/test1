import { Component, input, OnInit, signal, inject, computed } from '@angular/core';
import { SurveyQuestion } from '../core/models/survey.model';
import { RadioQuestionComponent } from './questions/radio-question';
import { CheckboxQuestionComponent } from './questions/checkbox-question';
import { TextQuestionComponent } from './questions/text-question';
import { RatingQuestionComponent } from './questions/rating-question';
import { SatisfactionQuestionComponent } from './questions/satisfaction-question';

@Component({
  selector: 'app-question-host',
  standalone: true,
  imports: [
    RadioQuestionComponent,
    CheckboxQuestionComponent,
    TextQuestionComponent,
    RatingQuestionComponent,
    SatisfactionQuestionComponent,
  ],
  templateUrl: './question-host.html',
  styleUrls: ['./question-host.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionHostComponent {
  readonly question = input.required<SurveyQuestion>();

  protected readonly questionId = computed(() => this.question().id);
  protected readonly answer = computed(() =>
    this.question().type === 'checkbox'
      ? ((this.sessionService.state().answers().get(this.question().id) as number[] | null) ?? null)
      : ((this.sessionService.state().answers().get(this.question().id) as
          number | string | null) ?? null),
  );

  private readonly sessionService = inject(SurveySessionService);

  protected readonly currentQuestionComponent = computed(() => {
    const type = this.question().type;
    switch (type) {
      case 'radio':
        return RadioQuestionComponent;
      case 'checkbox':
        return CheckboxQuestionComponent;
      case 'textbox':
      case 'textarea':
        return TextQuestionComponent;
      case 'rating':
        return RatingQuestionComponent;
      case 'satisfaction':
        return SatisfactionQuestionComponent;
      default:
        throw new Error(`Unknown question type: ${type}`);
    }
  });
}
