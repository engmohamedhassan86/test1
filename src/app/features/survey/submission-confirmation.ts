/**
 * The confirmation screen — T099, US1 scenario 4.
 *
 * It renders the `submitted` state **alone**: the survey title, the statement that the
 * response was received, the `submissionId` as the respondent's reference, and a link to
 * `/`. **No question control** appears, which is SC-005's half of this screen.
 *
 * It is reachable only through a receipt that satisfied `isSubmissionReceipt`, because
 * `submitted` has exactly one incoming edge, from `submitting`, and that edge is only taken
 * on an `acknowledged` result (SC-006).
 */

import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { SubmissionReceipt } from '../../core/models/survey-response.model';
import { DocumentTitleService } from '../../core/services/document-title.service';

@Component({
  selector: 'app-submission-confirmation',
  imports: [RouterLink],
  templateUrl: './submission-confirmation.html',
  styleUrl: './submission-confirmation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionConfirmationComponent {
  private readonly documentTitle = inject(DocumentTitleService);

  readonly surveyTitle = input.required<string>();
  readonly receipt = input.required<SubmissionReceipt>();

  constructor() {
    // FR-077: `<title> — Response received`, which is a different title from the survey's.
    effect(() => {
      this.documentTitle.apply({ screen: 'confirmation', surveyTitle: this.surveyTitle() });
    });
  }
}
