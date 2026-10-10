/**
 * The two live-region messages — T065, `plan.md` §4.5.
 *
 * Exactly two signals, each a message or `null`, rendered by the single
 * `<app-live-region />` in the shell. The service holds no DOM: the regions are component
 * markup so they exist from first render, which is what makes a *later* message announce
 * at all (a region inserted together with its text is often not read).
 *
 * Components never compose announcement text. FR-069 and
 * `contracts/response-submission.md` §4 fix the wording, and both catalogues live in
 * `core/validators/messages.ts`.
 */

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  private readonly politeMessage = signal<string | null>(null);
  private readonly assertiveMessage = signal<string | null>(null);

  /** Status, progress and confirmation — does not interrupt the screen reader. */
  readonly polite = this.politeMessage.asReadonly();

  /** Blocked navigation and blocked submission — interrupts, per FR-030. */
  readonly assertive = this.assertiveMessage.asReadonly();

  announcePolite(message: string): void {
    this.politeMessage.set(message);
  }

  announceAssertive(message: string): void {
    this.assertiveMessage.set(message);
  }

  clearPolite(): void {
    this.politeMessage.set(null);
  }

  clearAssertive(): void {
    this.assertiveMessage.set(null);
  }

  /** Called when a screen is left, so a stale message is not read on the next one. */
  clear(): void {
    this.politeMessage.set(null);
    this.assertiveMessage.set(null);
  }
}
