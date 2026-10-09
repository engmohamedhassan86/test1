/**
 * The page position and the two navigation controls — T098.
 *
 * It reads four computed signals from `core` and decides none of them:
 *
 * - `positionLabel` — FR-032's "Page N of M", as text, not as a progress bar alone;
 * - `isFirstPage` — FR-031's disabled Previous;
 * - `primaryAction` — FR-033, so Submit appears **only** on the last page;
 * - `inputsLocked` — FR-039's busy Submit while a submission is in flight.
 *
 * Deciding any of those here would put "which page is last" in a component, which is
 * exactly what Principle II forbids.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { submitButtonLabel } from '../../core/validators/messages';
import { SurveySessionService } from '../../core/services/survey-session.service';

@Component({
  selector: 'app-survey-navigation',
  templateUrl: './survey-navigation.html',
  styleUrl: './survey-navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyNavigationComponent {
  private readonly session = inject(SurveySessionService);

  protected readonly positionLabel = this.session.positionLabel;
  protected readonly isFirstPage = this.session.isFirstPage;
  protected readonly primaryAction = this.session.primaryAction;
  protected readonly inputsLocked = this.session.inputsLocked;
  protected readonly submitLabel = computed(() => submitButtonLabel(this.inputsLocked()));

  protected previous(): void {
    this.session.previous();
  }

  protected next(): void {
    this.session.next();
  }

  protected submit(): void {
    void this.session.submit();
  }
}
