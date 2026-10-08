/**
 * Reading and encoding attachment bytes — T054, research D6 and D17.
 *
 * **Bytes are read at selection time, not at submit time.** A `File` handle can be
 * invalidated by the operating system between the two (the respondent moves or deletes the
 * file), and FR-065 requires the bytes to survive navigation — so the read happens once,
 * when the file is accepted, and the session holds the result.
 *
 * A read that fails *after* FR-023's five checks have passed is research D17's sixth
 * rejection class: `'unreadable'`. It is not an exception, because a file the browser
 * cannot read is a rejected file, not a program fault.
 */

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AttachmentCodecService {
  async read(file: File): Promise<Uint8Array | 'unreadable'> {
    try {
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      return 'unreadable';
    }
  }

  /**
   * Contract §2: `content` is base64 whose decoded length equals `sizeBytes`.
   *
   * Encoded in 8 KiB chunks because `String.fromCharCode(...bytes)` on a 5 MB file — the
   * contract's `maxSizeBytes` ceiling — exceeds the argument limit and throws.
   */
  toBase64(bytes: Uint8Array): string {
    const CHUNK = 8192;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
    }
    return btoa(binary);
  }
}
