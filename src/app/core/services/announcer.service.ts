import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  private liveRegion?: HTMLElement;

  constructor() {
    this.initLiveRegion();
  }

  private initLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    document.body.appendChild(this.liveRegion);
  }

  polite(message: string): void {
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.textContent = message;
    }
  }

  assertive(message: string): void {
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', 'assertive');
      this.liveRegion.textContent = message;
    }
  }
}
