/**
 * T032 — all ten FR-069 rows verbatim, the `option(s)` plural rule, the `FILENAME: REASON`
 * row with each of the six reasons, and all seven submission-failure texts verbatim from
 * `contracts/response-submission.md` §4.
 */

import {
  attachmentCounterMessage,
  attachmentErrorMessage,
  attachmentRejectionMessage,
  attachmentRemovedAnnouncement,
  attachmentAddedAnnouncement,
  emptyCatalogMessage,
  loadingAnnouncement,
  maxLengthMessage,
  maxSelectionsMessage,
  minLengthMessage,
  minSelectionsMessage,
  multiplePagesInvalidMessage,
  requiredRadioMessage,
  requiredTextMessage,
  scaleRangeMessage,
  selectionHintMessage,
  submissionFailureMessage,
  submittingAnnouncement,
  validationBlockedAnnouncement,
} from './messages';
import type { AttachmentRejectionReason } from '../models/answer.model';
import type { SubmissionFailureKind } from '../models/survey-response.model';
import {
  attachmentPolicy,
  checkboxQuestion,
  ratingQuestion,
  satisfactionQuestion,
  textareaQuestion,
  textboxQuestion,
} from '../models/__fixtures__/survey-builders';

describe('the ten FR-069 rows, verbatim', () => {
  it('row 1 — required radio unanswered', () => {
    expect(requiredRadioMessage()).toBe('Choose one option');
  });

  it('row 2 — required checkbox unanswered, at the effective minimum', () => {
    expect(minSelectionsMessage(checkboxQuestion({ required: true, minSelections: 0 }))).toBe(
      'Select at least 1 option',
    );
  });

  it('row 3 — required text empty', () => {
    expect(requiredTextMessage()).toBe('Enter an answer');
  });

  it('row 4 — required scale question, naming its inclusive range', () => {
    expect(scaleRangeMessage(satisfactionQuestion())).toBe('Choose a value between 1 and 5');
  });

  it('row 5 — minLength on a non-empty answer', () => {
    expect(minLengthMessage(textboxQuestion({ minLength: 2 }))).toBe('Use at least 2 characters');
  });

  it('row 6 — maxLength exceeded', () => {
    expect(maxLengthMessage(textboxQuestion({ maxLength: 80 }))).toBe('Use at most 80 characters');
  });

  it('row 7 — below minSelections', () => {
    expect(minSelectionsMessage(checkboxQuestion({ minSelections: 1 }))).toBe(
      'Select at least 1 option',
    );
  });

  it('row 8 — above maxSelections', () => {
    expect(maxSelectionsMessage(checkboxQuestion({ maxSelections: 3 }))).toBe(
      'Select no more than 3 options',
    );
  });

  it('row 9 — a rating out of range, on a non-default scale', () => {
    expect(scaleRangeMessage(ratingQuestion({ scale: { min: 0, max: 10 } }))).toBe(
      'Choose a value between 0 and 10',
    );
  });

  it('row 10 — an attachment invalid at submit, as FILENAME: REASON', () => {
    expect(attachmentErrorMessage('receipt.pdf', 'this file is empty')).toBe(
      'receipt.pdf: this file is empty',
    );
  });
});

describe('option(s) plural rule (FR-069)', () => {
  it('is singular at N = 1', () => {
    expect(minSelectionsMessage(checkboxQuestion({ minSelections: 1 }))).toBe(
      'Select at least 1 option',
    );
  });

  it('is plural at N = 2', () => {
    expect(minSelectionsMessage(checkboxQuestion({ minSelections: 2 }))).toBe(
      'Select at least 2 options',
    );
  });

  it('is plural at N = 0, which an optional checkbox can reach', () => {
    expect(minSelectionsMessage(checkboxQuestion({ minSelections: 0 }))).toBe(
      'Select at least 0 options',
    );
  });
});

describe('no message names the question it belongs to (FR-069)', () => {
  it.each([
    requiredRadioMessage(),
    requiredTextMessage(),
    minSelectionsMessage(checkboxQuestion({ title: 'What did you like?', minSelections: 1 })),
    maxSelectionsMessage(checkboxQuestion({ title: 'What did you like?', maxSelections: 3 })),
    minLengthMessage(textboxQuestion({ title: 'What should we call you?', minLength: 2 })),
    maxLengthMessage(textareaQuestion({ title: 'Anything else?', maxLength: 80 })),
    scaleRangeMessage(satisfactionQuestion({ title: 'How satisfied were you?' })),
  ])('%s carries no question title', (message) => {
    // Association is FR-054's job. One wording has to serve every survey, so a title
    // leaking into a message would be a defect even though it reads better.
    expect(message).not.toMatch(/call you|like\?|satisfied|Anything/);
  });
});

describe('the six attachment rejection texts (US3 scenarios 2-7)', () => {
  const policy = attachmentPolicy();

  it('unaccepted-type names the file and the allowed labels (US3 scenario 2)', () => {
    expect(attachmentRejectionMessage('unaccepted-type', 'notes.txt', policy)).toBe(
      'notes.txt: this file type is not accepted (allowed: PNG, JPEG, PDF)',
    );
  });

  it('too-large names the file and the limit in FR-071 units (US3 scenario 3)', () => {
    expect(attachmentRejectionMessage('too-large', 'scan.png', policy)).toBe(
      'scan.png: this file is larger than the 5 MB limit',
    );
  });

  it('empty names the file (US3 scenario 7)', () => {
    expect(attachmentRejectionMessage('empty', 'empty.png', policy)).toBe(
      'empty.png: this file is empty',
    );
  });

  it('duplicate reads as a sentence about the file (US3 scenario 6)', () => {
    expect(attachmentRejectionMessage('duplicate', 'a.png', policy)).toBe(
      'a.png is already attached',
    );
  });

  it('no-free-slot is about the question, so it names no file (US3 scenario 5)', () => {
    expect(attachmentRejectionMessage('no-free-slot', 'd.png', policy)).toBe(
      'You can attach up to 3 files to this question',
    );
  });

  it('unreadable carries the one string the spec does not supply (plan §10 item 2)', () => {
    // Flagged for the Product Owner: D17 adds the rejection class, the spec supplies no
    // wording, and `plan.md` §10 item 2 hands the choice to this layer.
    expect(attachmentRejectionMessage('unreadable', 'broken.png', policy)).toBe(
      'broken.png: this file could not be read',
    );
  });

  it('covers all six reasons, so a seventh cannot be added without a test', () => {
    const reasons: readonly AttachmentRejectionReason[] = [
      'unaccepted-type',
      'too-large',
      'empty',
      'duplicate',
      'no-free-slot',
      'unreadable',
    ];
    expect(
      reasons.every(
        (reason) => attachmentRejectionMessage(reason, 'f.png', policy).trim().length > 0,
      ),
    ).toBe(true);
  });
});

describe('the seven submission failure texts, verbatim from contract §4', () => {
  it.each([
    ['transport-error', 'We could not reach the server. Your answers are safe — try again.'],
    ['timeout', 'The submission timed out. Your answers are safe — try again.'],
    ['rejected', 'The server could not accept this response'],
    ['not-found', 'This survey is no longer accepting responses.'],
    [
      'unauthorized',
      'This survey is not accepting responses right now. Your answers are safe — try again.',
    ],
    ['server-error', 'Something went wrong at our end. Your answers are safe — try again.'],
    [
      'malformed-response',
      'We could not confirm your submission. Your answers are safe — try again.',
    ],
  ] as readonly (readonly [SubmissionFailureKind, string])[])('%s reads %s', (kind, expected) => {
    expect(submissionFailureMessage(kind)).toBe(expected);
  });

  it('throws rather than inventing a message for an unknown kind', () => {
    const unknown = 'quota-exceeded' as unknown as SubmissionFailureKind;
    expect(() => submissionFailureMessage(unknown)).toThrow(/Unhandled discriminant/);
  });
});

describe('the counter, the hint and the announcements', () => {
  it('renders FR-025 counter as N of M files', () => {
    expect(attachmentCounterMessage(2, 3)).toBe('2 of 3 files');
    expect(attachmentCounterMessage(0, 3)).toBe('0 of 3 files');
  });

  it('renders the US2 scenario 5 hint', () => {
    expect(selectionHintMessage(checkboxQuestion({ maxSelections: 3 }))).toBe(
      'Select up to 3 options',
    );
  });

  it('announces an add and a remove by file name (FR-026)', () => {
    expect(attachmentAddedAnnouncement('receipt.pdf')).toBe('receipt.pdf attached');
    expect(attachmentRemovedAnnouncement('receipt.pdf')).toBe('receipt.pdf removed');
  });

  it('announces a blocked Next with the count of answers to fix (FR-030)', () => {
    expect(validationBlockedAnnouncement(1)).toBe('There is 1 answer to fix on this page');
    expect(validationBlockedAnnouncement(2)).toBe('There are 2 answers to fix on this page');
  });

  it('states the FR-034 multi-page case', () => {
    expect(multiplePagesInvalidMessage()).toBe('There are answers to fix on more than one page.');
  });

  it('states the empty catalog plainly, with no error wording (FR-048)', () => {
    expect(emptyCatalogMessage()).toBe('No surveys are available.');
    expect(emptyCatalogMessage().toLowerCase()).not.toContain('error');
  });

  it('announces loading and submitting politely', () => {
    expect(loadingAnnouncement()).toBe('Loading');
    expect(submittingAnnouncement()).toBe('Submitting your response');
  });
});
