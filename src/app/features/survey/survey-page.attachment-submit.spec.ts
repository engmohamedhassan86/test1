/**
 * T122 — FR-027's re-check at submit, and the research D16 payload case.
 *
 * Two independent things that both live at the submit boundary.
 *
 * ## FR-027: a file that passed at selection and no longer passes
 *
 * The selection-time checks in `addFiles` fail **open** on their own: they decide once,
 * against the policy in force at that moment, and nothing re-asks. FR-027 closes that by
 * re-checking everything the session holds against each question's *current* policy inside
 * `validatePage`, which `validateSurvey` runs over every page before a submission starts.
 *
 * Reaching that branch needs the two policies to differ, so these tests attach through a
 * question object carrying a **looser** policy than the one the opened survey holds for the
 * same question id. The attachment map is keyed by question id, so the file lands under
 * `q_evidence` having passed the loose rules, and the re-check then reads the strict rules
 * off the survey. That is the unit-level shape of a config whose `attachments` block got
 * tightened or removed — the comment in `attachmentErrorsFor` names both routes — and it is
 * the only way to drive the branch without a second config fetch mid-session.
 *
 * ## Research D16: a file with no text is not an empty answer
 *
 * `q_evidence` is an optional `textarea` with an attachment block, so "no text, one file"
 * is an ordinary thing for a respondent to do. The tempting payload rule — drop an answer
 * whose text is empty — would silently drop the attachment with it, and the respondent was
 * told the file was accepted. The entry therefore carries `""` **and** the attachment. This
 * is the test `plan.md` §10 item 1 is resolved by.
 */

import { describe, expect, it } from 'vitest';

import type { Question, Survey } from '../../core/models/survey.model';
import {
  attachmentPolicy,
  option,
  page,
  radioQuestion,
  survey,
  textareaQuestion,
} from '../../core/models/__fixtures__/survey-builders';
import { attachmentRejectionMessage } from '../../core/validators/messages';
import { AcknowledgingSurveyResponseGateway } from '../../core/services/testing/failing-survey-response.gateway';
import { manifestEntry, mountViewer } from './__fixtures__/survey-harness';
import type { ViewerHarness } from './__fixtures__/survey-harness';
import { questionWrapperId } from './questions/question-host';
import { SurveyPageComponent } from './survey-page';

/** 500 KB — what the opened survey allows. */
const STRICT = attachmentPolicy({ maxSizeBytes: 500_000 });
/** 5 MB — what the file was accepted under. */
const LOOSE = attachmentPolicy({ maxSizeBytes: 5_242_880 });

const BIG = { name: 'receipt.pdf', mimeType: 'application/pdf', size: 1_048_576 } as const;
const SMALL = { name: 'photo.png', mimeType: 'image/png', size: 2_048 } as const;

type Harness = ViewerHarness<SurveyPageComponent>;

/** Two pages: the evidence question, then a required radio so Submit is reachable. */
function subjectWith(policy: ReturnType<typeof attachmentPolicy>): Survey {
  return survey([
    page('supporting-files', 'Supporting Files', [
      textareaQuestion({
        id: 'q_evidence',
        title: 'Anything we should see?',
        maxLength: 1000,
        attachments: policy,
      }),
    ]),
    page('final-thoughts', 'Final Thoughts', [
      radioQuestion({
        id: 'q_recommend',
        title: 'Would you recommend us?',
        required: true,
        options: [option('rec-yes', 'Yes', 'yes'), option('rec-no', 'No', 'no')],
      }),
    ]),
  ]);
}

/** The same question id as the survey's, but with the looser policy. */
function looseEvidence(): Question {
  return textareaQuestion({
    id: 'q_evidence',
    title: 'Anything we should see?',
    maxLength: 1000,
    attachments: LOOSE,
  });
}

function fileOf(name: string, mimeType: string, sizeBytes: number): File {
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(sizeBytes).fill(7);
  return new File([bytes], name, { type: mimeType });
}

async function openViewer(
  subject: Survey,
  gateway: AcknowledgingSurveyResponseGateway,
): Promise<Harness> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: subject },
    gateway,
  });
}

async function clickNth(harness: Harness, selector: string, index: number): Promise<void> {
  const targets = [...harness.host.querySelectorAll<HTMLElement>(selector)];
  const target = targets[index];
  if (target === undefined) {
    throw new Error(
      `expected at least ${index + 1} elements matching ${selector}, found ${targets.length}`,
    );
  }
  target.click();
  await harness.settle();
}

/** Next on pages before the last, Submit on the last — the same primary control. */
const next = (harness: Harness): Promise<void> => clickNth(harness, '.sv-nav__button--primary', 0);

/**
 * Advances off page 1, answers page 2, attaches `files` to page 1's question, then Submits.
 *
 * The order matters and is the point of the helper. `validatePage` performs the FR-027
 * re-check, so it runs at **Next as well as at Submit** — attaching a file that fails the
 * strict policy while still on page 1 blocks Next and the submit path is never reached.
 * Attaching once the respondent has moved on is what leaves an invalid attachment sitting
 * on an earlier page at Submit time, which is the state US6 scenario 7 describes and the
 * only one in which `validateSurvey`'s re-check is the thing doing the blocking.
 */
async function moveOnThenAttachAndSubmit(harness: Harness, files: readonly File[]): Promise<void> {
  await next(harness); // page 1 -> page 2, with no files held yet, so the page is valid
  await clickNth(harness, 'input[type="radio"]', 0);
  await harness.session.addFiles(looseEvidence(), files);
  await harness.settle();
  await next(harness); // Submit
  await harness.settle();
}

function position(harness: Harness): string {
  return harness.host.querySelector('.sv-nav__position')?.textContent?.trim() ?? '';
}

function errorFor(harness: Harness, questionId: string): string | null {
  const error = harness.host.querySelector(`#sv-q-${questionId}-error`);
  return error === null ? null : (error.textContent?.trim() ?? '');
}

function summaryMessages(harness: Harness): readonly string[] {
  return [...harness.host.querySelectorAll<HTMLElement>('.sv-summary__message')].map(
    (element) => element.textContent?.trim() ?? '',
  );
}

function listedNames(harness: Harness): readonly string[] {
  return [
    ...harness.host.querySelectorAll<HTMLElement>(
      `#${questionWrapperId('q_evidence')} .sv-files__name`,
    ),
  ].map((element) => element.textContent?.trim() ?? '');
}

describe('SurveyPageComponent — attachments at submit (FR-027, US6 scenario 7)', () => {
  it('starts no submission when a held file no longer satisfies its question (FR-027)', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(subjectWith(STRICT), gateway);

    // 1 MB is inside the loose 5 MB it was accepted under, and outside the strict 500 KB
    // the opened survey now holds for the same question.
    await moveOnThenAttachAndSubmit(harness, [fileOf(BIG.name, BIG.mimeType, BIG.size)]);

    // The gateway was never called. This is the assertion FR-027 is for: a payload sent
    // and then regretted is not recoverable, so the re-check has to run before the call.
    expect(gateway.calls).toEqual([]);
    expect(harness.session.state().kind).toBe('validation-error');
  });

  it('blocks Next too, not only Submit, when the held file fails the current policy', async () => {
    const harness = await openViewer(subjectWith(STRICT), new AcknowledgingSurveyResponseGateway());

    // The other FR-027 gate. `validatePage` runs the re-check, so a file that fails it
    // cannot be carried forward one page either — the respondent is stopped where the
    // file is rather than two pages later.
    await harness.session.addFiles(looseEvidence(), [fileOf(BIG.name, BIG.mimeType, BIG.size)]);
    await harness.settle();
    expect(listedNames(harness)).toEqual([BIG.name]);

    await next(harness);

    expect(position(harness)).toContain('1');
    expect(errorFor(harness, 'q_evidence')).toBe(
      attachmentRejectionMessage('too-large', BIG.name, STRICT),
    );
  });

  it("renders the offending question's own page with the file named", async () => {
    const harness = await openViewer(subjectWith(STRICT), new AcknowledgingSurveyResponseGateway());
    await moveOnThenAttachAndSubmit(harness, [fileOf(BIG.name, BIG.mimeType, BIG.size)]);

    // Back on page 1, where the file is — not left on page 2, where Submit was pressed.
    expect(position(harness)).toContain('1');

    const expected = attachmentRejectionMessage('too-large', BIG.name, STRICT);
    expect(errorFor(harness, 'q_evidence')).toBe(expected);
    // Named, so the respondent knows which of up to three files to remove. A message that
    // only said "an attachment is invalid" would leave them guessing.
    expect(errorFor(harness, 'q_evidence')).toContain(BIG.name);
    // And listed in the summary as well, which is FR-030's second half.
    expect(summaryMessages(harness)).toEqual([expected]);
  });

  it('still lists the file, so the respondent can remove the one that was named', async () => {
    const harness = await openViewer(subjectWith(STRICT), new AcknowledgingSurveyResponseGateway());
    await moveOnThenAttachAndSubmit(harness, [
      fileOf(BIG.name, BIG.mimeType, BIG.size),
      fileOf(SMALL.name, SMALL.mimeType, SMALL.size),
    ]);

    // Both still held: the re-check blocks the submission, it does not discard files.
    // Discarding would lose the small one too, which was never at fault.
    expect(listedNames(harness)).toEqual([BIG.name, SMALL.name]);

    // Removing the named file clears the error and lets the submission through.
    await clickNth(harness, `#${questionWrapperId('q_evidence')} .sv-files__remove`, 0);
    expect(errorFor(harness, 'q_evidence')).toBeNull();
    expect(listedNames(harness)).toEqual([SMALL.name]);
  });

  it('passes the re-check when the held file satisfies the current policy', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(subjectWith(STRICT), gateway);

    // The negative control. Without it, a submission blocked for any reason at all would
    // satisfy the tests above. 2 KB is inside the strict 500 KB, so the re-check passes.
    await moveOnThenAttachAndSubmit(harness, [fileOf(SMALL.name, SMALL.mimeType, SMALL.size)]);

    expect(gateway.calls).toHaveLength(1);
    expect(harness.session.state().kind).toBe('submitted');
  });

  describe('research D16: a file with no text', () => {
    it('sends an entry carrying "" with the attachment, rather than dropping it', async () => {
      const gateway = new AcknowledgingSurveyResponseGateway();
      const harness = await openViewer(subjectWith(LOOSE), gateway);

      // A file and no typed text at all — the ordinary "here is my receipt" case.
      await harness.session.addFiles(looseEvidence(), [
        fileOf(SMALL.name, SMALL.mimeType, SMALL.size),
      ]);
      await harness.settle();
      await next(harness);
      await clickNth(harness, 'input[type="radio"]', 0);
      await next(harness);
      await harness.settle();

      expect(gateway.calls).toHaveLength(1);
      const entry = gateway.calls[0].answers.find((answer) => answer.questionId === 'q_evidence');

      // Present, not dropped. The value is the empty string rather than `null` or omitted,
      // because the contract fixes `value`'s shape by `type` and a `textarea` is a string.
      expect(entry).toBeDefined();
      expect(entry?.value).toBe('');
      expect(entry?.type).toBe('textarea');
      expect(entry?.attachments?.map((attachment) => attachment.name)).toEqual([SMALL.name]);
    });

    it('omits the entry entirely when there is neither text nor a file', async () => {
      const gateway = new AcknowledgingSurveyResponseGateway();
      const harness = await openViewer(subjectWith(LOOSE), gateway);

      // The other side of D16: an untouched optional question is not an empty answer, so
      // `""` must not appear for it. Both tests together say the attachment is what makes
      // the entry, not the empty string.
      await next(harness);
      await clickNth(harness, 'input[type="radio"]', 0);
      await next(harness);
      await harness.settle();

      expect(gateway.calls).toHaveLength(1);
      expect(
        gateway.calls[0].answers.find((answer) => answer.questionId === 'q_evidence'),
      ).toBeUndefined();
    });
  });
});
