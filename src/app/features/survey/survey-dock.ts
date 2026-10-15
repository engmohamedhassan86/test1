/**
 * The step-list progress display — PRI-68.
 *
 * It is a **progress display, not jump-nav**: `SurveySessionService` exposes `next()` and
 * `previous()` only, so a step here carries no click handler. Each step's state is derived
 * from `currentPageIndex` alone — no new session state, per the task's constraint not to
 * grow `SurveySessionService`'s public API.
 *
 * Rendered twice in the shell: once as the persistent desktop dock (CSS-hidden below the
 * `64rem` breakpoint) and once inside `survey-drawer`'s mobile overlay. Both are this same
 * component so the two can never drift out of sync with each other.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { SurveyPage } from '../../core/models/survey.model';
import { SurveySessionService } from '../../core/services/survey-session.service';
import { assertNever } from '../../core/models/assert-never';
import {
  dockStepStatusLabel,
  questionCountLabel,
  type DockStepState,
} from '../../core/validators/messages';
import { SurveyProgressRingComponent } from './survey-progress-ring';

interface DockStep {
  readonly page: SurveyPage;
  readonly index: number;
  readonly state: DockStepState;
}

function stepStateOf(index: number, currentIndex: number): DockStepState {
  if (index === currentIndex) {
    return 'current';
  }
  return index < currentIndex ? 'complete' : 'upcoming';
}

@Component({
  selector: 'app-survey-dock',
  imports: [SurveyProgressRingComponent],
  templateUrl: './survey-dock.html',
  styleUrl: './survey-dock.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyDockComponent {
  private readonly session = inject(SurveySessionService);

  protected readonly surveyTitle = computed(() => this.session.survey()?.title ?? '');

  protected readonly steps = computed<readonly DockStep[]>(() => {
    const survey = this.session.survey();
    if (survey === null) {
      return [];
    }
    const currentIndex = this.session.currentPageIndex();
    return survey.pages.map((page, index) => ({
      page,
      index,
      state: stepStateOf(index, currentIndex),
    }));
  });

  protected stepMarker(step: DockStep): string {
    return step.state === 'complete' ? '✓' : String(step.index + 1);
  }

  protected questionCountFor(step: DockStep): string {
    return questionCountLabel(step.page.questions.length);
  }

  protected stepStatus(step: DockStep): string {
    return dockStepStatusLabel(step.state);
  }

  protected stepStateClass(step: DockStep): string {
    switch (step.state) {
      case 'current':
        return 'ds-dock__step--current';
      case 'complete':
        return 'ds-dock__step--complete';
      case 'upcoming':
        return 'ds-dock__step--upcoming';
    }
    return assertNever(step.state);
  }
}
