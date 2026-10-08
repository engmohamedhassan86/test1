import { Component } from '@angular/core';

import { LiveRegionComponent } from './shared/live-region';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LiveRegionComponent],
  template: `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <main id="main-content">
      <app-live-region></app-live-region>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [
    `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: white;
        padding: 8px;
        text-decoration: none;
        z-index: 1000;
      }

      .skip-link:focus {
        top: 6px;
      }

      main {
        padding: 20px;
      }
    `,
  ],
})
export class AppComponent {}
