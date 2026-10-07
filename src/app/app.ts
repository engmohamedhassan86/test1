import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

/** One row in the foundation readiness list rendered on the placeholder page. */
export interface FoundationCheck {
  readonly id: string;
  readonly label: string;
}

/**
 * Placeholder shell for the Dynamic Survey Viewer.
 *
 * This component exists to prove the foundation is wired: the PrimeNG maroon
 * preset, the design-token layer, PrimeFlex responsive layout, and keyboard
 * accessibility. Survey rendering arrives in a later feature and will live
 * behind the router outlet.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, CardModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('Dynamic Survey Viewer');

  protected readonly checks = signal<readonly FoundationCheck[]>([
    { id: 'standalone', label: 'Angular 22 standalone components with signals and OnPush' },
    { id: 'theme', label: 'PrimeNG maroon preset from @primeuix/themes' },
    { id: 'tokens', label: 'Design tokens in src/styles/tokens.css' },
    { id: 'layout', label: 'PrimeFlex responsive layout from 375px to 1280px' },
    { id: 'core', label: 'Business-logic boundary at src/app/core' },
  ]);

  /** Set once the user activates the theme probe button. */
  protected readonly themeConfirmed = signal(false);

  protected confirmTheme(): void {
    this.themeConfirmed.set(true);
  }
}
