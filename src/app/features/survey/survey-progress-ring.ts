/**
 * The small ring gauge mounted in the dock's footer — PRI-71.
 *
 * Built from an SVG circle (`stroke-dasharray`/`stroke-dashoffset`), not from
 * `.ds-progress`: that class is a linear bar (`scaleX` on a rectangle), which cannot
 * express a ring without a second, unrelated set of rules — the task's instruction to
 * reuse `.ds-progress` applies to the progress **card** (`survey-progress-card.ts`) only.
 *
 * Percent = `currentPageIndex / pageCount`, i.e. pages completed **before** the current
 * one — exclusive, unlike the progress card's inclusive formula. Confirmed against the
 * reference screenshot (`theme-preview.png`): on "Step 1 of 3" (`currentPageIndex === 0`)
 * the dock ring reads "0%", which only the exclusive formula produces (the card's
 * inclusive formula would read 33% there, and visibly does not).
 *
 * The numeral and the step count are both real text nodes elsewhere in the template in
 * the shipped baseline's style (FR-032 precedent: state is text, not colour/shape alone).
 * Here they are declared `aria-hidden` and folded into one `role="img"` label instead,
 * because unlike the card's pill/percent/answered row — three independently meaningful
 * facts — the ring's numeral and step count are one fact told twice (graphically and as
 * text), and reading both separately would announce it twice.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { SurveySessionService } from '../../core/services/survey-session.service';
import { progressRingAccessibleLabel, progressRingStepLabel } from '../../core/validators/messages';

/** SVG user-space radius; the viewBox is a fixed 0-48 coordinate system, not a size. */
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

@Component({
  selector: 'app-survey-progress-ring',
  templateUrl: './survey-progress-ring.html',
  styleUrl: './survey-progress-ring.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyProgressRingComponent {
  private readonly session = inject(SurveySessionService);

  protected readonly radius = RING_RADIUS;
  protected readonly circumference = RING_CIRCUMFERENCE;

  protected readonly percent = computed(() => {
    const pageCount = this.session.pageCount();
    if (pageCount === 0) {
      return 0;
    }
    return Math.round((this.session.currentPageIndex() / pageCount) * 100);
  });

  protected readonly dashOffset = computed(
    () => RING_CIRCUMFERENCE - (this.percent() / 100) * RING_CIRCUMFERENCE,
  );

  protected readonly percentDisplay = computed(() => `${this.percent()}%`);

  protected readonly stepLabel = computed(() =>
    progressRingStepLabel(this.session.currentPageIndex(), this.session.pageCount()),
  );

  protected readonly accessibleLabel = computed(() =>
    progressRingAccessibleLabel(
      this.percent(),
      this.session.currentPageIndex(),
      this.session.pageCount(),
    ),
  );
}
