/**
 * T120 — US3 scenario 11 and FR-065: a held file survives navigation, all the way to the
 * payload.
 *
 * This is the one attachment spec that has to run over the **whole viewer** rather than a
 * single question, because what it tests is what happens when the question is destroyed and
 * re-created. Page 3 leaves the DOM on Previous and comes back on Next, so the control that
 * renders the file list on the way back is a *different component instance* from the one
 * that accepted the file.
 *
 * That is exactly where a control rendering from `input.files` fails. A file input has no
 * settable `files`, so the new instance starts empty, and the respondent finds their
 * attachment gone with no error to explain it. Reading from `session.attachments()` is what
 * FR-065 is asking for, and a round trip is the only thing that distinguishes the two
 * implementations — every single-page assertion in `question-attachments.spec.ts` passes
 * either way.
 *
 * The payload assertion at the end is the second half. A list that re-renders correctly
 * while the bytes were dropped would satisfy everything on screen and still send a file
 * the receiver cannot read, so the spec follows the bytes across the boundary and checks
 * them against what was attached — not merely that two descriptors are present.
 */

import { describe, expect, it } from 'vitest';

import { formatFileSize } from '../../../core/models/display-format';
import type { AnswerEntry } from '../../../core/models/survey-response.model';
import { customerFeedbackSurvey } from '../../../core/models/__fixtures__/survey-builders';
import { AcknowledgingSurveyResponseGateway } from '../../../core/services/testing/failing-survey-response.gateway';
import { manifestEntry, mountViewer } from '../__fixtures__/survey-harness';
import type { ViewerHarness } from '../__fixtures__/survey-harness';
import { fileOf, selectFiles } from './__fixtures__/question-harness';
import { questionWrapperId } from './question-host';
import { SurveyPageComponent } from '../survey-page';

const SUBJECT = customerFeedbackSurvey();
const Q_EVIDENCE = SUBJECT.pages[2].questions[0];

/** The two files US3 scenario 11 names, with the sizes it names. */
const RECEIPT = { name: 'receipt.pdf', mimeType: 'application/pdf', size: 1_048_576 } as const;
const PHOTO = { name: 'photo.png', mimeType: 'image/png', size: 240_000 } as const;

type Harness = ViewerHarness<SurveyPageComponent>;

function evidenceScope(selector: string): string {
  return `#${questionWrapperId(Q_EVIDENCE.id)} ${selector}`;
}

async function openViewer(gateway: AcknowledgingSurveyResponseGateway): Promise<Harness> {
  return mountViewer(SurveyPageComponent, 'customer-feedback', {
    resolution: { outcome: 'found', entry: manifestEntry() },
    validation: { outcome: 'valid', survey: SUBJECT },
    gateway,
  });
}

// --- driving -------------------------------------------------------------------------

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

const next = (harness: Harness): Promise<void> => clickNth(harness, '.sv-nav__button--primary', 0);
const back = (harness: Harness): Promise<void> =>
  clickNth(harness, '.sv-nav__button--secondary', 0);

/** Answers pages 1 and 2 through their controls and stops on page 3. */
async function walkToEvidencePage(harness: Harness): Promise<void> {
  const name = harness.host.querySelector<HTMLInputElement>('input[type="text"]');
  if (name === null) {
    throw new Error('expected page 1 to render a text input');
  }
  name.value = 'Dana';
  name.dispatchEvent(new Event('input'));
  await harness.settle();
  await clickNth(harness, 'input[type="radio"]', 0);
  await next(harness);

  await clickNth(harness, '.sv-scale__point', 3); // satisfaction
  await clickNth(harness, 'input[type="checkbox"]', 0);
  await next(harness);
}

async function attachBoth(harness: Harness): Promise<void> {
  const input = harness.host.querySelector<HTMLInputElement>(evidenceScope('input[type="file"]'));
  if (input === null) {
    throw new Error('expected the evidence question to render a file control');
  }
  selectFiles(input, [
    fileOf(RECEIPT.name, RECEIPT.mimeType, RECEIPT.size),
    fileOf(PHOTO.name, PHOTO.mimeType, PHOTO.size),
  ]);
  await harness.settle();
}

// --- reading back ---------------------------------------------------------------------

function position(harness: Harness): string {
  return harness.host.querySelector('.sv-nav__position')?.textContent?.trim() ?? '';
}

function listedRows(harness: Harness): readonly { name: string; size: string }[] {
  return [...harness.host.querySelectorAll<HTMLElement>(evidenceScope('.sv-files__item'))].map(
    (item) => ({
      name: item.querySelector('.sv-files__name')?.textContent?.trim() ?? '',
      size: item.querySelector('.sv-files__size')?.textContent?.trim() ?? '',
    }),
  );
}

function counter(harness: Harness): string {
  return harness.host.querySelector(evidenceScope('.sv-files__counter'))?.textContent?.trim() ?? '';
}

function removeLabels(harness: Harness): readonly string[] {
  return [...harness.host.querySelectorAll(evidenceScope('.sv-files__remove'))].map(
    (button) => button.getAttribute('aria-label') ?? '',
  );
}

/** Base64 of `sizeBytes` copies of 7 — what `fileOf` writes. */
function expectedContent(sizeBytes: number): string {
  const bytes = new Uint8Array(sizeBytes).fill(7);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

const EXPECTED_ROWS = [
  { name: RECEIPT.name, size: formatFileSize(RECEIPT.size) },
  { name: PHOTO.name, size: formatFileSize(PHOTO.size) },
];

describe('QuestionAttachmentsComponent — survival across navigation (US3 scenario 11, FR-065)', () => {
  it('lists both files with the same names and sizes after a Previous/Next round trip', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    await walkToEvidencePage(harness);
    await attachBoth(harness);

    expect(position(harness)).toContain('3');
    expect(listedRows(harness)).toEqual(EXPECTED_ROWS);

    // Page 3 leaves the DOM here, so the control that renders the list below is a new
    // component instance over a new file input.
    await back(harness);
    expect(position(harness)).toContain('2');
    await next(harness);
    expect(position(harness)).toContain('3');

    expect(listedRows(harness)).toEqual(EXPECTED_ROWS);
    expect(counter(harness)).toBe('2 of 3 files');
    // Each row still offers a Remove naming its own file, so the list is interactive and
    // not a frozen read-out of what used to be there.
    expect(removeLabels(harness)).toEqual([`Remove ${RECEIPT.name}`, `Remove ${PHOTO.name}`]);
  });

  it('starts the round trip with an empty file input, which is why the session is the source', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    await walkToEvidencePage(harness);
    await attachBoth(harness);
    await back(harness);
    await next(harness);

    // The positive control for the test above. `input.files` is empty on the way back —
    // there is no API to repopulate it — so a list rendered from the input would show
    // nothing here. It showing both files is the proof that FR-065 is satisfied rather
    // than coincidentally passing.
    const input = harness.host.querySelector<HTMLInputElement>(evidenceScope('input[type="file"]'));
    expect(input?.files?.length ?? 0).toBe(0);
    expect(listedRows(harness)).toHaveLength(2);
  });

  it('still carries both files bytes in the submission payload after the round trip', async () => {
    const gateway = new AcknowledgingSurveyResponseGateway();
    const harness = await openViewer(gateway);
    await walkToEvidencePage(harness);
    await attachBoth(harness);
    await back(harness);
    await next(harness);

    // On to page 4, answer the required radio, then Submit.
    await next(harness);
    expect(position(harness)).toContain('4');
    await clickNth(harness, 'input[type="radio"]', 0);
    await next(harness);
    await harness.settle();

    expect(gateway.calls).toHaveLength(1);
    const entry: AnswerEntry | undefined = gateway.calls[0].answers.find(
      (answer) => answer.questionId === Q_EVIDENCE.id,
    );
    const sent = entry?.attachments;
    if (sent === undefined) {
      // Thrown rather than asserted, so the narrowing below is real: the two descriptor
      // reads that follow would otherwise each need their own `?.`, and an assertion
      // against `undefined?.content` passes vacuously.
      throw new Error('expected the payload to carry the evidence question attachments');
    }

    expect(sent.map((attachment) => attachment.name)).toEqual([RECEIPT.name, PHOTO.name]);

    // Contract §2: the decoded `content` length equals `sizeBytes`. Asserted as the actual
    // bytes rather than only as a length, because a descriptor carrying the right length of
    // the wrong content would pass a length check and still hand the receiver a corrupt
    // file. This is also what pins the payload builder's missing-id path: an id absent from
    // the encoded map must not reach here as empty content.
    expect(sent[0].sizeBytes).toBe(RECEIPT.size);
    expect(sent[0].mimeType).toBe(RECEIPT.mimeType);
    expect(sent[0].content).toBe(expectedContent(RECEIPT.size));
    expect(sent[1].sizeBytes).toBe(PHOTO.size);
    expect(sent[1].content).toBe(expectedContent(PHOTO.size));
    expect(atob(sent[1].content).length).toBe(PHOTO.size);
  });

  it('keeps a removal made after the round trip, rather than restoring the stale list', async () => {
    const harness = await openViewer(new AcknowledgingSurveyResponseGateway());
    await walkToEvidencePage(harness);
    await attachBoth(harness);
    await back(harness);
    await next(harness);

    await clickNth(harness, evidenceScope('.sv-files__remove'), 0);

    expect(listedRows(harness)).toEqual([{ name: PHOTO.name, size: formatFileSize(PHOTO.size) }]);
    expect(counter(harness)).toBe('1 of 3 files');

    // And the removal survives its own round trip, so the session is the single source in
    // both directions rather than only on the way back.
    await back(harness);
    await next(harness);
    expect(listedRows(harness)).toEqual([{ name: PHOTO.name, size: formatFileSize(PHOTO.size) }]);
  });
});
