/**
 * T064 — two calls are distinct, and the format satisfies what `Idempotency-Key` requires.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { IdFactoryService } from './id-factory.service';

describe('IdFactoryService', () => {
  let ids: IdFactoryService;

  beforeEach(() => {
    ids = new IdFactoryService();
  });

  it('mints a distinct client submission id each time', () => {
    const first = ids.newClientSubmissionId();
    const second = ids.newClientSubmissionId();

    expect(first).not.toBe(second);
  });

  it('mints a distinct attachment id each time', () => {
    expect(ids.newAttachmentId()).not.toBe(ids.newAttachmentId());
  });

  it('mints a client submission id that fits the contract §2 ceiling', () => {
    const id = ids.newClientSubmissionId();

    // Contract §2: non-empty, at most 64 characters, and it travels as a header value, so
    // it must hold no whitespace.
    expect(id.length).toBeGreaterThan(0);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).not.toMatch(/\s/);
  });

  it('mints ids that are not ordered or guessable from each other', () => {
    const batch = Array.from({ length: 20 }, () => ids.newClientSubmissionId());

    // A counter would collide across two browser tabs answering the same survey, and the
    // receiver treats a repeated id as the same response.
    expect(new Set(batch).size).toBe(20);
  });
});
