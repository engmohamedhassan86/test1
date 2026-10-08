import { Component, inject, signal, computed } from '@angular/core';
import { SurveySessionService } from '../core/services/survey-session.service';
import { SurveyQuestion } from '../core/models/survey.model';

@Component({
  selector: 'app-survey-page-body',
  standalone: true,
  templateUrl: './survey-page-body.html',
  styleUrls: ['./survey-page-body.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyPageBodyComponent {
  private readonly sessionService = inject(SurveySessionService);

  protected readonly survey = computed(() => this.sessionService.state().survey());
  protected readonly currentPage = computed(() => this.sessionService.state().currentPage());
}
