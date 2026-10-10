/**
 * The only source of randomness in the feature — T053, research D14.
 *
 * It is a service rather than a free function precisely so a test can stub it: the
 * `clientSubmissionId` is the `Idempotency-Key` (contract §4), and contract test 10 asserts
 * it is *identical* across a retry, which is only assertable against a known value.
 *
 * `crypto.randomUUID()` is used over `Math.random()` because the id crosses a network
 * boundary as an idempotency key and a collision would merge two respondents' responses.
 */

import { Injectable } from '@angular/core';

import { brand } from '../models/branded';
import type { AttachmentId, ClientSubmissionId } from '../models/branded';

@Injectable({ providedIn: 'root' })
export class IdFactoryService {
  /** Minted once per submission attempt sequence, re-used by every retry (FR-061). */
  newClientSubmissionId(): ClientSubmissionId {
    return brand<ClientSubmissionId>(crypto.randomUUID());
  }

  /** Minted when a file is accepted, so a removal can name one file unambiguously. */
  newAttachmentId(): AttachmentId {
    return brand<AttachmentId>(crypto.randomUUID());
  }
}
