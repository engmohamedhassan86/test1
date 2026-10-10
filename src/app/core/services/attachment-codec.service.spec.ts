/**
 * T060 — contract test 3's round trip, and research D17's unreadable file.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachmentCodecService } from './attachment-codec.service';

/*
 * `Uint8Array<ArrayBuffer>`, not the default `Uint8Array<ArrayBufferLike>`: `BlobPart`
 * admits an `ArrayBufferView<ArrayBuffer>`, and `ArrayBufferLike` also covers
 * `SharedArrayBuffer`, which a Blob cannot take. Narrowing the parameter is what makes
 * this type-check — a cast on the argument would have hidden the same distinction.
 */
function fileOf(bytes: Uint8Array<ArrayBuffer>, name = 'receipt.pdf'): File {
  return new File([bytes], name, { type: 'application/pdf' });
}

describe('AttachmentCodecService', () => {
  let codec: AttachmentCodecService;

  beforeEach(() => {
    codec = new AttachmentCodecService();
  });

  it('reads a file into its bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3, 250]);

    const read = await codec.read(fileOf(bytes));

    expect(read).toEqual(bytes);
  });

  it('round trips bytes through base64 with the decoded length equal to sizeBytes', async () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255, 42]);

    const encoded = codec.toBase64(bytes);
    const decoded = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));

    // Contract §2: `content` decoded must match `sizeBytes` exactly, or the receiver
    // cannot tell a truncated upload from a complete one.
    expect(decoded).toEqual(bytes);
    expect(decoded.length).toBe(bytes.length);
  });

  it('encodes a payload larger than one chunk without throwing', () => {
    // `String.fromCharCode(...bytes)` on a file this size exceeds the argument limit,
    // which is why the encoder works in 8 KiB chunks.
    const bytes = new Uint8Array(50_000).fill(7);

    const encoded = codec.toBase64(bytes);

    expect(atob(encoded).length).toBe(50_000);
  });

  it('encodes an empty byte array to an empty string', () => {
    expect(codec.toBase64(new Uint8Array())).toBe('');
  });

  it("yields 'unreadable' when the browser cannot read the file (research D17)", async () => {
    const file = fileOf(new Uint8Array([1]));
    // The operating system invalidated the handle between selection and read — which is
    // a rejected file, not a program fault.
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new DOMException('NotReadableError'));

    expect(await codec.read(file)).toBe('unreadable');
  });
});
