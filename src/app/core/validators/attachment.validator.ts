/**
 * Attachment selection rules — T026, implementing FR-023's five checks **in order**.
 *
 * The order matters and is the contract's, not a convenience: the first failing check
 * determines the message (FR-023).
 *
 * 1. accepted type — taken **only** from this question's `acceptedTypes`, never from a
 *    viewer-wide list (FR-028);
 * 2. size within `maxSizeBytes`;
 * 3. non-zero size;
 * 4. not already attached, by name **and** size, against what is already held;
 * 5. a free slot within `maxFiles`.
 *
 * Files are taken in selection order until `maxFiles` is reached; each remaining file is
 * rejected with the count message. A mixed selection still attaches its valid files
 * (FR-024), and zero files always passes — attachments are never required (FR-022).
 *
 * **Deviation from `data-model.md` §6, flagged for the Solution Architect.** §6 types
 * `AttachmentSelectionResult.accepted` as `readonly SessionAttachment[]`, but a
 * `SessionAttachment` carries an `AttachmentId` from `IdFactoryService` and bytes from
 * `AttachmentCodecService`, both of which are effectful — and T026 requires this function
 * to be pure. `accepted` therefore holds `AttachmentCandidate`, and
 * `SurveySessionService.addFiles` is what mints the id and reads the bytes immediately
 * afterwards (research D6, D17). The two readings cannot both hold; this is the only one
 * that keeps the validator pure.
 */

import type {
  AttachmentCandidate,
  AttachmentRejection,
  AttachmentRejectionReason,
  AttachmentSelectionResult,
  SessionAttachment,
} from '../models/answer.model';
import type { QuestionId } from '../models/branded';
import type { AcceptedFileType, AttachmentPolicy, Question } from '../models/survey.model';
import type { ValidationError } from '../models/validation.model';
import { attachmentRejectionMessage } from './messages';

/**
 * Contract §3: a file is of an accepted type when its reported MIME type is listed, or its
 * lowercased file extension is listed. Nothing else makes a type acceptable — in
 * particular not the operating system having offered the file (FR-028).
 */
export function isAcceptedType(
  file: Pick<AttachmentCandidate, 'name' | 'mimeType'>,
  acceptedTypes: readonly AcceptedFileType[],
): boolean {
  const mimeType = file.mimeType.toLowerCase();
  const dot = file.name.lastIndexOf('.');
  const extension = dot === -1 ? null : file.name.slice(dot).toLowerCase();
  return acceptedTypes.some((accepted) => accepted === mimeType || accepted === extension);
}

function reject(
  questionId: QuestionId,
  file: AttachmentCandidate,
  reason: AttachmentRejectionReason,
  policy: AttachmentPolicy,
): AttachmentRejection {
  return {
    questionId,
    fileName: file.name,
    reason,
    message: attachmentRejectionMessage(reason, file.name, policy),
  };
}

/**
 * The first FR-023 check a file fails, or `null` when it passes all five.
 *
 * `held` is everything already attached **plus** everything accepted earlier in this same
 * selection, which is what makes the duplicate and free-slot checks see the selection as
 * the respondent does.
 */
function firstFailure(
  file: AttachmentCandidate,
  policy: AttachmentPolicy,
  held: readonly AttachmentCandidate[],
): AttachmentRejectionReason | null {
  if (!isAcceptedType(file, policy.acceptedTypes)) {
    return 'unaccepted-type';
  }
  if (file.sizeBytes > policy.maxSizeBytes) {
    return 'too-large';
  }
  if (file.sizeBytes === 0) {
    return 'empty';
  }
  if (held.some((other) => other.name === file.name && other.sizeBytes === file.sizeBytes)) {
    return 'duplicate';
  }
  if (held.length >= policy.maxFiles) {
    return 'no-free-slot';
  }
  return null;
}

/**
 * Runs FR-023's five checks over one multi-file selection.
 *
 * `existing` is what the question already holds. Zero candidates always yields an empty
 * result: attachments are never required (FR-022).
 */
export function validateAttachmentSelection(
  questionId: QuestionId,
  policy: AttachmentPolicy,
  existing: readonly SessionAttachment[],
  candidates: readonly AttachmentCandidate[],
): AttachmentSelectionResult {
  const accepted: AttachmentCandidate[] = [];
  const rejected: AttachmentRejection[] = [];
  const held: AttachmentCandidate[] = existing.map((attachment) => ({
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  }));

  for (const candidate of candidates) {
    const failure = firstFailure(candidate, policy, held);
    if (failure === null) {
      accepted.push(candidate);
      held.push(candidate);
      continue;
    }
    rejected.push(reject(questionId, candidate, failure, policy));
  }

  return { accepted, rejected };
}

/**
 * The FR-027 re-check: everything one question already holds, against that question's
 * **current** policy. Returns the first `attachment-invalid` error, or `null`.
 *
 * This runs at Next and at Submit through `validatePage`, so a file that was accepted
 * under an earlier policy — or that is held by a question whose `attachments` block has
 * since gone away — blocks navigation rather than reaching the payload. That is the
 * fail-closed half of FR-027: the selection-time checks alone would fail open.
 *
 * The count half is included here, unlike in `firstFailure`, because at re-check time the
 * set is already complete: there is no "accept until the slots run out" ordering to apply.
 */
export function attachmentErrorsFor(
  question: Question,
  existing: readonly SessionAttachment[],
): ValidationError | null {
  if (existing.length === 0) {
    // FR-022: attachments are never required, so holding none always passes.
    return null;
  }

  const policy = question.attachments;
  if (policy === null) {
    // The question no longer accepts files at all. Every held file is over the limit of
    // zero, so the count message is the honest one; `maxFiles: 0` is not representable on
    // `AttachmentPolicy`, hence the literal rather than a policy lookup.
    return attachmentError(question.id, 'You can attach up to 0 files to this question');
  }

  for (const attachment of existing) {
    const reason = firstFailure(attachment, policy, []);
    if (reason !== null) {
      return attachmentError(
        question.id,
        attachmentRejectionMessage(reason, attachment.name, policy),
      );
    }
  }

  if (existing.length > policy.maxFiles) {
    return attachmentError(question.id, attachmentRejectionMessage('no-free-slot', '', policy));
  }

  return null;
}

function attachmentError(questionId: QuestionId, message: string): ValidationError {
  return { questionId, rule: 'attachment-invalid', message };
}
