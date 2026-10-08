import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

import { SurveyConfigError } from '../core/models/survey-config-error.model';

@Component({
  selector: 'app-configuration-error',
  imports: [NgFor],
  template: `
    <div class="configuration-error">
      <h2>Error</h2>
      <div *ngFor="let issue of issues">
        <p>
          <strong>{{ issue.path }}:</strong> {{ issue.message }}
        </p>
      </div>
      <p>Business logic should be in the session service, not in this component.</p>
      <a href="/">Return to catalog</a>
    </div>
  `,
  styles: [
    '.configuration-error { padding: 2rem; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; margin: 2rem; }',
    'a { color: #f44336; text-decoration: none; font-weight: bold; }',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationErrorComponent {
  @Input({ required: true }) scope!: 'manifest' | 'survey';
  @Input({ required: true }) subject!: string;
  @Input({ required: true }) issues!: SurveyConfigError['issues'];
}
