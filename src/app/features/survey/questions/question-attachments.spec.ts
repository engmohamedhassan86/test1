/**
 * T119 — US3 scenarios 1-3 and 7-10, through the rendered control.
 *
 * Driven by putting files on the real `<input type="file">` and firing `change`, so what is
 * proven is the whole path selection -> `session.addFiles` -> FR-023's checks in `core` ->
 * the rendered list, counter and rejections. A spec that called `session.addFiles` directly
 * would pass against a control whose `change` handler was never wired.
 *
 * Every rejection message is compared against the **catalogue function**, not against a
 * literal copied from `tasks.md`. Two literals that agree with the task and disagree with
 * each other is the failure mode a hand-copied string invites, and FR-069 puts the wording
 * in one place precisely so there is one copy of it.
 *
 * US3 scenarios 4-6 (mixed selections, the free-slot limit and duplicates) are
 * `question-attachments.mixed.spec.ts`; scenario 11 (survival across navigation) is
 * `question-attachments.survival.spec.ts`.
 */

import { describe, expect, it } from 'vitest';

import { formatFileSize } from '../../../core/models/display-format';
import {
  attachmentCounterMessage,
  attachmentRejectionMessage,
} from '../../../core/validators/messages';
import {
  attachmentPolicy,
  textareaQuestion,
  textboxQuestion,
} from '../../../core/models/__fixtures__/survey-builders';
import { fileOf, mountQuestion, selectFiles } from './__fixtures__/question-harness';
import type { QuestionHarness } from './__fixtures__/question-harness';

const POLICY = attachmentPolicy(); // 3 files, PNG/JPEG/PDF, 5 MB each
const ONE_MB = 1_048_576;

/** The question US3 exercises: page 3's optional `textarea` with an attachment block. */
function evidenceQuestion() {
  return textareaQuestion({
    id: 'q_evidence',
    title: 'Anything we should see?',
    maxLength: 1000,
    attachments: POLICY,
  });
}

// --- reading the rendered control -----------------------------------------------------

function fileInput(harness: QuestionHarness): HTMLInputElement {
  const input = harness.host.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) {
    throw new Error('expected a file control to be rendered');
  }
  return input;
}

function counter(harness: QuestionHarness): string {
  return harness.host.querySelector('.sv-files__counter')?.textContent?.trim() ?? '';
}

/** The listed files as `name` / `size` pairs, in rendered order. */
function listed(harness: QuestionHarness): readonly { name: string; size: string }[] {
  return [...harness.host.querySelectorAll<HTMLElement>('.sv-files__item')].map((item) => ({
    name: item.querySelector('.sv-files__name')?.textContent?.trim() ?? '',
    size: item.querySelector('.sv-files__size')?.textContent?.trim() ?? '',
  }));
}

function rejectionTexts(harness: QuestionHarness): readonly string[] {
  return [...harness.host.querySelectorAll<HTMLElement>('.sv-files__rejection')].map(
    (element) => element.textContent?.trim() ?? '',
  );
}

function removeButtons(harness: QuestionHarness): readonly HTMLButtonElement[] {
  return [...harness.host.querySelectorAll<HTMLButtonElement>('.sv-files__remove')];
}

async function attach(harness: QuestionHarness, files: readonly File[]): Promise<void> {
  selectFiles(fileInput(harness), files);
  await harness.settle();
}

describe('QuestionAttachmentsComponent', () => {
  describe('accepting a file (US3 scenario 1)', () => {
    it('lists a 1 MB receipt.pdf with its name and size, counts it, and shows no error', async () => {
      const harness = await mountQuestion(evidenceQuestion());

      expect(counter(harness)).toBe(attachmentCounterMessage(0, POLICY.maxFiles));

      await attach(harness, [fileOf('receipt.pdf', 'application/pdf', ONE_MB)]);

      expect(listed(harness)).toEqual([{ name: 'receipt.pdf', size: formatFileSize(ONE_MB) }]);
      expect(counter(harness)).toBe(attachmentCounterMessage(1, POLICY.maxFiles));
      expect(rejectionTexts(harness)).toEqual([]);
      // The size is `1 MB`, not `1048576 bytes` — FR-071 is about what the respondent reads.
      expect(listed(harness)[0].size).toBe('1 MB');
    });

    it('offers a Remove control naming the file, not a bare "Remove"', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      await attach(harness, [fileOf('receipt.pdf', 'application/pdf', ONE_MB)]);

      // Three identical "Remove" buttons are unusable from a screen reader's control list,
      // so the accessible name has to carry the file name.
      expect(removeButtons(harness)[0].getAttribute('aria-label')).toBe('Remove receipt.pdf');
    });

    it('renders the list from the session, not from the input element (FR-065)', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      await attach(harness, [fileOf('receipt.pdf', 'application/pdf', ONE_MB)]);

      // The control clears the input after reading it, so a list rendered from
      // `input.files` would now be empty. That it still lists the file is the proof that
      // the session is the source — which is what makes the file survive navigation.
      expect(fileInput(harness).value).toBe('');
      expect(listed(harness)).toHaveLength(1);
      expect(harness.session.attachmentsFor(evidenceQuestion().id)).toHaveLength(1);
    });
  });

  describe('rejecting a file by name and reason (US3 scenarios 2, 3, 7)', () => {
    it('rejects notes.txt for its type, naming the accepted types', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      await attach(harness, [fileOf('notes.txt', 'text/plain', 2_048)]);

      expect(rejectionTexts(harness)).toEqual([
        attachmentRejectionMessage('unaccepted-type', 'notes.txt', POLICY),
      ]);
      // The wording the catalogue produces, asserted once so the rest compare to it.
      expect(rejectionTexts(harness)[0]).toBe(
        'notes.txt: this file type is not accepted (allowed: PNG, JPEG, PDF)',
      );
      expect(listed(harness)).toEqual([]);
      expect(counter(harness)).toBe(attachmentCounterMessage(0, POLICY.maxFiles));
    });

    it('rejects a 6 MB scan.png for its size, naming the limit', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      await attach(harness, [fileOf('scan.png', 'image/png', 6_291_456)]);

      expect(rejectionTexts(harness)).toEqual([
        attachmentRejectionMessage('too-large', 'scan.png', POLICY),
      ]);
      expect(rejectionTexts(harness)[0]).toBe('scan.png: this file is larger than the 5 MB limit');
      expect(listed(harness)).toEqual([]);
    });

    it('rejects a 0-byte empty.png as empty, even though its type and size pass', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      await attach(harness, [fileOf('empty.png', 'image/png', 0)]);

      expect(rejectionTexts(harness)).toEqual([
        attachmentRejectionMessage('empty', 'empty.png', POLICY),
      ]);
      expect(rejectionTexts(harness)[0]).toBe('empty.png: this file is empty');
      expect(listed(harness)).toEqual([]);
    });

    it('announces a rejection assertively, since the respondent learns an action did not take', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      await attach(harness, [fileOf('notes.txt', 'text/plain', 2_048)]);

      const region = harness.host.querySelector('.sv-files__rejections');
      expect(region?.getAttribute('role')).toBe('alert');
      expect(region?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('removing a file (US3 scenario 8)', () => {
    it('drops the counter to 2 of 3, re-opens the control and announces the removal', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      await attach(harness, [
        fileOf('a.png', 'image/png', 1_000),
        fileOf('b.png', 'image/png', 2_000),
        fileOf('c.png', 'image/png', 3_000),
      ]);

      expect(counter(harness)).toBe(attachmentCounterMessage(3, POLICY.maxFiles));
      // At `maxFiles` the control is closed rather than removed: a vanishing control moves
      // every later tab stop and explains nothing to a keyboard user.
      expect(fileInput(harness).disabled).toBe(true);

      removeButtons(harness)[1].click();
      await harness.settle();

      expect(counter(harness)).toBe('2 of 3 files');
      expect(listed(harness).map((row) => row.name)).toEqual(['a.png', 'c.png']);
      expect(fileInput(harness).disabled).toBe(false);
      expect(harness.session.attachmentsFor(evidenceQuestion().id).map((a) => a.name)).toEqual([
        'a.png',
        'c.png',
      ]);
    });
  });

  describe('a question with no attachment policy (US3 scenario 10, FR-021)', () => {
    it('renders no file control at all when attachments is null', async () => {
      const harness = await mountQuestion(
        textareaQuestion({ id: 'q_comments', title: 'Anything else?', maxLength: 2000 }),
      );

      expect(harness.host.querySelector('input[type="file"]')).toBeNull();
      expect(harness.host.querySelector('.sv-files')).toBeNull();
      // Nothing stands in for the absent control either — no counter reading `0 of 0`.
      expect(harness.host.querySelector('.sv-files__counter')).toBeNull();
    });

    it('renders no file control on a non-text type without a policy either', async () => {
      const harness = await mountQuestion(
        textboxQuestion({ id: 'q_name', title: 'What should we call you?', maxLength: 80 }),
      );

      expect(harness.host.querySelector('input[type="file"]')).toBeNull();
    });
  });

  describe('zero files on an optional question (US3 scenario 9, FR-022)', () => {
    it('leaves an optional question with no files valid', async () => {
      const question = evidenceQuestion();
      const harness = await mountQuestion(question);

      // FR-022 makes zero attachments always valid, so nothing has to be attached for the
      // question to pass. Asserted through the session's own error map rather than through
      // Next, which this single-page harness does not offer.
      expect(harness.session.attachmentsFor(question.id)).toEqual([]);
      expect(harness.session.errorFor(question.id)).toBeUndefined();
    });
  });

  describe('FR-053: the file control names its own question', () => {
    it('gives the input an accessible name containing the question title', async () => {
      const harness = await mountQuestion(evidenceQuestion());

      // Not merely "a name is present" — axe can see that and cannot see a wrong one
      // (T129's third limit). The name has to say which question the file belongs to.
      const name = harness.accessibleName(fileInput(harness));
      expect(name).toContain('Anything we should see?');
      expect(name).toContain('Attach a file');
    });

    it('describes the input with the policy, so the rules are readable before a rejection', async () => {
      const harness = await mountQuestion(evidenceQuestion());
      const describedBy = fileInput(harness).getAttribute('aria-describedby');
      const hint = harness.host.querySelector(`#${describedBy}`)?.textContent ?? '';

      expect(hint).toContain('3 files');
      expect(hint).toContain('PNG, JPEG, PDF');
      expect(hint).toContain(formatFileSize(POLICY.maxSizeBytes));
    });
  });
});
