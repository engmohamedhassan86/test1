import { Component, input, signal } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-submission-confirmation',
  standalone: true,
  templateUrl: './submission-confirmation.html',
  styleUrls: ['./submission-confirmation.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionConfirmationComponent {
  readonly surveyTitle = input<string>();
  readonly submissionId = input<string>();

  protected readonly displayTitle = signal('');

  constructor() {
    this.displayTitle.set(this.surveyTitle() || '');
  }
}