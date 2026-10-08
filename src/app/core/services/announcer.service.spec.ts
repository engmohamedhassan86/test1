/**
 * T072 — the two signals are independent, and no message text is composed here.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { AnnouncerService } from './announcer.service';
import { loadingAnnouncement, submittingAnnouncement } from '../validators/messages';

describe('AnnouncerService', () => {
  let announcer: AnnouncerService;

  beforeEach(() => {
    announcer = new AnnouncerService();
  });

  it('starts with both regions empty, so nothing is announced on first render', () => {
    expect(announcer.polite()).toBeNull();
    expect(announcer.assertive()).toBeNull();
  });

  it('sets and clears each level independently', () => {
    announcer.announcePolite('loading');
    announcer.announceAssertive('blocked');

    expect(announcer.polite()).toBe('loading');
    expect(announcer.assertive()).toBe('blocked');

    announcer.clearPolite();

    // Clearing the polite region must not take the assertive message with it: a blocked
    // Next and a finished load can be in flight at the same time.
    expect(announcer.polite()).toBeNull();
    expect(announcer.assertive()).toBe('blocked');

    announcer.clearAssertive();
    expect(announcer.assertive()).toBeNull();
  });

  it('clears both when a screen is left', () => {
    announcer.announcePolite('loading');
    announcer.announceAssertive('blocked');

    announcer.clear();

    expect(announcer.polite()).toBeNull();
    expect(announcer.assertive()).toBeNull();
  });

  it('carries text produced in core, not composed at the call site', () => {
    // The service is a carrier. Both catalogues live in `core/validators/messages.ts`,
    // which is what keeps one wording per rule across every caller.
    announcer.announcePolite(loadingAnnouncement());
    expect(announcer.polite()).toBe('Loading');

    announcer.announcePolite(submittingAnnouncement());
    expect(announcer.polite()).toBe('Submitting your response');
  });

  it('touches no DOM', () => {
    announcer.announcePolite('loading');

    // An earlier implementation appended a live region to `document.body` on
    // construction. A region created with its text is unreliably announced, which is why
    // the regions are component markup in the shell instead.
    expect(document.body.querySelector('[aria-live]')).toBeNull();
  });
});
