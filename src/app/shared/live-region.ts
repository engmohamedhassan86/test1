import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AnnouncerService } from '../services/announcer.service';

@Component({
  selector: 'app-live-region',
  template: `
    <div aria-live="polite" aria-atomic="true">{{ politeMessage() || '' }}</div>
    <div aria-live="assertive" aria-atomic="true">{{ assertiveMessage() || '' }}</div>
  `,
  styles: [
    ':host { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveRegionComponent {
  private readonly announcer = inject(AnnouncerService);

  readonly politeMessage = this.announcer.polite;
  readonly assertiveMessage = this.announcer.assertive;
}
