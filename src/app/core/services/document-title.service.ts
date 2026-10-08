/**
 * The document title — T066, FR-077, `plan.md` §4.5.
 *
 * The five titles are produced by the pure `documentTitleFor`; this service is only the
 * one place that writes `document.title`, which is what keeps the formatting testable
 * without a DOM. `Title` from `@angular/platform-browser` is injected rather than touching
 * the global so the write is observable in a TestBed.
 *
 * The `lang="en"` half of FR-077 is satisfied by `src/index.html` and needs no code.
 */

import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { documentTitleFor } from '../models/screen-title';
import type { ScreenId } from '../models/screen-title';

@Injectable({ providedIn: 'root' })
export class DocumentTitleService {
  private readonly title = inject(Title);

  apply(screen: ScreenId): void {
    this.title.setTitle(documentTitleFor(screen));
  }
}
