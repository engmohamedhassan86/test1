/**
 * The navigation shell — PRI-68.
 *
 * Wraps the existing survey-viewer markup with the topbar, the persistent desktop dock,
 * and the mobile drawer. It projects the wrapped content through `<ng-content>` rather
 * than owning it, so `survey-page.html`'s state switch moves one level deeper in the DOM
 * and nothing about which `ResponseState.kind` renders which branch changes.
 *
 * `drawerOpen` is this component's own signal, not a addition to `SurveySessionService`:
 * it is shell-local UI state (is the overlay showing), never survey-domain state, so it
 * has no business on the session's public API.
 */

import {
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { AnnouncerService } from '../../core/services/announcer.service';
import {
  navigationMenuClosedAnnouncement,
  navigationMenuOpenedAnnouncement,
} from '../../core/validators/messages';
import { SurveyDockComponent } from './survey-dock';
import { SurveyDrawerComponent } from './survey-drawer';
import { SurveyTopbarComponent } from './survey-topbar';

@Component({
  selector: 'app-survey-shell',
  imports: [SurveyDockComponent, SurveyDrawerComponent, SurveyTopbarComponent],
  templateUrl: './survey-shell.html',
  styleUrl: './survey-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyShellComponent {
  private readonly announcer = inject(AnnouncerService);

  private readonly topbar = viewChild(SurveyTopbarComponent);
  private readonly drawer = viewChild(SurveyDrawerComponent);

  protected readonly drawerOpen = signal(false);

  constructor() {
    // Runs after the drawer's `visibility` flips, which is what makes the close button a
    // legitimate focus target: focusing it one tick earlier, while still `hidden`, would
    // silently do nothing in most browsers.
    afterRenderEffect(() => {
      if (this.drawerOpen()) {
        this.drawer()?.focusClose();
      }
    });
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
    this.announcer.announcePolite(navigationMenuOpenedAnnouncement());
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.announcer.announcePolite(navigationMenuClosedAnnouncement());
    // The toggle stays visible and focusable throughout, so this needs no render wait.
    this.topbar()?.focusToggle();
  }
}
