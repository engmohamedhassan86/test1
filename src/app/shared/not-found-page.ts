import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  template: `
    <div class="not-found">
      <h2>Survey not found</h2>
      <p>The survey with key "{{ requestedKey }}" does not exist.</p>
      <p><a href="/">Return to catalog</a></p>
    </div>
  `,
  styles: ['.not-found { padding: 2rem; text-align: center; margin-top: 3rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);

  protected readonly requestedKey = this.router.url.split('/')[2] || '';
}
