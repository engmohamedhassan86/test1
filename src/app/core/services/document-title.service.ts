import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DocumentTitleService {
  setTitle(title: string): void {
    document.title = title;
  }
}
