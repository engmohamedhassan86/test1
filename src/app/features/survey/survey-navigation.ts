import { Component, input, signal, inject } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-survey-navigation',
  standalone: true,
  templateUrl: './survey-navigation.html',
  styleUrls: ['./survey-navigation.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyNavigationComponent {
  private readonly sessionService = inject(SurveySessionService);

  protected readonly state = this.sessionService.state;

  constructor() {
    // Add any initialization logic if needed
  }
}
