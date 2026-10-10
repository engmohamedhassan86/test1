/**
 * T121 — US3 scenarios 4-6 through the control, and SC-004.
 *
 * The three cases here share one property, which is the point of grouping them: a selection
 * can be **partly** accepted. A control that treated a selection as all-or-nothing would
 * pass every single-file case in `question-attachments.spec.ts` and fail all three of these.
 *
 * **SC-004 is asserted negatively in each one**: no rejected file is ever held. That is the
 * claim worth pinning, because the cheap wrong implementation — attach everything, then
 * report the problems — renders exactly the right error text while holding exactly the
 * wrong files. Each test therefore checks the rendered list and `session.attachmentsFor`,
 * not just the rejection text.
 */

import { describe, expect, it } from 'vitest';

import {
  attachmentPolicy,
  textareaQuestion,
} from '../../../core/models/__fixtures__/survey-builders';
import {
  attachmentCounterMessage,
  attachmentRejectionMessage,
} from '../../../core/validators/messages';
import { fileOf, mountQuestion, selectFiles } from './__fixtures__/question-harness';
import type { QuestionHarness } from './__fixtures__/question-harness';

const POLICY = attachmentPolicy(); // 3 files, PNG/JPEG/PDF, 5 MB each
const Q_ID = 'q_evidence';

function evidenceQuestion() {
  return textareaQuestion({
    id: Q_ID,
    title: 'Anything we should see?',
    maxLength: 1000,
    attachments: POLICY,
  });
}

function fileInput(harness: QuestionHarness): HTMLInputElement {
  const input = harness.host.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) {
    throw new Error('expected a file control to be rendered');
  }
  return input;
}

function listedNames(harness: QuestionHarness): readonly string[] {
  return [...harness.host.querySelectorAll<HTMLElement>('.sv-files__name')].map(
    (element) => element.textContent?.trim() ?? '',
  );
}

function heldNames(harness: QuestionHarness): readonly string[] {
  return harness.session.attachmentsFor(evidenceQuestion().id).map((a) => a.name);
}

function rejectionTexts(harness: QuestionHarness): readonly string[] {
  return [...harness.host.querySelectorAll<HTMLElement>('.sv-files__rejection')].map(
    (element) => element.textContent?.trim() ?? '',
  );
}

function counter(harness: QuestionHarness): string {
  return harness.host.querySelector('.sv-files__counter')?.textContent?.trim() ?? '';
}

async function attach(harness: QuestionHarness, files: readonly File[]): Promise<void> {
  selectFiles(fileInput(harness), files);
  await harness.settle();
}

describe('QuestionAttachmentsComponent — mixed selections (US3 scenarios 4-6, SC-004)', () => {
  it('attaches only the valid file from a three-file selection and names each rejection', async () => {
    const harness = await mountQuestion(evidenceQuestion());

    await attach(harness, [
      fileOf('a.png', 'image/png', 1_000),
      fileOf('b.txt', 'text/plain', 1_000),
      fileOf('c.png', 'image/png', 8_388_608), // 8 MB, over the 5 MB limit
    ]);

    expect(listedNames(harness)).toEqual(['a.png']);
    // SC-004: neither rejected file is held, not merely absent from the list.
    expect(heldNames(harness)).toEqual(['a.png']);
    expect(counter(harness)).toBe(attachmentCounterMessage(1, POLICY.maxFiles));

    // FR-024: one error per rejected file, each naming its own file and its own reason.
    // A single combined "some files were rejected" would leave the respondent guessing
    // which of the two to replace and how.
    expect(rejectionTexts(harness)).toEqual([
      attachmentRejectionMessage('unaccepted-type', 'b.txt', POLICY),
      attachmentRejectionMessage('too-large', 'c.png', POLICY),
    ]);
  });

  it('fills the last free slot in selection order and rejects the overflow (scenario 5)', async () => {
    const harness = await mountQuestion(evidenceQuestion());

    await attach(harness, [
      fileOf('one.png', 'image/png', 1_000),
      fileOf('two.png', 'image/png', 1_000),
    ]);
    expect(counter(harness)).toBe('2 of 3 files');

    // Two more valid files, one free slot. The first in selection order takes it.
    await attach(harness, [
      fileOf('three.png', 'image/png', 1_000),
      fileOf('four.png', 'image/png', 1_000),
    ]);

    expect(listedNames(harness)).toEqual(['one.png', 'two.png', 'three.png']);
    expect(heldNames(harness)).toEqual(['one.png', 'two.png', 'three.png']);
    expect(counter(harness)).toBe('3 of 3 files');

    // The free-slot message is about the question, so it names no file.
    expect(rejectionTexts(harness)).toEqual([
      attachmentRejectionMessage('no-free-slot', 'four.png', POLICY),
    ]);
    expect(rejectionTexts(harness)[0]).toBe('You can attach up to 3 files to this question');
  });

  it('rejects a same-name same-size file as already attached (scenario 6)', async () => {
    const harness = await mountQuestion(evidenceQuestion());

    await attach(harness, [fileOf('a.png', 'image/png', 1_000)]);
    await attach(harness, [fileOf('a.png', 'image/png', 1_000)]);

    // Not attached twice — the duplicate is rejected, and the first copy stays.
    expect(listedNames(harness)).toEqual(['a.png']);
    expect(heldNames(harness)).toEqual(['a.png']);
    expect(counter(harness)).toBe('1 of 3 files');

    expect(rejectionTexts(harness)).toEqual([
      attachmentRejectionMessage('duplicate', 'a.png', POLICY),
    ]);
    // A sentence, not the `FILENAME: reason` row the other five use.
    expect(rejectionTexts(harness)[0]).toBe('a.png is already attached');
  });

  it('keeps a same-name file of a different size, since only both together are a duplicate', async () => {
    const harness = await mountQuestion(evidenceQuestion());

    await attach(harness, [fileOf('a.png', 'image/png', 1_000)]);
    await attach(harness, [fileOf('a.png', 'image/png', 2_000)]);

    // The negative case for scenario 6. Without it, a control that rejected on name alone
    // would pass the test above and refuse a legitimately different file — two photos
    // exported under one camera's default name is the ordinary way this happens.
    expect(heldNames(harness)).toEqual(['a.png', 'a.png']);
    expect(counter(harness)).toBe('2 of 3 files');
    expect(rejectionTexts(harness)).toEqual([]);
  });

  it('clears the previous selection rejections when a later selection is clean', async () => {
    const harness = await mountQuestion(evidenceQuestion());

    await attach(harness, [fileOf('b.txt', 'text/plain', 1_000)]);
    expect(rejectionTexts(harness)).toHaveLength(1);

    await attach(harness, [fileOf('a.png', 'image/png', 1_000)]);

    // The rejections describe the last selection, not the session's whole history. A stale
    // error beside a file that did attach reads as though the attach had failed.
    expect(rejectionTexts(harness)).toEqual([]);
    expect(heldNames(harness)).toEqual(['a.png']);
  });

  it('holds nothing at all when every file in a selection is rejected', async () => {
    const harness = await mountQuestion(evidenceQuestion());

    await attach(harness, [fileOf('b.txt', 'text/plain', 1_000), fileOf('c.png', 'image/png', 0)]);

    expect(heldNames(harness)).toEqual([]);
    expect(listedNames(harness)).toEqual([]);
    expect(counter(harness)).toBe('0 of 3 files');
    expect(rejectionTexts(harness)).toEqual([
      attachmentRejectionMessage('unaccepted-type', 'b.txt', POLICY),
      attachmentRejectionMessage('empty', 'c.png', POLICY),
    ]);
    // The control stays open: nothing was accepted, so there are still three free slots.
    expect(fileInput(harness).disabled).toBe(false);
  });
});
