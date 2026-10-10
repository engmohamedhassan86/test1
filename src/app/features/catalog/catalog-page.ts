/**
 * The catalog screen — T080, FR-047, FR-048, FR-074.
 *
 * It renders `CatalogState` and nothing else. The four branches are the four states, and
 * the component decides none of them: `SurveyCatalogService` owns the fetch, the
 * validation and the `ready`/`empty` distinction.
 *
 * Two distinctions the screen must keep visible:
 *
 * - **`empty` is not an error** (FR-048). A manifest with `"surveys": []` is a plain
 *   statement, not the configuration-error screen.
 * - **a manifest that could not be read is the configuration-error screen** (FR-044), with
 *   every issue named — not an empty list and not a retry button.
 *
 * Each entry is a `routerLink`, so activating it is a real navigation to
 * `/surveys/<key>`: FR-049's "the catalog links to each survey" is the router's job, not a
 * click handler's.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnnouncerService } from '../../core/services/announcer.service';
import { DocumentTitleService } from '../../core/services/document-title.service';
import { SurveyCatalogService } from '../../core/services/survey-catalog.service';
import { emptyCatalogMessage, loadingAnnouncement } from '../../core/validators/messages';
import { ConfigurationErrorComponent } from '../../shared/configuration-error';

@Component({
  selector: 'app-catalog-page',
  imports: [RouterLink, ConfigurationErrorComponent],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPageComponent {
  private readonly catalog = inject(SurveyCatalogService);
  private readonly announcer = inject(AnnouncerService);
  private readonly documentTitle = inject(DocumentTitleService);

  protected readonly state = this.catalog.state;

  /** FR-048's wording lives in `core/validators/messages.ts`, not in the template. */
  protected readonly emptyMessage = emptyCatalogMessage();

  constructor() {
    this.documentTitle.apply({ screen: 'catalog' });

    // US4 scenario 10: the wait is announced politely while the fetch is in flight.
    if (this.state().kind === 'loading') {
      this.announcer.announcePolite(loadingAnnouncement());
    }

    // The promise is memoised in the service, so a second visit in the same page load
    // starts no second request (FR-067, US4 scenario 8).
    void this.catalog.load().then(() => this.announcer.clearPolite());
  }
}
