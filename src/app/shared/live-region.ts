/**
 * The shell's two live regions — T076.
 *
 * Both regions are **present from first render** and only their text changes. A region
 * inserted into the DOM together with its message is frequently not announced at all, so
 * the empty regions are the point rather than an oversight.
 *
 * It contains no logic: the text comes from `AnnouncerService`, which `core` writes.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AnnouncerService } from '../core/services/announcer.service';

@Component({
  selector: 'app-live-region',
  template: `
    <div class="sv-visually-hidden" aria-live="polite" aria-atomic="true" data-testid="polite">
      {{ polite() }}
    </div>
    <div
      class="sv-visually-hidden"
      aria-live="assertive"
      aria-atomic="true"
      data-testid="assertive"
    >
      {{ assertive() }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveRegionComponent {
  private readonly announcer = inject(AnnouncerService);

  protected readonly polite = this.announcer.polite;
  protected readonly assertive = this.announcer.assertive;
}
