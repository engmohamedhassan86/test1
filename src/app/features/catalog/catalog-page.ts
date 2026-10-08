import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SurveyCatalogService } from '../../core/services/survey-catalog.service';

import { SurveyManifestEntry } from '../../core/models/survey-manifest.model';

@Component({
  selector: 'app-catalog-page',
  imports: [],
  template: `
    @if (state() === 'loading') {
      <div role="status" aria-live="polite">Loading surveys...</div>
    } @else if (state() === 'ready') {
      <div class="catalog">
        @for (entry of state().entries?.surveys ?? []; track entry.key) {
          <a
            href="/surveys/{{ entry.key }}"
            class="catalog-link"
            (click)="$event.preventDefault(); navigate(entry.key)"
          >
            {{ entry.title }}
          </a>
        }
      </div>
    } @else if (state() === 'empty') {
      <div>No surveys are available.</div>
    } @else {
      <app-configuration-error scope="manifest" subject="surveys" />
    }
  `,
  styles: [
    '.catalog { display: flex; flex-direction: column; gap: 1rem; padding: 2rem; }',
    '.catalog-link { padding: 0.5rem; background: #f0f0f0; text-decoration: none; border-radius: 4px; }',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPageComponent {
  private readonly catalog = inject(SurveyCatalogService);

  readonly state = this.catalog.state;

  async navigate(key: string): Promise<void> {
    const resolution = await this.catalog.resolve(key);
    if (resolution !== 'found') {
      // Handle not-found case
      console.log('Survey not found:', key);
    }
  }
}
