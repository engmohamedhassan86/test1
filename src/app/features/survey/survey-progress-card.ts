/**
 * The progress card above the question card — PRI-71 R3.
 *
 * It reuses `.ds-progress`/`.ds-progress__bar` as-is (`src/styles/components/progress.css`)
 * for the fill, and reads three already-public session signals (`currentPageIndex`,
 * `pageCount`, `currentPageAnswerSummary`) plus one derived percent. It decides none of
 * them beyond that arithmetic, matching the rest of this feature's "wording and derived
 * display values live outside the template" rule.
 *
 * Percent = `(currentPageIndex + 1) / pageCount`, rounded — i.e. how far through the
 * survey the respondent now stands, counting the page they are on. Confirmed against the
 * reference screenshot (`theme-preview.png`): "Page 1 of 3" (`currentPageIndex === 0`)
 * reads "33% Completed", which only this formula produces. The progress **ring** in the
 * dock uses a different, exclusive formula — see `survey-progress-ring.ts`.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { SurveySessionService } from '../../core/services/survey-session.service';
import {
  answeredCountLabel,
  pagePositionPillLabel,
  percentCompletedLabel,
} from '../../core/validators/messages';

@Component({
  selector: 'app-survey-progress-card',
  templateUrl: './survey-progress-card.html',
  styleUrl: './survey-progress-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyProgressCardComponent {
  private readonly session = inject(SurveySessionService);

  protected readonly percent = computed(() => {
    const pageCount = this.session.pageCount();
    if (pageCount === 0) {
      return 0;
    }
    return Math.round(((this.session.currentPageIndex() + 1) / pageCount) * 100);
  });

  protected readonly pillLabel = computed(() =>
    pagePositionPillLabel(this.session.currentPageIndex(), this.session.pageCount()),
  );

  protected readonly percentLabel = computed(() => percentCompletedLabel(this.percent()));

  protected readonly answeredLabel = computed(() => {
    const summary = this.session.currentPageAnswerSummary();
    return answeredCountLabel(summary.answered, summary.total);
  });
}
