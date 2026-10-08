/**
 * Every respondent-facing string this feature produces — T022.
 *
 * Three catalogues live here and nowhere else:
 *
 * 1. the ten FR-069 validation rows, verbatim;
 * 2. the six `AttachmentRejectionReason` texts (US3 scenarios 2–7);
 * 3. the seven `SubmissionFailureKind` texts, verbatim from
 *    `contracts/response-submission.md` §4.
 *
 * No message names the question it belongs to: association is FR-054's job, which is what
 * lets one wording serve every survey. No survey config can supply wording (FR-069).
 */

import { assertNever } from '../models/assert-never';
import { formatAcceptedTypes, formatFileSize } from '../models/display-format';
import { effectiveMinSelections, scaleOf } from '../models/survey.model';
import type {
  AttachmentPolicy,
  CheckboxQuestion,
  ScaleQuestion,
  TextQuestion,
} from '../models/survey.model';
import type { AttachmentRejectionReason } from '../models/answer.model';
import type { SubmissionFailureKind } from '../models/survey-response.model';

/** FR-069: `option(s)` is singular at `N === 1` and plural otherwise. */
function options(count: number): string {
  return count === 1 ? 'option' : 'options';
}

// --- 1. the ten FR-069 rows ---------------------------------------------------------

/** Required `radio` unanswered. */
export function requiredRadioMessage(): string {
  return 'Choose one option';
}

/** Required `checkbox` unanswered, and the `minSelections` row — the same wording. */
export function minSelectionsMessage(question: CheckboxQuestion): string {
  const minimum = effectiveMinSelections(question);
  return `Select at least ${minimum} ${options(minimum)}`;
}

/** Required `textbox`/`textarea` empty. */
export function requiredTextMessage(): string {
  return 'Enter an answer';
}

/** Required `rating`/`satisfaction`, and the out-of-range row — the same wording. */
export function scaleRangeMessage(question: ScaleQuestion): string {
  const { min, max } = scaleOf(question);
  return `Choose a value between ${min} and ${max}`;
}

/** `minLength` on a non-empty answer. */
export function minLengthMessage(question: TextQuestion): string {
  return `Use at least ${question.minLength} characters`;
}

/** `maxLength` exceeded. */
export function maxLengthMessage(question: TextQuestion): string {
  return `Use at most ${question.maxLength} characters`;
}

/** Above `maxSelections` (FR-070). Always plural: `maxSelections` is at least 1. */
export function maxSelectionsMessage(question: CheckboxQuestion): string {
  return `Select no more than ${question.maxSelections} options`;
}

/** The FR-069 `FILENAME: REASON` row, used for an attachment invalid at submit. */
export function attachmentErrorMessage(fileName: string, reason: string): string {
  return `${fileName}: ${reason}`;
}

// --- 2. the six attachment-rejection texts ------------------------------------------

/**
 * The four rejection classes whose text reads as the reason half of `FILENAME: REASON`.
 * `duplicate` and `no-free-slot` are not here because US3 scenarios 5 and 6 fix their
 * wording as whole sentences rather than reason clauses.
 */
type PrefixedRejectionReason = Exclude<AttachmentRejectionReason, 'duplicate' | 'no-free-slot'>;

/**
 * The reason half of `FILENAME: REASON`.
 *
 * `unreadable` is the one string the spec does not supply: D17 adds the rejection class
 * and `plan.md` §10 item 2 hands the wording to this layer. **Flag it in review.**
 */
function rejectionReason(reason: PrefixedRejectionReason, policy: AttachmentPolicy): string {
  switch (reason) {
    case 'unaccepted-type':
      return `this file type is not accepted (allowed: ${formatAcceptedTypes(policy.acceptedTypes)})`;
    case 'too-large':
      return `this file is larger than the ${formatFileSize(policy.maxSizeBytes)} limit`;
    case 'empty':
      return 'this file is empty';
    case 'unreadable':
      return 'this file could not be read';
  }
  return assertNever(reason);
}

/** The whole respondent-facing text for one rejected file (FR-024). */
export function attachmentRejectionMessage(
  reason: AttachmentRejectionReason,
  fileName: string,
  policy: AttachmentPolicy,
): string {
  switch (reason) {
    case 'duplicate':
      // US3 scenario 6: "a.png is already attached" — a sentence, not a reason clause.
      return `${fileName} is already attached`;
    case 'no-free-slot':
      // US3 scenario 5: the message is about the question, so it names no file.
      return `You can attach up to ${policy.maxFiles} files to this question`;
    case 'unaccepted-type':
    case 'too-large':
    case 'empty':
    case 'unreadable':
      return attachmentErrorMessage(fileName, rejectionReason(reason, policy));
  }
  return assertNever(reason);
}

/** FR-025's counter, e.g. `2 of 3 files`. */
export function attachmentCounterMessage(held: number, maxFiles: number): string {
  return `${held} of ${maxFiles} files`;
}

/** The `maxSelections` hint rendered beside a checkbox group (US2 scenario 5). */
export function selectionHintMessage(question: CheckboxQuestion): string {
  return `Select up to ${question.maxSelections} options`;
}

/** FR-026: removing an attachment is announced politely. */
export function attachmentRemovedAnnouncement(fileName: string): string {
  return `${fileName} removed`;
}

/** FR-026: an accepted file is announced politely. */
export function attachmentAddedAnnouncement(fileName: string): string {
  return `${fileName} attached`;
}

// --- 3. the seven submission-failure texts ------------------------------------------

/** `contracts/response-submission.md` §4, verbatim. */
export function submissionFailureMessage(kind: SubmissionFailureKind): string {
  switch (kind) {
    case 'transport-error':
      return 'We could not reach the server. Your answers are safe — try again.';
    case 'timeout':
      return 'The submission timed out. Your answers are safe — try again.';
    case 'rejected':
      return 'The server could not accept this response';
    case 'not-found':
      return 'This survey is no longer accepting responses.';
    case 'unauthorized':
      return 'This survey is not accepting responses right now. Your answers are safe — try again.';
    case 'server-error':
      return 'Something went wrong at our end. Your answers are safe — try again.';
    case 'malformed-response':
      return 'We could not confirm your submission. Your answers are safe — try again.';
  }
  return assertNever(kind);
}

// --- announcements and screen copy ---------------------------------------------------

/** FR-030: what the assertive region says when Next or Submit is blocked. */
export function validationBlockedAnnouncement(errorCount: number): string {
  return errorCount === 1
    ? 'There is 1 answer to fix on this page'
    : `There are ${errorCount} answers to fix on this page`;
}

/** FR-034: the summary line when more than one page is invalid. */
export function multiplePagesInvalidMessage(): string {
  return 'There are answers to fix on more than one page.';
}

/** FR-048: the empty catalog is a plain statement, not an error. */
export function emptyCatalogMessage(): string {
  return 'No surveys are available.';
}

/** FR-039: announced politely while a submission is in flight. */
export function submittingAnnouncement(): string {
  return 'Submitting your response';
}

/** Announced politely while either fetch is in flight (US4 scenario 10). */
export function loadingAnnouncement(): string {
  return 'Loading';
}
