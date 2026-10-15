/**
 * The mobile drawer — PRI-68.
 *
 * Always present in the DOM, never conditionally created: `visibility` plus `transform`
 * carry the open/closed state so the panel's own close button can be focused the instant
 * the drawer opens, without waiting on a fresh mount. Closed, `visibility: hidden` takes
 * the scrim and the panel out of both the tab order and the hit-test, which is what makes
 * "nothing reachable by mouse that is not reachable by keyboard" true for free rather than
 * by a separate `tabindex` dance.
 *
 * Renders the same `survey-dock` the desktop sidebar renders, so the step list the
 * respondent sees on mobile can never drift from the one they would have seen on desktop.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

import { SurveyDockComponent } from './survey-dock';

@Component({
  selector: 'app-survey-drawer',
  imports: [SurveyDockComponent],
  templateUrl: './survey-drawer.html',
  styleUrl: './survey-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyDrawerComponent {
  readonly open = input.required<boolean>();
  readonly closeDrawer = output<void>();

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  /** Focus target for `survey-shell` the moment this drawer finishes opening. */
  focusClose(): void {
    this.closeButton()?.nativeElement.focus();
  }
}
