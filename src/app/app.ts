/**
 * The application shell — T077.
 *
 * Reduced to exactly three things: the skip link, the one `<app-live-region />`, and the
 * router outlet. The foundation's placeholder card is gone; its own comment said survey
 * rendering "would live behind the router outlet" (`plan.md` §2).
 *
 * The live region lives here rather than in each screen so that the regions survive a
 * route change — a region created at the same moment as its message is often not
 * announced, and every announcement in this feature crosses a navigation at some point.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LiveRegionComponent } from './shared/live-region';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LiveRegionComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
