/**
 * The sticky survey topbar — PRI-68.
 *
 * Always rendered, at every viewport: the breadcrumb and title orient every respondent,
 * and only the hamburger's visibility is viewport-gated (CSS-hidden at `64rem` and up,
 * where the dock is already persistent and there is nothing left for it to toggle).
 *
 * `drawerOpen` is an input rather than a direct read of a drawer signal, because this
 * component has no business knowing the drawer exists — `survey-shell` owns that state
 * and wires the two together.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { SurveySessionService } from '../../core/services/survey-session.service';
import { breadcrumbLabel, navigationToggleLabel } from '../../core/validators/messages';

@Component({
  selector: 'app-survey-topbar',
  templateUrl: './survey-topbar.html',
  styleUrl: './survey-topbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyTopbarComponent {
  private readonly session = inject(SurveySessionService);

  readonly drawerOpen = input.required<boolean>();
  readonly toggleDrawer = output<void>();

  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton');

  protected readonly surveyTitle = computed(() => this.session.survey()?.title ?? '');

  protected readonly breadcrumb = computed(() => {
    const page = this.session.currentPage();
    return page === null ? '' : breadcrumbLabel(this.session.currentPageIndex() + 1, page.title);
  });

  protected readonly toggleLabel = computed(() => navigationToggleLabel(this.drawerOpen()));

  /** Focus-return target for `survey-shell` once the drawer it opened has closed. */
  focusToggle(): void {
    this.toggleButton()?.nativeElement.focus();
  }
}
